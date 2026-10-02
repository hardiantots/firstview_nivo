-- Additive migration. Review and run in staging first; no destructive legacy cutover.
begin;
create table if not exists public.nivo_journeys (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null default 0,
  document jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.nivo_journey_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  request jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id, operation_id)
);
alter table public.nivo_journeys enable row level security;
alter table public.nivo_journey_operations enable row level security;
-- All access is through authenticated Next server endpoints, including reads/exports.
revoke all on public.nivo_journeys, public.nivo_journey_operations from anon, authenticated;
grant all on public.nivo_journeys, public.nivo_journey_operations to service_role;

create or replace function public.nivo_commit_journey(p_user uuid, p_operation uuid, p_expected integer, p_request jsonb, p_document jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare current_row public.nivo_journeys; previous_request jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text, 31));
  select * into current_row from public.nivo_journeys where user_id = p_user for update;
  select request into previous_request from public.nivo_journey_operations where user_id = p_user and operation_id = p_operation;
  if found then
    if previous_request <> p_request then return jsonb_build_object('error','id_reused'); end if;
    return jsonb_build_object('revision',current_row.revision,'state',current_row.document,'replayed',true);
  end if;
  if coalesce(current_row.revision,0) <> p_expected then return jsonb_build_object('error','conflict'); end if;
  if p_document is null or pg_column_size(p_document) > 2000000 or p_document->>'schema' is distinct from '1' then raise exception 'invalid_document'; end if;
  insert into public.nivo_journeys(user_id,revision,document) values(p_user,p_expected+1,p_document)
    on conflict(user_id) do update set revision=excluded.revision, document=excluded.document, updated_at=now();
  insert into public.nivo_journey_operations(user_id,operation_id,request) values(p_user,p_operation,p_request);
  return jsonb_build_object('revision',p_expected+1,'state',p_document);
end $$;
revoke all on function public.nivo_commit_journey(uuid,uuid,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.nivo_commit_journey(uuid,uuid,integer,jsonb,jsonb) to service_role;

create or replace function public.nivo_delete_journey(p_user uuid, p_expected integer, p_empty jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,31));
  if coalesce((select revision from public.nivo_journeys where user_id=p_user),0) <> p_expected then return false; end if;
  delete from public.nivo_journey_operations where user_id=p_user;
  -- Keep only an empty document and monotonic revision: stale offline writes must conflict.
  insert into public.nivo_journeys(user_id,revision,document) values(p_user,p_expected+1,p_empty)
    on conflict(user_id) do update set revision=excluded.revision,document=excluded.document,updated_at=now();
  return true;
end $$;
revoke all on function public.nivo_delete_journey(uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.nivo_delete_journey(uuid,integer,jsonb) to service_role;
commit;
