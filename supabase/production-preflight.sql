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
