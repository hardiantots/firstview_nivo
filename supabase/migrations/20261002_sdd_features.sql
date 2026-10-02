-- NIVO SDD 00-05: self-contained, additive schema for Supabase PostgreSQL >= 15.
-- Run in staging first. This file never deletes existing health records.
-- For a deliberate reset, read RESET_AND_SCHEMA.md and run reset-nivo.sql FIRST.
begin;

create table if not exists public.user_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '', email text not null default '',
  phone_number text not null default '', gender text not null default '',
  date_of_birth date, motivations text[] not null default '{}',
  journey_start_date timestamptz, selected_preparation_days integer, actual_quit_date timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.user_profile add column if not exists full_name text not null default '';
alter table public.user_profile add column if not exists email text not null default '';
alter table public.user_profile add column if not exists phone_number text not null default '';
alter table public.user_profile add column if not exists gender text not null default '';
alter table public.user_profile add column if not exists date_of_birth date;
alter table public.user_profile add column if not exists motivations text[] not null default '{}';
alter table public.user_profile add column if not exists updated_at timestamptz not null default now();
-- Fail rather than silently discard duplicates in an old profile table.
create unique index if not exists nivo_profile_user_unique on public.user_profile(user_id);

-- Legacy records remain available, separate from current journey totals.
create table if not exists public.daily_consumption (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, cigarette_count integer not null check(cigarette_count between 0 and 200),
  money_spent numeric check(money_spent >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,date)
);
create index if not exists nivo_legacy_daily_owner_date on public.daily_consumption(user_id,date desc);
create table if not exists public.craving_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(), intensity integer check(intensity between 1 and 5),
  trigger text, location text, mood text, situation text, coping_action text,
  avoided_smoking boolean, notes text, created_at timestamptz not null default now()
);
create index if not exists nivo_legacy_craving_owner_time on public.craving_logs(user_id,occurred_at desc);

-- Keep the revisioned document as the single writable source of journey data.
create table if not exists public.nivo_journeys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 0 check(revision >= 0), document jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.nivo_journey_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null, request jsonb not null, created_at timestamptz not null default now(),
  primary key(user_id,operation_id)
);

-- Preserve previously chosen reasons before normalization introduces a default empty array.
-- Never resurrect an explicitly cleared array or silently choose from >2/invalid legacy reasons.
update public.nivo_journeys j set
  document=jsonb_set(j.document,'{motivations}',(
    select coalesce(jsonb_agg(btrim(m.value) order by m.ord),'[]'::jsonb)
    from unnest(p.motivations) with ordinality m(value,ord)
  ),true),revision=j.revision+1,updated_at=now()
from public.user_profile p
where p.user_id=j.user_id and j.document->>'schema'='1' and not(j.document ? 'motivations')
  and p.motivations is not null and cardinality(p.motivations) between 0 and 2
  and (cardinality(p.motivations)=0 or array_ndims(p.motivations)=1)
  and not exists(select 1 from unnest(p.motivations) m(value)
    where m.value is null or char_length(btrim(m.value)) not between 1 and 200);
-- Revision is a barrier for stale offline documents; no health/history event is invented.

create or replace function public.nivo_empty_journey(p_tz text default 'Asia/Makassar')
returns jsonb language sql immutable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object('schema',1,'timezone',p_tz,'targetQuitDate',null,'actualQuitDate',null,
    'daily','{}'::jsonb,'baselines','[]'::jsonb,'checkins','[]'::jsonb,'coping','[]'::jsonb,
    'feedback','[]'::jsonb,'slips','[]'::jsonb,'answers','[]'::jsonb,'history','[]'::jsonb,
    'preferences',jsonb_build_object('enabled',false,'consent',false,'time','19:00','maxPerDay',1,
      'pausedUntil',null,'followupDays','[]'::jsonb),
    'ownReason','','motivations','[]'::jsonb,'minutesToFirstCigarette',null,
    'reduceFirst',false,'rewardGoal','','insightsHidden',false,
    'cravingEvents','[]'::jsonb,'lessonCompletions','[]'::jsonb);
$$;

create or replace function public.nivo_commit_journey(p_user uuid,p_operation uuid,p_expected integer,p_request jsonb,p_document jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_row public.nivo_journeys; previous_request jsonb;
begin
  if p_user is null or p_operation is null or p_expected is null or p_expected < 0 or p_request is null then raise exception 'invalid_operation'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,31));
  select * into current_row from public.nivo_journeys where user_id=p_user for update;
  select request into previous_request from public.nivo_journey_operations where user_id=p_user and operation_id=p_operation;
  if found then
    if previous_request <> p_request then return jsonb_build_object('error','id_reused'); end if;
    return jsonb_build_object('revision',current_row.revision,'state',current_row.document,'replayed',true);
  end if;
  if coalesce(current_row.revision,0) <> p_expected then return jsonb_build_object('error','conflict'); end if;
  if p_document is null or pg_column_size(p_document)>2000000 or p_document->>'schema' is distinct from '1'
    or jsonb_typeof(p_document->'daily') is distinct from 'object' then raise exception 'invalid_document'; end if;
  insert into public.nivo_journeys(user_id,revision,document) values(p_user,p_expected+1,p_document)
    on conflict(user_id) do update set revision=excluded.revision,document=excluded.document,updated_at=now();
  insert into public.nivo_journey_operations(user_id,operation_id,request) values(p_user,p_operation,p_request);
  return jsonb_build_object('revision',p_expected+1,'state',p_document);
end $$;

create or replace function public.nivo_delete_journey(p_user uuid,p_expected integer,p_empty jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_user is null or p_expected is null or p_expected < 0 or p_empty is null
    or p_empty->>'schema' is distinct from '1' or p_empty->'daily' is distinct from '{}'::jsonb then raise exception 'invalid_delete'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,31));
  if coalesce((select revision from public.nivo_journeys where user_id=p_user),0) <> p_expected then return false; end if;
  -- Serialize uncommon buddy mutations, including both directions of deletion/revocation.
  perform pg_advisory_xact_lock(42015,3301);
  delete from public.nivo_journey_operations where user_id=p_user;
  insert into public.nivo_journeys(user_id,revision,document) values(p_user,p_expected+1,p_empty)
    on conflict(user_id) do update set revision=excluded.revision,document=excluded.document,updated_at=now();
  -- Revocation is part of deletion, so a queued scheduler cannot notify this user.
  delete from public.push_subscriptions where user_id=p_user;
  update public.nivo_push_deliveries set status='revoked' where user_id=p_user and status='reserved';
  update public.nivo_buddy_invites set revoked_at=now() where p_user in(user_id,accepted_by) and revoked_at is null;
  update public.nivo_buddy_links set revoked_at=now() where p_user in(user_id,buddy_id) and revoked_at is null;
  return true;
end $$;

-- Optional consultation service: nothing is enabled or advertised by creating these tables.
create table if not exists public.nivo_consultants (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null, credentials text not null, verified_at timestamptz,
  environment text not null check(environment in ('test','production')),available_until timestamptz,
  role text not null default 'consultant' check(role in ('consultant','admin'))
);
create table if not exists public.nivo_rooms (
  id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
  consultant_id uuid not null references auth.users(id) on delete cascade,
  revision integer not null,document jsonb not null,expires_at timestamptz not null
);
create table if not exists public.nivo_consultation_audit (
  id bigint generated always as identity primary key,actor uuid not null,room uuid,
  action text not null,at timestamptz not null default now()
);
create or replace function public.nivo_commit_room(p_id uuid,p_user uuid,p_consultant uuid,p_expected integer,p_document jsonb,p_expires timestamptz)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,32));
  select revision into current_revision from public.nivo_rooms where id=p_id for update;
  if coalesce(current_revision,0)<>p_expected or p_expires<=now() then return false; end if;
  if p_document is null or pg_column_size(p_document)>1500000 then raise exception 'invalid_room'; end if;
  insert into public.nivo_rooms(id,user_id,consultant_id,revision,document,expires_at)
    values(p_id,p_user,p_consultant,p_expected+1,p_document,p_expires)
    on conflict(id) do update set revision=excluded.revision,document=excluded.document;
  return true;
end $$;
create or replace function public.nivo_purge_consultation()
returns void language sql security definer set search_path=public,pg_temp as $$
  delete from public.nivo_rooms where expires_at<=now();
  update public.nivo_rooms set document=jsonb_set(document,'{signals}','[]'::jsonb),revision=revision+1
    where jsonb_array_length(coalesce(document->'signals','[]'::jsonb))>0 and not exists(
      select 1 from jsonb_array_elements(document->'signals') s where (s->>'at')::timestamptz>now()-interval '2 minutes');
  delete from public.nivo_consultation_audit where at<now()-interval '30 days';
$$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check(endpoint like 'https://%' and char_length(endpoint)<=2048),
  p256dh text not null check(char_length(p256dh) between 16 and 512),
  auth text not null check(char_length(auth) between 8 and 256),
  enabled boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.push_subscriptions add column if not exists enabled boolean not null default true;
alter table public.push_subscriptions add column if not exists updated_at timestamptz not null default now();
create index if not exists nivo_push_owner on public.push_subscriptions(user_id);
-- One reservation per reminder, independent of device count. Never store health text in push logs.
create table if not exists public.nivo_push_deliveries (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  reminder_id text not null check(char_length(reminder_id)<=160),local_date date not null,
  status text not null default 'reserved' check(status in ('reserved','sent','failed','revoked')),
  reserved_at timestamptz not null default now(),sent_at timestamptz,delivered_count integer not null default 0 check(delivered_count>=0),
  unique(user_id,reminder_id)
);
create index if not exists nivo_push_delivery_owner_date on public.nivo_push_deliveries(user_id,local_date);

create table if not exists public.nivo_buddy_invites (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  share_metrics text[] not null check(cardinality(share_metrics) between 1 and 3 and
    share_metrics <@ array['smoke_free_days','total_smoke_free_days','days_logged_7']::text[]),
  created_at timestamptz not null default now(),expires_at timestamptz not null,
  revoked_at timestamptz,accepted_by uuid references auth.users(id) on delete cascade,accepted_at timestamptz,
  check(accepted_by is null or accepted_by<>user_id),check(expires_at>created_at)
);
create table if not exists public.nivo_buddy_links (
  id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
  buddy_id uuid not null references auth.users(id) on delete cascade,
  invite_id uuid not null unique references public.nivo_buddy_invites(id) on delete cascade,
  share_metrics text[] not null check(cardinality(share_metrics) between 1 and 3 and
    share_metrics <@ array['smoke_free_days','total_smoke_free_days','days_logged_7']::text[]),
  created_at timestamptz not null default now(),revoked_at timestamptz,check(user_id<>buddy_id)
);
create index if not exists nivo_buddy_pending_owner on public.nivo_buddy_invites(user_id,expires_at desc)
  where revoked_at is null and accepted_by is null;
create unique index if not exists nivo_buddy_one_active on public.nivo_buddy_links(user_id) where revoked_at is null;
create index if not exists nivo_buddy_recipient on public.nivo_buddy_links(buddy_id) where revoked_at is null;

create table if not exists public.lessons (
  id text primary key check(id ~ '^[a-z0-9_-]{1,80}$'),title text not null check(char_length(title)<=160),
  body text[] not null check(cardinality(body) between 1 and 12),
  duration_sec integer not null check(duration_sec between 60 and 300),
  active boolean not null default true,sort_order integer not null default 0
);
insert into public.lessons(id,title,body,duration_sec,sort_order) values
  ('notice-wave','Amati keinginan seperti ombak',array['Duduk senyaman mungkin. Perhatikan di bagian tubuh mana keinginan terasa.','Beri nama sensasinya, tanpa harus melawannya. Tarik napas dengan nyaman.','Pilih satu langkah kecil yang sesuai alasanmu berhenti.'],120,1),
  ('small-value','Ingat hal yang berarti',array['Pikirkan satu hal yang ingin kamu jaga: kesehatan, keluarga, atau rencana pribadi.','Tuliskan satu tindakan kecil yang bisa kamu lakukan hari ini.','Kemajuanmu tetap berarti, termasuk saat langkah terasa sulit.'],120,2),
  ('change-context','Ubah suasana sebentar',array['Pindah dari tempat yang memicu keinginan jika memungkinkan.','Minum air atau lakukan aktivitas singkat yang nyaman bagimu.','Catat apa yang membantu agar bisa kamu pilih lagi.'],120,3)
on conflict(id) do nothing;

-- Rebuild policies only on explicitly owned NIVO relations; permissive legacy policies must not leak data.
do $$ declare p record; n text; begin
  for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename=any(array[
    'user_profile','daily_consumption','craving_logs','nivo_journeys','nivo_journey_operations',
    'nivo_consultants','nivo_rooms','nivo_consultation_audit','push_subscriptions','nivo_push_deliveries',
    'nivo_buddy_invites','nivo_buddy_links','lessons']) loop
    execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);
  end loop;
  foreach n in array array['user_profile','daily_consumption','craving_logs','nivo_journeys','nivo_journey_operations',
    'nivo_consultants','nivo_rooms','nivo_consultation_audit','push_subscriptions','nivo_push_deliveries','nivo_buddy_invites','nivo_buddy_links','lessons'] loop
    execute format('alter table public.%I enable row level security',n);
    execute format('revoke all on public.%I from public,anon,authenticated',n);
    execute format('grant all on public.%I to service_role',n);
  end loop;
end $$;
create policy nivo_profile_owner on public.user_profile for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy nivo_daily_legacy_owner on public.daily_consumption for select to authenticated using(user_id=(select auth.uid()));
create policy nivo_craving_legacy_owner on public.craving_logs for select to authenticated using(user_id=(select auth.uid()));
create policy nivo_journey_owner_read on public.nivo_journeys for select to authenticated using(user_id=(select auth.uid()));
create policy nivo_lessons_read on public.lessons for select to authenticated using(active);
grant select,insert,update on public.user_profile to authenticated;
grant select on public.daily_consumption,public.craving_logs,public.nivo_journeys,public.lessons to authenticated;
grant usage,select on sequence public.nivo_consultation_audit_id_seq to service_role;

-- Do not replace pre-existing independent tables silently. Resolve them explicitly before an additive upgrade.
do $$ declare n text; k "char"; begin
  foreach n in array array['daily_logs','craving_events','journey_settings'] loop
    select relkind into k from pg_class where oid=to_regclass('public.'||n);
    if k is not null and k<>'v' then raise exception '% already exists as an independent table; back up and migrate it before running this script',n; end if;
  end loop;
end $$;

create or replace view public.daily_logs with(security_invoker=true,security_barrier=true) as
select j.user_id,d.key::date as log_date,
  case when d.value->>'status'='reported' then (d.value->>'count')::integer else null end as cigarettes,
  d.value->>'status'='reported' as reported,
  (d.value->'baseline'->>'cigarettesPerDay')::numeric as baseline_cigs_per_day,
  (d.value->'baseline'->>'pricePerCigarette')::numeric as price_per_cigarette,
  d.value->'baseline'->>'id' as baseline_id,
  (d.value->>'createdAt')::timestamptz as created_at,(d.value->>'updatedAt')::timestamptz as updated_at
from public.nivo_journeys j cross join lateral jsonb_each(j.document->'daily') d;

create or replace view public.craving_events with(security_invoker=true,security_barrier=true) as
select j.user_id,e->>'id' as id,(e->>'occurredAt')::timestamptz as occurred_at,
  (e->>'intensity')::integer as intensity,e->>'trigger' as trigger,e->>'outcome' as outcome,
  (e->>'durationSec')::integer as duration_sec,e->>'note' as note,'sos'::text as source
from public.nivo_journeys j cross join lateral jsonb_array_elements(coalesce(j.document->'cravingEvents','[]'::jsonb)) e
union all
select j.user_id,e->>'id',(e->>'occurredAt')::timestamptz,
  (e->>'intensity')::integer*2,e->>'trigger',null::text,null::integer,e->>'context','checkin'::text
from public.nivo_journeys j cross join lateral jsonb_array_elements(coalesce(j.document->'checkins','[]'::jsonb)) e
where not exists(select 1 from jsonb_array_elements(coalesce(j.document->'cravingEvents','[]'::jsonb)) c where c->>'id'=e->>'id')
union all
select j.user_id,e->>'id',(e->>'occurredAt')::timestamptz,null::integer,e->>'trigger','smoked'::text,
  null::integer,e->>'nextStep','slip'::text
from public.nivo_journeys j cross join lateral jsonb_array_elements(coalesce(j.document->'slips','[]'::jsonb)) e
where not exists(select 1 from jsonb_array_elements(coalesce(j.document->'cravingEvents','[]'::jsonb)) c
  where c->>'id'=e->>'cravingEventId');

create or replace view public.journey_settings with(security_invoker=true,security_barrier=true) as
select j.user_id,j.document->>'timezone' as timezone,(j.document->>'targetQuitDate')::date as target_quit_date,
  (j.document->>'actualQuitDate')::date as actual_quit_date,
  coalesce(j.document->>'ownReason','') as own_reason,
  coalesce(j.document->'motivations','[]'::jsonb) as motivations,
  (j.document->>'minutesToFirstCigarette')::integer as minutes_to_first_cigarette,
  coalesce((j.document->>'reduceFirst')::boolean,false) as reduce_first,
  coalesce(j.document->>'rewardGoal','') as reward_goal,
  coalesce((j.document->>'insightsHidden')::boolean,false) as insights_hidden,
  (b.value->>'cigarettesPerDay')::numeric as baseline_cigs_per_day,
  (b.value->>'pricePerCigarette')::numeric as price_per_cigarette,
  j.revision,j.updated_at
from public.nivo_journeys j left join lateral (
  select value from jsonb_array_elements(coalesce(j.document->'baselines','[]'::jsonb)) with ordinality t(value,ord)
  order by ord desc limit 1
) b on true;
revoke all on public.daily_logs,public.craving_events,public.journey_settings from public,anon,authenticated;
grant select on public.daily_logs,public.craving_events,public.journey_settings to authenticated,service_role;

-- Bound date windows and validate timezone once; caller cannot request another user's records.
create or replace function public.nivo_analytics_bounds(p_days integer,p_tz text)
returns date language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_days is null or p_days<1 or p_days>366 then raise exception 'days_must_be_1_to_366' using errcode='22023'; end if;
  if p_tz is null or not exists(select 1 from pg_timezone_names where name=p_tz) then raise exception 'invalid_timezone' using errcode='22023'; end if;
  return (now() at time zone p_tz)::date;
end $$;

-- Original SDD snippets may have the same inputs but fewer result columns.
-- Recreate only these known API definitions atomically; no data drops or dependency CASCADE.
drop function if exists public.daily_series(integer,text);
drop function if exists public.craving_by_hour(integer,text);
drop function if exists public.craving_by_trigger(integer);
drop function if exists public.journey_summary(text);

create function public.daily_series(p_days integer default 7,p_tz text default 'Asia/Makassar')
returns table(day date,cigarettes integer,baseline_cigs_per_day numeric,price_per_cigarette numeric)
language sql stable security invoker set search_path=public,pg_temp as $$
  with t as(select public.nivo_analytics_bounds(p_days,p_tz) as today)
  select t.today-g,l.cigarettes,l.baseline_cigs_per_day,l.price_per_cigarette
  from t cross join generate_series(p_days-1,0,-1) g
  left join public.daily_logs l on l.log_date=t.today-g and l.user_id=(select auth.uid()) order by 1;
$$;

create or replace function public.craving_by_hour(p_days integer default 30,p_tz text default 'Asia/Makassar')
returns table(hour integer,total integer,passed integer,smoked integer,ongoing integer)
language sql stable security invoker set search_path=public,pg_temp as $$
  with t as(select public.nivo_analytics_bounds(p_days,p_tz) as today)
  select extract(hour from e.occurred_at at time zone p_tz)::integer,count(*)::integer,
    count(*) filter(where outcome='passed')::integer,count(*) filter(where outcome='smoked')::integer,
    count(*) filter(where outcome='ongoing')::integer
  from public.craving_events e cross join t
  where e.user_id=(select auth.uid()) and e.occurred_at >= ((t.today-(p_days-1))::timestamp at time zone p_tz)
    and e.occurred_at<=now() group by 1 order by 1;
$$;

create or replace function public.craving_by_trigger(p_days integer default 30)
returns table(trigger text,total integer)
language sql stable security invoker set search_path=public,pg_temp as $$
  with t as(select public.nivo_analytics_bounds(p_days,coalesce((select timezone from public.journey_settings where user_id=(select auth.uid())),'Asia/Makassar')) as today),
  settings as(select coalesce((select timezone from public.journey_settings where user_id=(select auth.uid())),'Asia/Makassar') as tz)
  select coalesce(nullif(lower(trim(e.trigger)),''),'Lainnya'),count(*)::integer
  from public.craving_events e cross join t cross join settings
  where e.user_id=(select auth.uid()) and e.occurred_at>=((t.today-(p_days-1))::timestamp at time zone settings.tz)
    and e.occurred_at<=now() group by 1 order by 2 desc,1 limit 8;
$$;

create or replace function public.journey_summary(p_tz text default 'Asia/Makassar')
returns table(days_logged_7 integer,avoided numeric,saved numeric,smoke_free_days integer,
  estimate_days integer,days_logged integer,total_smoke_free_days integer,current_smoke_free_days integer,
  craving_total integer,craving_passed integer,craving_outcome_known integer)
language sql stable security invoker set search_path=public,pg_temp as $$
  with t as(select public.nivo_analytics_bounds(7,p_tz) as today),
  l as(select d.* from public.daily_logs d cross join t where d.user_id=(select auth.uid()) and d.reported and d.cigarettes is not null and d.log_date<=t.today),
  zero_days as(select * from l where cigarettes=0 and not exists(
    select 1 from public.craving_events c where c.user_id=l.user_id and c.outcome='smoked' and (c.occurred_at at time zone p_tz)::date=l.log_date
  ) and not exists(select 1 from public.nivo_journeys j cross join lateral jsonb_array_elements(coalesce(j.document->'slips','[]'::jsonb)) s
    where j.user_id=l.user_id and ((s->>'occurredAt')::timestamptz at time zone p_tz)::date=l.log_date)),
  estimates as(select * from l where baseline_cigs_per_day is not null and price_per_cigarette is not null),
  current_days as(select count(*)::integer as total from zero_days cross join t where log_date>
    coalesce((select max(t.today-g) from t cross join generate_series(0,greatest(0,t.today-coalesce((select min(log_date) from l),t.today))) g
      where not exists(select 1 from zero_days x where x.log_date=t.today-g)),coalesce((select min(log_date) from l),t.today)-1)),
  c as(select * from public.craving_events where user_id=(select auth.uid()) and occurred_at<=now())
  select (select count(*)::integer from l cross join t where log_date>=t.today-6),
    (select sum(greatest(baseline_cigs_per_day-cigarettes,0)) from estimates),
    (select sum(greatest(baseline_cigs_per_day-cigarettes,0)*price_per_cigarette) from estimates),
    (select count(*)::integer from zero_days),(select count(*)::integer from estimates),
    (select count(*)::integer from l),(select count(*)::integer from zero_days),
    (select total from current_days),(select count(*)::integer from c),
    (select count(*)::integer from c where outcome='passed'),(select count(*)::integer from c where outcome in('passed','ongoing','smoked'));
$$;

-- API callers authenticate first. This service-only RPC atomically updates basic profile + reason/timezone.
create or replace function public.nivo_update_profile(p_user uuid,p_profile jsonb,p_expected integer,p_own_reason text default null,p_timezone text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare current_row public.nivo_journeys; next_doc jsonb; changed boolean:=false; next_revision integer; names text[];
begin
  if p_user is null or jsonb_typeof(p_profile) is distinct from 'object' or exists(
    select 1 from jsonb_object_keys(p_profile) k where k not in('full_name','phone_number','gender','date_of_birth','motivations'))
    or char_length(coalesce(p_profile->>'full_name',''))>200 or char_length(coalesce(p_profile->>'phone_number',''))>40
    or (p_profile ? 'gender' and p_profile->>'gender' not in('','Laki-Laki','Perempuan'))
    or (p_own_reason is not null and char_length(p_own_reason)>300)
    or (p_timezone is not null and not exists(select 1 from pg_timezone_names where name=p_timezone)) then raise exception 'invalid_profile'; end if;
  if p_profile ? 'date_of_birth' and p_profile->>'date_of_birth' is not null and
    ((p_profile->>'date_of_birth')::date<date '1900-01-01' or (p_profile->>'date_of_birth')::date>(now() at time zone 'Asia/Makassar')::date) then raise exception 'invalid_birth_date'; end if;
  if p_profile ? 'motivations' then
    if jsonb_typeof(p_profile->'motivations')<>'array' or jsonb_array_length(p_profile->'motivations')>10 then raise exception 'invalid_motivations'; end if;
    select array_agg(value) into names from jsonb_array_elements_text(p_profile->'motivations') where char_length(value) between 1 and 200;
    if coalesce(cardinality(names),0)<>jsonb_array_length(p_profile->'motivations') then raise exception 'invalid_motivations'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,31));
  select * into current_row from public.nivo_journeys where user_id=p_user for update;
  next_revision:=coalesce(current_row.revision,0);
  if (p_own_reason is not null or p_timezone is not null or p_profile ? 'motivations') and (p_expected is null or next_revision<>p_expected) then return jsonb_build_object('error','conflict'); end if;
  next_doc:=coalesce(current_row.document,public.nivo_empty_journey());
  if p_own_reason is not null and coalesce(next_doc->>'ownReason','')<>p_own_reason then
    next_doc:=jsonb_set(next_doc,'{ownReason}',to_jsonb(p_own_reason),true); changed:=true;
  end if;
  if p_timezone is not null and next_doc->>'timezone' is distinct from p_timezone then
    next_doc:=jsonb_set(next_doc,'{timezone}',to_jsonb(p_timezone),true);changed:=true;
  end if;
  if p_profile ? 'motivations' and coalesce(next_doc->'motivations','[]'::jsonb) is distinct from p_profile->'motivations' then
    next_doc:=jsonb_set(next_doc,'{motivations}',p_profile->'motivations',true);changed:=true;
  end if;
  insert into public.user_profile(user_id,full_name,email,phone_number,gender,date_of_birth,motivations)
    values(p_user,coalesce(p_profile->>'full_name',''),coalesce((select email from auth.users where id=p_user),''),
      coalesce(p_profile->>'phone_number',''),coalesce(p_profile->>'gender',''),(p_profile->>'date_of_birth')::date,
      coalesce(names,'{}'))
    on conflict(user_id) do update set
      full_name=case when p_profile ? 'full_name' then excluded.full_name else user_profile.full_name end,
      email=excluded.email,phone_number=case when p_profile ? 'phone_number' then excluded.phone_number else user_profile.phone_number end,
      gender=case when p_profile ? 'gender' then excluded.gender else user_profile.gender end,
      date_of_birth=case when p_profile ? 'date_of_birth' then excluded.date_of_birth else user_profile.date_of_birth end,
      motivations=case when p_profile ? 'motivations' then excluded.motivations else user_profile.motivations end,updated_at=now();
  if changed then
    next_revision:=next_revision+1;
    next_doc:=jsonb_set(next_doc,'{history}',coalesce(next_doc->'history','[]'::jsonb)||jsonb_build_array(
      jsonb_build_object('id',gen_random_uuid(),'type','profile','createdAt',now())),true);
    insert into public.nivo_journeys(user_id,revision,document) values(p_user,next_revision,next_doc)
      on conflict(user_id) do update set revision=excluded.revision,document=excluded.document,updated_at=now();
  end if;
  return jsonb_build_object('success',true,'revision',next_revision,'state',next_doc);
end $$;

create or replace function public.nivo_claim_push(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j record; p jsonb; local_at timestamp; today date; reminders text[]; reminder text; subs jsonb;
  capacity integer; delivery_id uuid; result jsonb:='[]';
begin
  if p_limit is null or p_limit<1 or p_limit>500 then raise exception 'invalid_limit'; end if;
  -- Prevent concurrent scheduler invocations from bypassing caps on different reminders.
  perform pg_advisory_xact_lock(42015,3102);
  for j in select user_id,document from public.nivo_journeys where document->'preferences'->>'enabled'='true'
    and document->'preferences'->>'consent'='true' and exists(
      select 1 from public.push_subscriptions s where s.user_id=nivo_journeys.user_id and s.enabled)
    order by user_id loop
    exit when jsonb_array_length(result)>=p_limit;
    p:=j.document->'preferences';local_at:=now() at time zone (j.document->>'timezone');today:=local_at::date;
    if (p->>'pausedUntil')::date>=today or local_at::time<(p->>'time')::time or
      local_at::time-(p->>'time')::time>=interval '5 minutes' then continue; end if;
    capacity:=least(3,greatest(1,(p->>'maxPerDay')::integer))-(select count(*) from (
      select reminder_id from public.nivo_push_deliveries where user_id=j.user_id and local_date=today and status<>'revoked'
      union select a->>'reminderId' from jsonb_array_elements(coalesce(j.document->'answers','[]'::jsonb)) a where a->>'date'=today::text
    ) consumed);
    if capacity<=0 then continue; end if;
    select jsonb_agg(jsonb_build_object('id',s.id,'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth)) into subs
      from public.push_subscriptions s where s.user_id=j.user_id and s.enabled;
    reminders:='{}';
    if j.document->>'actualQuitDate' is not null and exists(
      select 1 from jsonb_array_elements_text(coalesce(p->'followupDays','[]'::jsonb)) d
      where d::integer=today-(j.document->>'actualQuitDate')::date) then
      reminders:=array_append(reminders,'followup:'||(j.document->>'actualQuitDate')||':'||today::text);
    end if;
    reminders:=array_append(reminders,'checkin:'||today::text);
    foreach reminder in array reminders loop
      exit when capacity<=0 or jsonb_array_length(result)>=p_limit;
      if exists(select 1 from jsonb_array_elements(coalesce(j.document->'answers','[]'::jsonb)) a where a->>'reminderId'=reminder) then continue; end if;
      delivery_id:=null;
      insert into public.nivo_push_deliveries(user_id,reminder_id,local_date) values(j.user_id,reminder,today)
        on conflict(user_id,reminder_id) do nothing returning id into delivery_id;
      if delivery_id is not null then
        result:=result||jsonb_build_array(jsonb_build_object('id',delivery_id,'user_id',j.user_id,
          'reminder_id',reminder,'kind',split_part(reminder,':',1),'subscriptions',subs));capacity:=capacity-1;
      end if;
    end loop;
  end loop;
  return result;
end $$;

create or replace function public.nivo_push_delivery_active(p_delivery uuid)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare d public.nivo_push_deliveries; doc jsonb; p jsonb; local_at timestamp;
begin
  select * into d from public.nivo_push_deliveries where id=p_delivery and status='reserved';
  if not found then return false; end if;
  select document into doc from public.nivo_journeys where user_id=d.user_id;p:=doc->'preferences';
  if doc is null or p->>'enabled' is distinct from 'true' or p->>'consent' is distinct from 'true' then return false; end if;
  local_at:=now() at time zone (doc->>'timezone');
  if local_at::date<>d.local_date or (p->>'pausedUntil')::date>=d.local_date or local_at::time<(p->>'time')::time
    or local_at::time-(p->>'time')::time>=interval '5 minutes' then return false; end if;
  if split_part(d.reminder_id,':',1)='followup' and ('followup:'||coalesce(doc->>'actualQuitDate','')||':'||d.local_date::text<>d.reminder_id
    or not exists(select 1 from jsonb_array_elements_text(coalesce(p->'followupDays','[]'::jsonb)) n
      where n::integer=d.local_date-(doc->>'actualQuitDate')::date)) then return false; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(doc->'answers','[]'::jsonb)) a where a->>'reminderId'=d.reminder_id) then return false; end if;
  if (select count(*) from (select reminder_id from public.nivo_push_deliveries where user_id=d.user_id and local_date=d.local_date and status<>'revoked'
    union select a->>'reminderId' from jsonb_array_elements(coalesce(doc->'answers','[]'::jsonb)) a where a->>'date'=d.local_date::text) consumed)>(p->>'maxPerDay')::integer then return false; end if;
  return exists(select 1 from public.push_subscriptions where user_id=d.user_id and enabled);
end $$;

create or replace function public.nivo_finish_push(p_delivery uuid,p_delivered integer)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if p_delivered is null or p_delivered<0 then raise exception 'invalid_delivery_count'; end if;
  update public.nivo_push_deliveries set status=case when p_delivered>0 then 'sent' else 'failed' end,
    delivered_count=p_delivered,sent_at=case when p_delivered>0 then now() else null end where id=p_delivery and status='reserved';
end $$;

create or replace function public.nivo_create_buddy_invite(p_user uuid,p_token_hash text,p_metrics text[])
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare invite_id uuid; expires timestamptz;
begin
  if p_user is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' or p_metrics is null
    or cardinality(p_metrics) not between 1 and 3 or not(p_metrics<@array['smoke_free_days','total_smoke_free_days','days_logged_7']::text[]) then raise exception 'invalid_invite'; end if;
  perform pg_advisory_xact_lock(42015,3301);
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,33));
  if exists(select 1 from public.nivo_buddy_links where user_id=p_user and revoked_at is null) then return jsonb_build_object('error','active_buddy'); end if;
  update public.nivo_buddy_invites set revoked_at=now() where user_id=p_user and accepted_by is null and revoked_at is null;
  expires:=now()+interval '24 hours';
  insert into public.nivo_buddy_invites(user_id,token_hash,share_metrics,expires_at)
    values(p_user,p_token_hash,array(select distinct unnest(p_metrics)),expires) returning id into invite_id;
  return jsonb_build_object('id',invite_id,'expires_at',expires);
end $$;

create or replace function public.nivo_accept_buddy(p_token_hash text,p_buddy uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare invite public.nivo_buddy_invites; link_id uuid; owner_id uuid;
begin
  perform pg_advisory_xact_lock(42015,3301);
  select user_id into owner_id from public.nivo_buddy_invites where token_hash=p_token_hash;
  if owner_id is null then return jsonb_build_object('error','unavailable'); end if;
  -- Same ordering as invitation creation: module -> owner -> invitation row.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,33));
  select * into invite from public.nivo_buddy_invites where token_hash=p_token_hash for update;
  if not found or invite.revoked_at is not null or invite.expires_at<=now() or p_buddy is null or invite.user_id=p_buddy then return jsonb_build_object('error','unavailable'); end if;
  if invite.accepted_by is not null then
    if invite.accepted_by<>p_buddy then return jsonb_build_object('error','unavailable'); end if;
    select id into link_id from public.nivo_buddy_links where invite_id=invite.id and revoked_at is null;
    if link_id is null then return jsonb_build_object('error','unavailable'); end if;
    return jsonb_build_object('link_id',link_id,'replayed',true);
  end if;
  -- They may have only one active buddy, even when different invitations race.
  if exists(select 1 from public.nivo_buddy_links where user_id=invite.user_id and revoked_at is null) then return jsonb_build_object('error','unavailable'); end if;
  insert into public.nivo_buddy_links(user_id,buddy_id,invite_id,share_metrics)
    values(invite.user_id,p_buddy,invite.id,invite.share_metrics) returning id into link_id;
  update public.nivo_buddy_invites set accepted_by=p_buddy,accepted_at=now() where id=invite.id;
  return jsonb_build_object('link_id',link_id);
end $$;

create or replace function public.nivo_revoke_buddy(p_actor uuid,p_link uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare invite_id uuid;
begin
  perform pg_advisory_xact_lock(42015,3301);
  select nivo_buddy_links.invite_id into invite_id from public.nivo_buddy_links where id=p_link and p_actor in(user_id,buddy_id);
  if not found then return false; end if;
  -- Authorized retries succeed; an unknown link or unrelated actor still receives false.
  update public.nivo_buddy_links set revoked_at=coalesce(revoked_at,now()) where id=p_link;
  update public.nivo_buddy_invites set revoked_at=coalesce(revoked_at,now()) where id=invite_id;
  return true;
end $$;

create or replace function public.nivo_buddy_summary(p_link uuid,p_actor uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare link public.nivo_buddy_links; doc jsonb; tz text; today date; result jsonb:='{}'; value integer; metric text; zero_dates date[];
begin
  select * into link from public.nivo_buddy_links where id=p_link and p_actor in(user_id,buddy_id) and revoked_at is null;
  if not found then return null; end if;
  select document into doc from public.nivo_journeys where user_id=link.user_id;
  tz:=coalesce(doc->>'timezone','Asia/Makassar');today:=(now() at time zone tz)::date;
  select coalesce(array_agg(d.key::date),'{}') into zero_dates from jsonb_each(coalesce(doc->'daily','{}'::jsonb)) d
    where d.key::date<=today and d.value->>'status'='reported' and d.value->>'count'='0'
      and not exists(select 1 from jsonb_array_elements(coalesce(doc->'slips','[]'::jsonb)) s where ((s->>'occurredAt')::timestamptz at time zone tz)::date=d.key::date)
      and not exists(select 1 from jsonb_array_elements(coalesce(doc->'cravingEvents','[]'::jsonb)) c where c->>'outcome'='smoked' and ((c->>'occurredAt')::timestamptz at time zone tz)::date=d.key::date);
  foreach metric in array link.share_metrics loop
    if metric='days_logged_7' then
      select count(*)::integer into value from jsonb_each(coalesce(doc->'daily','{}'::jsonb)) d
        where d.key::date between today-6 and today and d.value->>'status'='reported' and d.value->>'count' is not null;
    elsif metric='total_smoke_free_days' then
      value:=cardinality(zero_dates);
    else
      value:=0;
      -- Never infer a zero from an unreported day or quit date alone.
      while (today-value)=any(zero_dates) loop value:=value+1; end loop;
    end if;
    result:=result||jsonb_build_object(metric,value);
  end loop;
  return result;
end $$;

-- Explicit function privileges: default PUBLIC EXECUTE must not expose service-only mutations.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=any(array['nivo_empty_journey','nivo_commit_journey','nivo_delete_journey',
      'nivo_commit_room','nivo_purge_consultation','nivo_update_profile','nivo_create_buddy_invite','nivo_accept_buddy','nivo_revoke_buddy','nivo_buddy_summary',
      'nivo_claim_push','nivo_push_delivery_active','nivo_finish_push',
      'nivo_analytics_bounds','daily_series','craving_by_hour','craving_by_trigger','journey_summary']) loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
    if f.proname=any(array['nivo_analytics_bounds','daily_series','craving_by_hour','craving_by_trigger','journey_summary']) then
      execute format('grant execute on function %s to authenticated',f.signature);
    end if;
  end loop;
end $$;

-- Ask PostgREST to refresh RPC/column metadata after the transaction commits.
notify pgrst,'reload schema';
commit;
