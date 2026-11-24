-- Global application flags (admin-managed, read by authenticated clients).
-- Service role writes only; no client insert/update/delete policies.
create table if not exists public.app_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.app_flags enable row level security;

create policy "Authenticated users can read app flags"
  on public.app_flags for select
  to authenticated
  using (true);

insert into public.app_flags (key, enabled)
values ('holiday_mode', false)
on conflict (key) do nothing;
