-- WhatsApp-style statuses (24h ephemeral posts, one active status per user).
--
-- RLS follows the SECURITY DEFINER my_team_ids() pattern (same as the
-- conversations/messages recursion fix): team members can read a team's
-- statuses, only the author may post/delete their own.
-- Realtime publication so the stories strip updates live for everyone.

create table if not exists public.user_statuses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  team_id     uuid not null references public.teams (id) on delete cascade,
  text        text,
  media_url   text,
  media_type  text check (media_type in ('image') or media_type is null),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours')
);

create index if not exists user_statuses_team_active_idx
  on public.user_statuses (team_id, expires_at desc);

-- FK to profiles so PostgREST can embed the author's name/avatar
-- (select *, profile:profiles(name, avatar)) in the app's status queries.
alter table public.user_statuses
  add constraint user_statuses_profile_fk
  foreign key (user_id) references public.profiles (id)
  on delete cascade;

alter table public.user_statuses enable row level security;

drop policy if exists "Team members view statuses" on public.user_statuses;
create policy "Team members view statuses"
  on public.user_statuses for select
  to authenticated
  using (team_id in (select public.my_team_ids()));

drop policy if exists "Users post own status" on public.user_statuses;
create policy "Users post own status"
  on public.user_statuses for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and team_id in (select public.my_team_ids())
  );

drop policy if exists "Users delete own status" on public.user_statuses;
create policy "Users delete own status"
  on public.user_statuses for delete
  to authenticated
  using (user_id = auth.uid());

-- Live story-strip updates (insert/delete events)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_statuses'
  ) then
    alter publication supabase_realtime add table public.user_statuses;
  end if;
end $$;
