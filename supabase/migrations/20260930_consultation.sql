begin;
create table if not exists public.nivo_consultants (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null, credentials text not null, verified_at timestamptz,
 environment text not null check(environment in ('test','production')), available_until timestamptz,
 role text not null default 'consultant' check(role in ('consultant','admin'))
);
create table if not exists public.nivo_rooms (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 consultant_id uuid not null references auth.users(id) on delete cascade,
 revision integer not null, document jsonb not null, expires_at timestamptz not null
);
create table if not exists public.nivo_consultation_audit (
 id bigint generated always as identity primary key, actor uuid not null,
 room uuid, action text not null, at timestamptz not null default now()
);
alter table public.nivo_consultants enable row level security;
alter table public.nivo_rooms enable row level security;
alter table public.nivo_consultation_audit enable row level security;
revoke all on public.nivo_consultants,public.nivo_rooms,public.nivo_consultation_audit from public,anon,authenticated;
grant all on public.nivo_consultants,public.nivo_rooms,public.nivo_consultation_audit to service_role;
grant usage,select on sequence public.nivo_consultation_audit_id_seq to service_role;
create or replace function public.nivo_commit_room(p_id uuid,p_user uuid,p_consultant uuid,p_expected integer,p_document jsonb,p_expires timestamptz)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare current_revision integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,32));
 select revision into current_revision from public.nivo_rooms where id=p_id for update;
 if coalesce(current_revision,0) <> p_expected or p_expires <= now() then return false; end if;
 if pg_column_size(p_document)>1500000 then raise exception 'room_too_large'; end if;
 insert into public.nivo_rooms(id,user_id,consultant_id,revision,document,expires_at)
 values(p_id,p_user,p_consultant,p_expected+1,p_document,p_expires)
 on conflict(id) do update set revision=excluded.revision,document=excluded.document;
 return true;
end $$;
revoke all on function public.nivo_commit_room(uuid,uuid,uuid,integer,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.nivo_commit_room(uuid,uuid,uuid,integer,jsonb,timestamptz) to service_role;
-- Schedule this service-role-only RPC at least hourly before enabling the service.
create or replace function public.nivo_purge_consultation() returns void language sql security definer set search_path=public,pg_temp as $$
 delete from public.nivo_rooms where expires_at <= now();
 update public.nivo_rooms set document=jsonb_set(document,'{signals}','[]'::jsonb), revision=revision+1
 where jsonb_array_length(document->'signals')>0 and not exists (
   select 1 from jsonb_array_elements(document->'signals') s where (s->>'at')::timestamptz > now()-interval '2 minutes');
 delete from public.nivo_consultation_audit where at < now()-interval '30 days';
$$;
revoke all on function public.nivo_purge_consultation() from public,anon,authenticated;
grant execute on function public.nivo_purge_consultation() to service_role;
commit;
