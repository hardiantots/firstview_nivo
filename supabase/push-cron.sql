-- OPTIONAL ACTIVATION ONLY. Do not run as part of the core migration/reset.
-- Enable pg_cron/pg_net/Vault in the dashboard; deploy functions/nivo-push first.
-- Store Vault names via the dashboard (never commit their values):
--   nivo_push_url = https://<verified-project>.supabase.co/functions/v1/nivo-push
--   nivo_push_cron_secret = the SAME random >=32-character NIVO_PUSH_CRON_SECRET used by the function.
-- Configure the function's VAPID keys/contact and test delivery with explicit opt-in first.
-- Read PUSH_ACTIVATION.md / RESET_AND_SCHEMA.md before activating.
begin;
do $$ declare function_url text; cron_secret text; begin
  if to_regclass('cron.job') is null or to_regclass('vault.decrypted_secrets') is null or not exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname='http_post') then
    raise exception 'Enable pg_cron, pg_net and Vault before activation';
  end if;
  select decrypted_secret into function_url from vault.decrypted_secrets where name='nivo_push_url';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name='nivo_push_cron_secret';
  if function_url is null or function_url !~ '^https://[a-z0-9-]+\.supabase\.co/functions/v1/nivo-push$'
    or cron_secret is null or char_length(cron_secret) not between 32 and 256 then raise exception 'Missing or invalid push Vault configuration'; end if;
end $$;

select cron.schedule('nivo-push-every-5-minutes','*/5 * * * *',$job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='nivo_push_url'),
    headers:=jsonb_build_object('Content-Type','application/json',
      'x-nivo-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='nivo_push_cron_secret')),
    body:='{}'::jsonb,timeout_milliseconds:=10000);
$job$);

-- Remove delivery metadata after its idempotency window; nothing contains message text or health notes.
select cron.schedule('nivo-push-retention','15 2 * * *',$job$
  delete from public.nivo_push_deliveries where local_date<(now() at time zone 'UTC')::date-30;
$job$);
commit;

-- To disable manually before maintenance/reset (run only these SELECTs):
-- select cron.unschedule('nivo-push-every-5-minutes');
-- select cron.unschedule('nivo-push-retention');
