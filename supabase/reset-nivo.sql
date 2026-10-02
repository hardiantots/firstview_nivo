-- DESTRUCTIVE: removes NIVO profile/health/consultation/push/buddy records.
-- Preserves Auth accounts, Storage, unrelated objects and journey revision tombstones.
-- Back up first, disable writes/push jobs, read RESET_AND_SCHEMA.md. Do not run casually.
-- Execute this whole file together; any dependency error rolls back the transaction.
begin;
set local lock_timeout='10s';
set local statement_timeout='60s';

-- Explicit allowlist only, never DROP SCHEMA, never DROP ... CASCADE.
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

-- Clear health data while retaining monotonic revisions. Stale offline writes must conflict.
do $$ begin
  if to_regclass('public.nivo_journeys') is not null then
    update public.nivo_journeys set revision=revision+1,updated_at=now(),document=jsonb_build_object(
      'schema',1,'timezone','Asia/Makassar','targetQuitDate',null,'actualQuitDate',null,'daily','{}'::jsonb,
      'baselines','[]'::jsonb,'checkins','[]'::jsonb,'coping','[]'::jsonb,'feedback','[]'::jsonb,
      'slips','[]'::jsonb,'answers','[]'::jsonb,'history','[]'::jsonb,
      'preferences',jsonb_build_object('enabled',false,'consent',false,'time','19:00','maxPerDay',1,'pausedUntil',null,'followupDays','[]'::jsonb),
      'ownReason','','motivations','[]'::jsonb,'minutesToFirstCigarette',null,'reduceFirst',false,
      'rewardGoal','','insightsHidden',false,'cravingEvents','[]'::jsonb,'lessonCompletions','[]'::jsonb);
  end if;
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
notify pgrst,'reload schema';
commit;

-- Next run migrations/20261002_sdd_features.sql, then production-preflight.sql.
