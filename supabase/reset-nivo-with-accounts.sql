-- DESTRUCTIVE: requested complete NIVO reset INCLUDING ALL LOGIN ACCOUNTS in this project.
-- This deletes every auth.users row (not just current NIVO users); existing login accounts stop working.
-- Linked Auth identities/sessions and ON DELETE CASCADE records follow their existing FK rules.
-- Does not drop auth/storage/public schemas or unrelated tables, and does not delete Storage files.
-- If an unrelated restrictive dependency exists, stop: the whole transaction rolls back.
-- Back up DB + Auth + Storage first, disable writes and push jobs, read RESET_AND_SCHEMA.md.
-- Run the whole file in the SQL Editor of the VERIFIED intended Supabase project only.
begin;
set local lock_timeout='10s';
set local statement_timeout='60s';

-- Supabase blocks deleting users who own Storage objects. Preserve files and stop safely.
do $$ declare col text; owned boolean; begin
  if to_regclass('storage.objects') is not null then
    foreach col in array array['owner','owner_id'] loop
      if exists(select 1 from pg_attribute where attrelid='storage.objects'::regclass and attname=col and not attisdropped) then
        execute format('select exists(select 1 from storage.objects o join auth.users u on o.%I::text=u.id::text)',col) into owned;
        if owned then raise exception 'Account reset stopped: users own Storage objects. Back up and reassign ownership through the supported Storage workflow before retrying; this script preserves every file.'; end if;
      end if;
    end loop;
  end if;
end $$;

-- Legacy NIVO projection depends on smoke_free_journey, user_stats and daily_consumption.
-- Drop the known view before its source tables; keep unrelated dependencies protected.
drop view if exists public.user_journey_stats;

do $$ declare n text; k "char"; begin
  foreach n in array array['daily_logs','craving_events','journey_settings'] loop
    select relkind into k from pg_class where oid=to_regclass('public.'||n);
    if k='v' then execute format('drop view public.%I',n);
    elsif k='r' then execute format('drop table public.%I',n);
    elsif k is not null then raise exception 'Unexpected object type for public.%',n; end if;
  end loop;
end $$;
drop table if exists public.nivo_buddy_links;
drop table if exists public.nivo_buddy_invites;
drop table if exists public.nivo_push_deliveries;
drop table if exists public.push_subscriptions;
drop table if exists public.nivo_journey_operations;
drop table if exists public.nivo_consultation_audit;
drop table if exists public.nivo_rooms;
drop table if exists public.nivo_consultants;
drop table if exists public.lessons;
drop table if exists public.vouchers;
drop table if exists public.reward_history;
drop table if exists public.user_rewards;
drop table if exists public.progress_tracking;
drop table if exists public.smoke_free_journey;
drop table if exists public.user_stats;
drop table if exists public.user_sessions;
drop table if exists public.craving_logs;
drop table if exists public.daily_consumption;
drop table if exists public.user_profile;
-- Do not manually delete auth.identities/sessions or modify the managed Auth schema.
delete from auth.users;
-- The known NIVO journey FK cascades account-owned health records; the table structure can stay.
notify pgrst,'reload schema';
commit;

-- Next run migrations/20261002_sdd_features.sql, then production-preflight.sql.
