-- Optional real Supabase staging check. Never run this file in production.
-- Replace the two UUIDs with distinct, disposable STAGING Auth users created through Auth first.
-- All fixture health data and schema writes roll back. Do not COMMIT or remove ROLLBACK.
begin;
set local statement_timeout='30s';
select set_config('nivo.test_user_a','00000000-0000-4000-8000-000000000001',true);
select set_config('nivo.test_user_b','00000000-0000-4000-8000-000000000002',true);
do $$ begin
  if current_setting('nivo.test_user_a')=current_setting('nivo.test_user_b') or
    (select count(*) from auth.users where id in(current_setting('nivo.test_user_a')::uuid,current_setting('nivo.test_user_b')::uuid))<>2
    then raise exception 'Replace both UUIDs with two distinct disposable staging Auth users first'; end if;
end $$;

insert into public.nivo_journeys(user_id,revision,document)
select current_setting('nivo.test_user_a')::uuid,100,public.nivo_empty_journey('UTC')||jsonb_build_object(
  'daily',jsonb_build_object((now() at time zone 'UTC')::date::text,jsonb_build_object(
    'date',(now() at time zone 'UTC')::date,'status','reported','count',0,
    'baseline',jsonb_build_object('id','snapshot','cigarettesPerDay',10,'pricePerCigarette',100),
    'createdAt',now(),'updatedAt',now())),
  'baselines',jsonb_build_array(jsonb_build_object('id','newer-version','cigarettesPerDay',40,'pricePerCigarette',999)))
on conflict(user_id) do update set revision=excluded.revision,document=excluded.document;
insert into public.nivo_journeys(user_id,revision,document)
select current_setting('nivo.test_user_b')::uuid,100,public.nivo_empty_journey('UTC')||jsonb_build_object(
  'daily',jsonb_build_object((now() at time zone 'UTC')::date::text,jsonb_build_object(
    'date',(now() at time zone 'UTC')::date,'status','reported','count',9,'baseline',null,'createdAt',now(),'updatedAt',now())))
on conflict(user_id) do update set revision=excluded.revision,document=excluded.document;

set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('nivo.test_user_a'),true);
do $$ begin
  if (select count(*) from public.daily_logs)<>1 then raise exception 'RLS leak: A must see one own row only'; end if;
  if exists(select 1 from public.daily_logs where user_id=current_setting('nivo.test_user_b')::uuid) then raise exception 'RLS leak: A can read B'; end if;
  if (select count(*) from public.daily_series(7,'UTC'))<>7 or
    (select count(*) from public.daily_series(7,'UTC') where cigarettes is null)<>6 or
    (select count(*) from public.daily_series(7,'UTC') where cigarettes=0)<>1 then raise exception 'Missing versus zero failed'; end if;
  if (select saved from public.journey_summary('UTC'))<>1000 then raise exception 'Historical baseline snapshot changed'; end if;
  begin
    update public.nivo_journeys set revision=999 where user_id=current_setting('nivo.test_user_b')::uuid;
    raise exception 'Authenticated browser must not mutate journey rows';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.push_subscriptions;
    raise exception 'Authenticated browser must not read push credentials';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub',current_setting('nivo.test_user_b'),true);
do $$ begin
  if (select cigarettes from public.daily_logs)<>9 or (select count(*) from public.daily_logs)<>1 then raise exception 'B isolation failed'; end if;
end $$;
reset role;
rollback;
select 'RLS staging assertions passed; all fixture writes rolled back' as result;
