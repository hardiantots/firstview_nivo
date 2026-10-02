// Offline PostgreSQL/RLS verification. No network, real accounts, or production credentials.
// PGLITE_MODULE=<absolute @electric-sql/pglite path> node --test supabase/tests/schema.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const schema = fs.readFileSync(path.join(__dirname, '../migrations/20261002_sdd_features.sql'), 'utf8');
const resetApp = fs.readFileSync(path.join(__dirname, '../reset-nivo.sql'), 'utf8');
const resetAccounts = fs.readFileSync(path.join(__dirname, '../reset-nivo-with-accounts.sql'), 'utf8');
const preflight = fs.readFileSync(path.join(__dirname, '../production-preflight.sql'), 'utf8');
const stagingRls = fs.readFileSync(path.join(__dirname, './rls-staging.sql'), 'utf8');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';
const op = '44444444-4444-4444-8444-444444444444';
const offsetDay = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0, 10);

test('NIVO schema, owner RLS, RPCs and scoped resets in isolated PostgreSQL', async t => {
  const db = new PGlite();
  const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
  const scalar = async (sql, params = []) => Object.values(await one(sql, params))[0];
  const admin = async () => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub','',false)"); };
  const user = async id => { await admin(); await db.exec('set role authenticated'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); };
  const rpc = (name, sqlArgs, values) => scalar(`select public.${name}(${sqlArgs})`, values);
  let today, doc, buddyLink, revision;
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth; grant usage on schema auth to anon,authenticated,service_role;
      create table auth.users(id uuid primary key,email text);
      create table auth.identities(user_id uuid references auth.users(id) on delete cascade);
      create table auth.sessions(user_id uuid references auth.users(id) on delete cascade);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create schema storage; create table storage.untouched_files(id text primary key);
      insert into storage.untouched_files values('existing-logo');
      create table public.unrelated_records(id integer primary key);
      insert into public.unrelated_records values(7);
    `);

    await t.test('fresh schema and repeat additive run preserve data', async () => {
      await db.exec(schema);
      await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)', [A,'a@example.invalid',B,'b@example.invalid',C,'c@example.invalid']);
      await db.query('insert into auth.identities(user_id) values($1)', [A]);
      await db.query('insert into auth.sessions(user_id) values($1)', [A]);
      today = await scalar("select ((now() at time zone 'Asia/Makassar')::date)::text");
      const baseline = (id, cigarettes, price) => ({id,effectiveFrom:offsetDay(today,-10),cigarettesPerDay:cigarettes,pricePerCigarette:price,createdAt:new Date().toISOString()});
      const record = (day, count, initial) => ({date:day,status:count===null?'unreported':'reported',count,baseline:initial,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      doc = await rpc('nivo_empty_journey','',[]);
      const yesterday = offsetDay(today,-1), before = offsetDay(today,-2);
      doc.daily = {[today]:record(today,0,baseline('original',10,1000)),[yesterday]:record(yesterday,4,baseline('older',20,2000)),[before]:record(before,0,null),[offsetDay(today,-3)]:record(offsetDay(today,-3),null,null)};
      doc.baselines = [baseline('latest',40,3000)];
      doc.cravingEvents = [
        {id:'smoked-today',occurredAt:new Date(Date.now()-30000).toISOString(),intensity:8,trigger:'kopi',outcome:'smoked',durationSec:120,note:'private'},
        {id:'passed-before',occurredAt:before+'T23:30:00+08:00',intensity:3,trigger:'Kopi',outcome:'passed',durationSec:180,note:''},
        {id:'ongoing-yesterday',occurredAt:yesterday+'T01:30:00+08:00',intensity:6,trigger:'stress',outcome:'ongoing',durationSec:60,note:''},
      ];
      doc.checkins = [{id:'legacy-checkin',occurredAt:before+'T23:30:00+08:00',intensity:3,trigger:'kopi',context:'private legacy'}];
      doc.slips = [
        {id:'linked-slip',cravingEventId:'smoked-today',occurredAt:doc.cravingEvents[0].occurredAt,count:1,trigger:'kopi',nextStep:'private'},
        {id:'unlinked-slip',occurredAt:yesterday+'T02:00:00+08:00',count:1,trigger:'stress',nextStep:'private'},
      ];
      doc.ownReason='alasan pribadi';doc.motivations=['kesehatan'];
      await db.query('insert into public.nivo_journeys(user_id,revision,document) values($1,2,$2)',[A,doc]);
      const other = await rpc('nivo_empty_journey','',[]);
      other.daily = {[today]:record(today,199,baseline('other',200,1))};
      await db.query('insert into public.nivo_journeys(user_id,revision,document) values($1,1,$2)',[B,other]);
      await db.exec(schema);
      assert.equal(await scalar('select count(*)::int from public.nivo_journeys'),2);
      assert.equal(await scalar('select count(*)::int from public.lessons'),3);
      assert.equal(await scalar("select count(*)::int from public.lessons where id='small-value'"),1);
      revision=2;
    });

    await t.test('additive upgrade recreates original SDD two-column analytics without data loss', async () => {
      await db.exec("drop function public.daily_series(integer,text); create function public.daily_series(p_days integer default 7,p_tz text default 'Asia/Makassar') returns table(day date,cigarettes integer) language sql stable as $$ select current_date,0 $$;");
      await db.exec(schema);
      assert.equal(await scalar('select count(*)::int from public.nivo_journeys'),2);
      assert.deepEqual(await scalar('select document from public.nivo_journeys where user_id=$1',[A]),doc);
      await user(A);
      const row=(await db.query("select * from public.daily_series(1,'Asia/Makassar')")).rows[0];
      assert.deepEqual(Object.keys(row).sort(),['baseline_cigs_per_day','cigarettes','day','price_per_cigarette']);
      await admin();
    });

    await t.test('legacy motivations backfill preserves explicit clears, unresolved choices and other data', async () => {
      const old=await rpc('nivo_empty_journey','',[]);delete old.motivations;
      old.ownReason='existing own reason';old.daily={[today]:{date:today,status:'reported',count:7,baseline:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}};
      await db.query('insert into public.nivo_journeys(user_id,revision,document) values($1,10,$2)',[C,old]);
      const beforeB=await one('select revision,document from public.nivo_journeys where user_id=$1',[B]);
      await db.query("insert into public.user_profile(user_id,motivations) values($1,array[' keluarga ',' kesehatan ']),($2,array['legacy reason'])",[C,B]);
      await db.exec(schema);
      const copied=await one('select revision,document from public.nivo_journeys where user_id=$1',[C]);
      assert.equal(copied.revision,11);assert.deepEqual(copied.document,{...old,motivations:['keluarga','kesehatan']});
      assert.deepEqual(copied.document.history,old.history);
      assert.deepEqual(await one('select revision,document from public.nivo_journeys where user_id=$1',[B]),beforeB);
      assert.deepEqual(await scalar('select motivations from public.user_profile where user_id=$1',[C]),[' keluarga ',' kesehatan ']);
      await db.exec(schema);
      assert.deepEqual(await one('select revision,document from public.nivo_journeys where user_id=$1',[C]),copied);
      await db.query('update public.nivo_journeys set revision=20,document=$2 where user_id=$1',[C,old]);
      await db.query("update public.user_profile set motivations=array['one','two','three'] where user_id=$1",[C]);
      await db.exec(schema);
      assert.deepEqual(await one('select revision,document from public.nivo_journeys where user_id=$1',[C]),{revision:20,document:old});
      assert.deepEqual(await scalar('select motivations from public.user_profile where user_id=$1',[C]),['one','two','three']);
      for(const invalid of ["array[' ','valid']","array[null,'valid']","array[repeat('x',201)]"]){
        await db.query(`update public.user_profile set motivations=${invalid} where user_id=$1`,[C]);
        await db.exec(schema);
        assert.deepEqual(await one('select revision,document from public.nivo_journeys where user_id=$1',[C]),{revision:20,document:old});
      }
      await db.query('delete from public.nivo_journeys where user_id=$1',[C]);
      await db.query('delete from public.user_profile where user_id in($1,$2)',[C,B]);
    });

    await t.test('read-only preflight and real-staging rollback harness execute successfully', async () => {
      assert.ok(Number(await scalar("select current_setting('server_version_num')"))>=150000);
      await db.exec(preflight);
      await db.exec(stagingRls.replaceAll('00000000-0000-4000-8000-000000000001',A).replaceAll('00000000-0000-4000-8000-000000000002',B));
      assert.equal(await scalar('select revision from public.nivo_journeys where user_id=$1',[A]),2);
      assert.deepEqual(await scalar('select document from public.nivo_journeys where user_id=$1',[A]),doc);
    });

    await t.test('owner views isolate A/B and protect server-only data and mutations', async () => {
      await user(A);
      assert.equal(await scalar('select count(*)::int from public.daily_logs'),4);
      assert.equal(await scalar('select count(*)::int from public.daily_logs where user_id=$1',[B]),0);
      assert.equal(await scalar('select count(*)::int from public.craving_events'),5);
      assert.equal(await scalar("select outcome from public.craving_events where source='checkin'"),null);
      assert.equal(await scalar("select intensity from public.craving_events where source='checkin'"),6);
      assert.equal(await scalar("select count(*)::int from public.craving_events where source='slip'"),1);
      await assert.rejects(db.query('update public.nivo_journeys set revision=0 where user_id=$1',[B]),e=>e.code==='42501');
      await assert.rejects(db.query('select * from public.push_subscriptions'),e=>e.code==='42501');
      await assert.rejects(db.query('select public.nivo_claim_push(100)'),e=>e.code==='42501');
      await user(B);
      assert.equal(await scalar('select cigarettes from public.daily_logs'),199);
      assert.equal(await scalar('select count(*)::int from public.nivo_journeys'),1);
      await admin();await db.exec('set role anon');
      await assert.rejects(db.query('select * from public.daily_logs'),e=>e.code==='42501');
      await admin();
    });

    await t.test('series missing versus zero, timezone, historical baseline and honest outcomes', async () => {
      await user(A);
      const series = (await db.query("select * from public.daily_series(7,'Asia/Makassar')")).rows;
      assert.equal(series.length,7);
      assert.equal(series.filter(d=>d.cigarettes===null).length,4);
      assert.equal(series.at(-1).cigarettes,0);
      assert.equal(Number(series.at(-1).baseline_cigs_per_day),10);
      assert.equal(Number(series.at(-2).price_per_cigarette),2000);
      const summary = await one("select * from public.journey_summary('Asia/Makassar')");
      assert.equal(summary.days_logged,3);assert.equal(summary.days_logged_7,3);
      assert.equal(summary.estimate_days,2);assert.equal(Number(summary.avoided),26);assert.equal(Number(summary.saved),42000);
      assert.equal(summary.smoke_free_days,1);assert.equal(summary.current_smoke_free_days,0);
      assert.equal(summary.craving_total,5);assert.equal(summary.craving_passed,1);assert.equal(summary.craving_outcome_known,4);
      assert.equal((await one("select * from public.craving_by_hour(30,'Asia/Makassar') where hour=23")).passed,1);
      assert.equal((await one("select * from public.craving_by_hour(30,'UTC') where hour=15")).passed,1);
      const triggers=(await db.query('select * from public.craving_by_trigger(30)')).rows;
      assert.equal(triggers.find(x=>x.trigger==='kopi').total,3);
      await assert.rejects(db.query("select * from public.daily_series(367,'UTC')"),e=>e.code==='22023');
      await assert.rejects(db.query("select * from public.daily_series(7,'No/Such_Zone')"),e=>e.code==='22023');
      await admin();
    });

    await t.test('commit replay, reused ids and stale revisions', async () => {
      const action={type:'daily',date:today,count:0};
      const first=await rpc('nivo_commit_journey','$1,$2,$3,$4,$5',[A,op,2,action,doc]);
      assert.equal(first.revision,3);revision=3;
      const replay=await rpc('nivo_commit_journey','$1,$2,$3,$4,$5',[A,op,2,action,doc]);
      assert.equal(replay.replayed,true);assert.equal(replay.revision,3);
      assert.equal((await rpc('nivo_commit_journey','$1,$2,$3,$4,$5',[A,op,3,{type:'daily',date:today,count:1},doc])).error,'id_reused');
      assert.equal((await rpc('nivo_commit_journey','$1,$2,$3,$4,$5',[A,C,1,action,doc])).error,'conflict');
    });

    await t.test('profile and journey atomic conflict, preserving versioned history', async () => {
      assert.equal((await rpc('nivo_update_profile','$1,$2,$3,$4,$5',[A,{full_name:'must not persist',motivations:['keluarga']},2,'baru','Asia/Jakarta'])).error,'conflict');
      assert.equal(await scalar('select count(*)::int from public.user_profile where user_id=$1',[A]),0);
      const input={full_name:'Sintetis',motivations:['keluarga','kesehatan']};
      const saved=await rpc('nivo_update_profile','$1,$2,$3,$4,$5',[A,input,3,'keluarga','Asia/Jakarta']);
      assert.equal(saved.success,true);assert.equal(saved.revision,4);revision=4;
      assert.equal(saved.state.ownReason,'keluarga');assert.equal(saved.state.timezone,'Asia/Jakarta');
      assert.deepEqual(saved.state.motivations,input.motivations);assert.deepEqual(saved.state.daily,doc.daily);
      const repeated=await rpc('nivo_update_profile','$1,$2,$3,$4,$5',[A,input,4,'keluarga','Asia/Jakarta']);
      assert.equal(repeated.revision,4);
      const cleared=await rpc('nivo_update_profile','$1,$2,$3,$4,$5',[A,{},4,'',null]);
      assert.equal(cleared.state.ownReason,'');assert.equal(cleared.revision,5);revision=5;
      assert.equal((await rpc('nivo_update_profile','$1,$2,$3,$4,$5',[A,{full_name:'Nama baru'},null,null,null])).revision,5);
      assert.equal(await scalar('select email from public.user_profile where user_id=$1',[A]),'a@example.invalid');
      await assert.rejects(rpc('nivo_update_profile','$1,$2,$3,$4,$5',[A,{},5,'x'.repeat(301),null]),/invalid_profile/);
    });

    await t.test('buddy dual opt-in, selected metrics only, invite rotation and revocation', async () => {
      const first=await rpc('nivo_create_buddy_invite','$1,$2,$3',[A,'a'.repeat(64),['total_smoke_free_days','days_logged_7']]);
      const current=await rpc('nivo_create_buddy_invite','$1,$2,$3',[A,'b'.repeat(64),['total_smoke_free_days','days_logged_7']]);
      assert.notEqual(first.id,current.id);
      assert.equal((await rpc('nivo_accept_buddy','$1,$2',['a'.repeat(64),B])).error,'unavailable');
      assert.equal((await rpc('nivo_accept_buddy','$1,$2',['b'.repeat(64),A])).error,'unavailable');
      buddyLink=(await rpc('nivo_accept_buddy','$1,$2',['b'.repeat(64),B])).link_id;
      assert.ok(buddyLink);assert.equal((await rpc('nivo_accept_buddy','$1,$2',['b'.repeat(64),B])).link_id,buddyLink);
      assert.equal((await rpc('nivo_accept_buddy','$1,$2',['b'.repeat(64),C])).error,'unavailable');
      const summary=await rpc('nivo_buddy_summary','$1,$2',[buddyLink,B]);
      assert.deepEqual(Object.keys(summary).sort(),['days_logged_7','total_smoke_free_days']);
      assert.equal(summary.total_smoke_free_days,1);
      assert.equal(await rpc('nivo_buddy_summary','$1,$2',[buddyLink,C]),null);
      assert.equal((await rpc('nivo_create_buddy_invite','$1,$2,$3',[A,'c'.repeat(64),['days_logged_7']])).error,'active_buddy');
      assert.equal(await rpc('nivo_revoke_buddy','$1,$2',[B,buddyLink]),true);
      assert.equal(await rpc('nivo_revoke_buddy','$1,$2',[B,buddyLink]),true);
      assert.equal(await rpc('nivo_revoke_buddy','$1,$2',[C,buddyLink]),false);
      assert.equal(await rpc('nivo_buddy_summary','$1,$2',[buddyLink,B]),null);
      assert.equal((await rpc('nivo_accept_buddy','$1,$2',['b'.repeat(64),B])).error,'unavailable');
    });

    await t.test('push exact window, consent, per-user caps, multiple devices and idempotency', async () => {
      await db.query("update public.nivo_journeys set document=jsonb_set(jsonb_set(document,'{timezone}','\"UTC\"'),'{preferences}',jsonb_build_object('enabled',true,'consent',true,'time',to_char(date_trunc('hour',now() at time zone 'UTC')+make_interval(mins=>(extract(minute from now() at time zone 'UTC')::int/5)*5),'HH24:MI'),'maxPerDay',1,'pausedUntil',null,'followupDays','[]'::jsonb)) where user_id=$1",[A]);
      await db.query('insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values($1,$2,$3,$4),($1,$5,$3,$4)',[A,'https://push.example.invalid/one','x'.repeat(100),'y'.repeat(20),'https://push.example.invalid/two']);
      const claimed=await rpc('nivo_claim_push','$1',[100]);assert.equal(claimed.length,1);assert.equal(claimed[0].subscriptions.length,2);
      assert.equal(await rpc('nivo_push_delivery_active','$1',[claimed[0].id]),true);
      assert.deepEqual(await rpc('nivo_claim_push','$1',[100]),[]);
      await db.query("update public.nivo_journeys set document=jsonb_set(document,'{preferences,consent}','false') where user_id=$1",[A]);
      assert.equal(await rpc('nivo_push_delivery_active','$1',[claimed[0].id]),false);
      await rpc('nivo_finish_push','$1,$2',[claimed[0].id,0]);
      await db.query("update public.nivo_journeys set document=jsonb_set(document,'{preferences,consent}','true') where user_id=$1",[A]);
      assert.deepEqual(await rpc('nivo_claim_push','$1',[100]),[]);
      assert.equal(await scalar('select status from public.nivo_push_deliveries where id=$1',[claimed[0].id]),'failed');
      await db.query("update public.nivo_journeys set document=jsonb_set(jsonb_set(jsonb_set(document,'{actualQuitDate}',to_jsonb(((now() at time zone 'UTC')::date-7)::text)),'{preferences,followupDays}','[7]'),'{preferences,maxPerDay}','3') where user_id=$1",[A]);
      const follow=await rpc('nivo_claim_push','$1',[100]);assert.equal(follow.length,1);assert.equal(follow[0].kind,'followup');
      await db.query("update public.nivo_journeys set document=jsonb_set(document,'{preferences,pausedUntil}',to_jsonb(((now() at time zone 'UTC')::date)::text)) where user_id=$1",[A]);
      assert.equal(await rpc('nivo_push_delivery_active','$1',[follow[0].id]),false);
      await rpc('nivo_finish_push','$1,$2',[follow[0].id,0]);
      await db.query("update public.nivo_journeys set document=jsonb_set(jsonb_set(document,'{preferences,pausedUntil}','null'),'{preferences,time}',to_jsonb(to_char((now() at time zone 'UTC')-interval '10 minutes','HH24:MI'))) where user_id=$1",[A]);
      assert.deepEqual(await rpc('nivo_claim_push','$1',[100]),[]);
    });

    await t.test('journey delete revokes push/buddy and keeps stale offline writes conflicting', async () => {
      await rpc('nivo_create_buddy_invite','$1,$2,$3',[A,'d'.repeat(64),['days_logged_7']]);
      const outgoing=(await rpc('nivo_accept_buddy','$1,$2',['d'.repeat(64),B])).link_id;
      await rpc('nivo_create_buddy_invite','$1,$2,$3',[B,'e'.repeat(64),['days_logged_7']]);
      const incoming=(await rpc('nivo_accept_buddy','$1,$2',['e'.repeat(64),A])).link_id;
      assert.ok(outgoing);assert.ok(incoming);
      const empty=await rpc('nivo_empty_journey','',[]);
      assert.equal(await rpc('nivo_delete_journey','$1,$2,$3',[A,revision,empty]),true);revision+=1;
      assert.equal(await scalar('select count(*)::int from public.push_subscriptions where user_id=$1',[A]),0);
      assert.equal(await scalar('select count(*)::int from public.nivo_buddy_links where $1 in(user_id,buddy_id) and revoked_at is null',[A]),0);
      assert.equal(await rpc('nivo_buddy_summary','$1,$2',[outgoing,B]),null);
      assert.equal(await rpc('nivo_buddy_summary','$1,$2',[incoming,B]),null);
      assert.equal((await rpc('nivo_accept_buddy','$1,$2',['e'.repeat(64),A])).error,'unavailable');
      assert.equal((await rpc('nivo_commit_journey','$1,$2,$3,$4,$5',[A,C,revision-1,{type:'daily',date:today,count:1},doc])).error,'conflict');
    });

    const legacyJourneyView = async () => {
      await db.exec(`
        create table public.smoke_free_journey(user_id uuid primary key,start_date date);
        create table public.user_stats(user_id uuid primary key);
        create view public.user_journey_stats as
          select sj.user_id,sj.start_date,(select count(*) from public.daily_consumption dc where dc.user_id=sj.user_id) as days_logged
          from public.smoke_free_journey sj left join public.user_stats us on us.user_id=sj.user_id;
      `);
    };

    await t.test('unrelated view depending on legacy journey projection blocks reset and preserves all objects', async () => {
      await legacyJourneyView();
      await db.exec('create view public.unrelated_journey_report as select * from public.user_journey_stats');
      for (const reset of [resetApp,resetAccounts]) {
        await assert.rejects(db.exec(reset),e=>e.code==='2BP01');await db.exec('rollback');
        assert.equal(await scalar("select to_regclass('public.user_journey_stats') is not null"),true);
        assert.equal(await scalar("select to_regclass('public.smoke_free_journey') is not null"),true);
        assert.equal(await scalar('select count(*)::int from auth.users'),3);
      }
      await db.exec('drop view public.unrelated_journey_report');
    });

    await t.test('app-only reset preserves accounts, storage, unrelated objects and monotonic revisions', async () => {
      const before=await scalar('select revision from public.nivo_journeys where user_id=$1',[A]);
      await db.exec(resetApp);
      assert.equal(await scalar("select to_regclass('public.user_journey_stats') is null"),true);
      assert.equal(await scalar("select to_regclass('public.smoke_free_journey') is null"),true);
      await db.exec(schema);
      assert.equal(await scalar('select count(*)::int from auth.users'),3);
      assert.equal(await scalar('select count(*)::int from auth.sessions'),1);
      assert.equal(await scalar('select revision from public.nivo_journeys where user_id=$1',[A]),before+1);
      assert.equal(await scalar('select count(*)::int from public.daily_logs'),0);
      assert.equal(await scalar('select count(*)::int from public.unrelated_records'),1);
      assert.equal(await scalar('select count(*)::int from storage.untouched_files'),1);
    });

    await t.test('restrictive unrelated dependency rolls back the complete account reset', async () => {
      await db.exec('create table public.unrelated_account_guard(user_id uuid references auth.users(id))');
      await db.query('insert into public.unrelated_account_guard values($1)',[A]);
      await assert.rejects(db.exec(resetAccounts),e=>e.code==='23503');await db.exec('rollback');
      assert.equal(await scalar('select count(*)::int from auth.users'),3);
      assert.equal(await scalar("select to_regclass('public.push_subscriptions') is not null"),true);
      assert.equal(await scalar("select to_regclass('public.daily_logs') is not null"),true);
      await db.exec('drop table public.unrelated_account_guard');
    });

    await t.test('requested account reset removes all login users and preserves schemas/files/unrelated tables', async () => {
      await legacyJourneyView();
      await db.exec(resetAccounts);
      assert.equal(await scalar("select to_regclass('public.user_journey_stats') is null"),true);
      assert.equal(await scalar("select to_regclass('public.smoke_free_journey') is null"),true);
      await db.exec(schema);
      assert.equal(await scalar('select count(*)::int from auth.users'),0);
      assert.equal(await scalar('select count(*)::int from auth.identities'),0);
      assert.equal(await scalar('select count(*)::int from auth.sessions'),0);
      assert.equal(await scalar('select count(*)::int from public.nivo_journeys'),0);
      assert.equal(await scalar('select count(*)::int from storage.untouched_files'),1);
      assert.equal(await scalar('select count(*)::int from public.unrelated_records'),1);
      assert.equal(await scalar("select to_regclass('auth.users') is not null"),true);
    });

    await t.test('owned Storage guard preserves accounts and files without reassignment', async () => {
      await db.query('insert into auth.users(id,email) values($1,$2)',[A,'fresh@example.invalid']);
      await db.exec('create table storage.objects(id text primary key,owner_id text)');
      await db.query('insert into storage.objects values($1,$2)',['preserved-file',A]);
      await assert.rejects(db.exec(resetAccounts),/users own Storage objects/);await db.exec('rollback');
      assert.equal(await scalar('select count(*)::int from auth.users'),1);
      assert.equal(await scalar('select count(*)::int from storage.objects'),1);
      assert.equal(await scalar("select to_regclass('public.push_subscriptions') is not null"),true);
      await db.exec('drop table storage.objects');
    });

    await t.test('unrelated table dependency rejects DROP without CASCADE and rolls back', async () => {
      await db.exec('create table public.unrelated_profile_guard(profile_id uuid references public.user_profile(id))');
      await assert.rejects(db.exec(resetApp),e=>e.code==='2BP01');await db.exec('rollback');
      assert.equal(await scalar("select to_regclass('public.unrelated_profile_guard') is not null"),true);
      assert.equal(await scalar("select to_regclass('public.daily_logs') is not null"),true);
      assert.equal(await scalar("select to_regclass('public.push_subscriptions') is not null"),true);
      await db.exec('drop table public.unrelated_profile_guard');
    });

    await t.test('additive migration refuses independent daily_logs rather than destroying records', async () => {
      await db.exec('drop view public.daily_logs; create table public.daily_logs(id integer primary key)');
      await db.exec('insert into public.daily_logs values(123)');
      await assert.rejects(db.exec(schema),/already exists as an independent table/);await db.exec('rollback');
      assert.equal(await scalar('select id from public.daily_logs'),123);
      await db.exec('drop table public.daily_logs');await db.exec(schema);
    });
  } finally { await db.close(); }
});
