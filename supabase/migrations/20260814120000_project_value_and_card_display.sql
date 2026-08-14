-- Project Value & Configurable Card Display (additive).
--
-- Extends the existing projects table with an optional financial value +
-- visibility config + per-project card-display config, plus a narrow
-- value-only audit table mirroring task_activity's proven shape.
--
-- Enforcement note: value/currency are deliberately NOT exposed via RLS
-- alone (RLS is row-level, and the existing SELECT policy already lets
-- every team member read every other column of a project row). Real
-- enforcement lives in get_project_value() below, a SECURITY DEFINER RPC
-- that is the only path the app uses to read these two columns — the bulk
-- projects.fetchAll query (src/lib/dataService.ts) is changed in this same
-- pass to stop selecting them at all.

alter table public.projects
  add column if not exists value numeric,
  add column if not exists currency text default 'ZAR',
  add column if not exists value_visibility text default 'admins'
    check (value_visibility in ('admins', 'managers', 'team', 'selected')),
  add column if not exists value_visible_user_ids uuid[],
  add column if not exists card_display jsonb;

create table if not exists public.project_value_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  project_name text not null,
  team_id uuid,
  actor_id uuid not null,
  actor_name text not null,
  old_value numeric,
  old_currency text,
  new_value numeric,
  new_currency text,
  created_at timestamptz not null default now()
);

alter table public.project_value_history enable row level security;

drop policy if exists "value history visible to actor, team members, admins" on public.project_value_history;
create policy "value history visible to actor, team members, admins"
  on public.project_value_history for select
  using (
    actor_id = auth.uid()
    or team_id in (select team_id from public.team_members where user_id = auth.uid())
    or is_admin_or_manager()
  );

drop policy if exists "actor can insert their own value history" on public.project_value_history;
create policy "actor can insert their own value history"
  on public.project_value_history for insert
  with check (actor_id = auth.uid());

-- The sole authorized read path for value/currency. Returns nulls when the
-- caller isn't authorized rather than erroring, so the UI can treat "no
-- value shown" uniformly whether a project has no value set or the viewer
-- just isn't permitted to see it.
create or replace function public.get_project_value(p_project_id uuid)
returns table(value numeric, currency text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visibility text;
  v_visible_ids uuid[];
  v_value numeric;
  v_currency text;
  v_authorized boolean := false;
begin
  select value_visibility, value_visible_user_ids, projects.value, projects.currency
    into v_visibility, v_visible_ids, v_value, v_currency
  from public.projects
  where id = p_project_id
    and (
      team_id in (select team_id from public.team_members where user_id = auth.uid())
      or created_by = auth.uid()
      or is_admin_or_manager()
    );

  if not found then
    return query select null::numeric, null::text;
    return;
  end if;

  if is_admin_or_manager() then
    v_authorized := true;
  elsif v_visibility = 'managers' then
    v_authorized := false; -- non-admin/manager callers never qualify for 'managers'
  elsif v_visibility = 'team' then
    v_authorized := true;
  elsif v_visibility = 'selected' then
    v_authorized := auth.uid() = any(coalesce(v_visible_ids, array[]::uuid[]));
  else
    v_authorized := false; -- 'admins' (default) — only is_admin_or_manager() above qualifies
  end if;

  if v_authorized then
    return query select v_value, v_currency;
  else
    return query select null::numeric, null::text;
  end if;
end;
$$;

grant execute on function public.get_project_value(uuid) to authenticated;
