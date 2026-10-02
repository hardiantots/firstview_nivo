-- READ ONLY: run in SQL Editor of the intended project before deploying.
-- Does not select profile/health records, invoke mutations, or alter schema.
select name, to_regclass('public.' || name) is not null as exists
from (values ('user_profile'), ('daily_consumption'), ('nivo_journeys'), ('nivo_journey_operations')) as required(name);

select proname, prosecdef as security_definer, proconfig as function_configuration
from pg_proc join pg_namespace n on n.oid = pronamespace
where n.nspname = 'public' and proname in ('nivo_commit_journey', 'nivo_delete_journey');

select c.relname, c.relrowsecurity as rls_enabled,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
       has_table_privilege('service_role', c.oid, 'SELECT') as server_select,
       has_table_privilege('service_role', c.oid, 'INSERT') as server_insert,
       has_table_privilege('service_role', c.oid, 'UPDATE') as server_update,
       has_table_privilege('service_role', c.oid, 'DELETE') as server_delete
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('nivo_journeys', 'nivo_journey_operations');

select proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as server_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname in ('nivo_commit_journey', 'nivo_delete_journey');

select exists (
  select 1 from pg_index i
  join pg_attribute a on a.attrelid = i.indrelid and a.attname = 'user_id'
  where i.indrelid = to_regclass('public.user_profile')
    and i.indisunique and i.indisvalid and i.indnkeyatts = 1
    and i.indpred is null and i.indexprs is null
    and i.indkey[0] = a.attnum
) as profile_user_id_has_unique_constraint;

-- SDD 00-05: object existence, permissions and columns only; no health records.
select current_setting('server_version_num')::integer>=150000 as supports_security_invoker_views;
select name,to_regclass('public.'||name) is not null as exists
from (values('craving_logs'),('push_subscriptions'),('nivo_push_deliveries'),
  ('nivo_buddy_invites'),('nivo_buddy_links'),('lessons'),('nivo_consultants'),('nivo_rooms'),('nivo_consultation_audit'),
  ('daily_logs'),('craving_events'),('journey_settings')) required(name);

select signature,to_regprocedure('public.'||signature) is not null as exists
from (values('daily_series(integer,text)'),('craving_by_hour(integer,text)'),('craving_by_trigger(integer)'),('journey_summary(text)'),
  ('nivo_update_profile(uuid,jsonb,integer,text,text)'),('nivo_claim_push(integer)'),('nivo_push_delivery_active(uuid)'),
  ('nivo_finish_push(uuid,integer)'),('nivo_create_buddy_invite(uuid,text,text[])'),('nivo_accept_buddy(text,uuid)'),
  ('nivo_buddy_summary(uuid,uuid)'),('nivo_revoke_buddy(uuid,uuid)')) required(signature);
-- Expected active lesson IDs seeded by the new schema: notice-wave, small-value, change-context.
-- Cron/Vault/VAPID and actual push delivery are OPTIONAL, separately configured; their absence is not a core schema failure.

select c.relname,c.relkind,c.reloptions,
  has_table_privilege('anon',c.oid,'SELECT') as anon_select,
  has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('daily_logs','craving_events','journey_settings');
-- Each projection must be a view, with security_invoker=true and security_barrier=true.

select c.relname,c.relrowsecurity as rls_enabled,
  has_table_privilege('anon',c.oid,'SELECT') as anon_select,
  has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_select,
  has_table_privilege('authenticated',c.oid,'INSERT') as authenticated_insert,
  has_table_privilege('authenticated',c.oid,'UPDATE') as authenticated_update,
  has_table_privilege('service_role',c.oid,'SELECT') as server_select
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('push_subscriptions','nivo_push_deliveries','nivo_buddy_invites','nivo_buddy_links','lessons','user_profile','craving_logs','daily_consumption');
-- Push/buddy relations: anon/authenticated privileges false. Lessons: authenticated SELECT only.
-- Journey: authenticated SELECT is now intentionally allowed through the owner-only RLS policy.

select tablename,policyname,roles,cmd,qual,with_check
from pg_policies where schemaname='public' and tablename in('nivo_journeys','user_profile','daily_consumption','craving_logs','lessons') order by tablename,policyname;

select p.proname,p.oid::regprocedure as signature,p.prosecdef as security_definer,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as server_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in('nivo_update_profile','daily_series','craving_by_hour','craving_by_trigger','journey_summary',
  'nivo_claim_push','nivo_push_delivery_active','nivo_finish_push','nivo_create_buddy_invite','nivo_accept_buddy','nivo_buddy_summary','nivo_revoke_buddy') order by p.proname;
-- Analytics: security_definer false/authenticated true. All mutations/worker/buddy RPCs: service-role only.

select table_name,column_name,data_type
from information_schema.columns where table_schema='public' and table_name in('user_profile','daily_logs','craving_events','journey_settings','push_subscriptions')
order by table_name,ordinal_position;

-- Existing custom signup triggers must be tested in staging after a reset, never silently dropped.
select t.tgname,p.proname as trigger_function,n.nspname as function_schema
from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace n on n.oid=p.pronamespace
where t.tgrelid='auth.users'::regclass and not t.tgisinternal;
