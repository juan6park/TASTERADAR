-- ============================================================
-- Taste Radar — Initial schema
-- Applied: 2026-05-26
-- Tables: profiles, canvas_state
-- RLS: enabled on both, user_id-scoped policies
-- ============================================================

-- ── profiles ─────────────────────────────────────────────────
create table if not exists profiles (
  id                    uuid primary key references auth.users on delete cascade,
  nickname              text not null,
  avatar_url            text,
  spotify_access_token  text,
  spotify_refresh_token text,
  spotify_connected_at  timestamptz,
  updated_at            timestamptz default now()
);

alter table profiles enable row level security;

-- SELECT: own row only
do $$ begin
  create policy "profiles_select_own"
    on profiles for select
    using (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- INSERT: own row only
do $$ begin
  create policy "profiles_insert_own"
    on profiles for insert
    with check (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- UPDATE: own row only
do $$ begin
  create policy "profiles_update_own"
    on profiles for update
    using (auth.uid() = id);
exception when duplicate_object then null; end $$;

-- DELETE: own row only
do $$ begin
  create policy "profiles_delete_own"
    on profiles for delete
    using (auth.uid() = id);
exception when duplicate_object then null; end $$;


-- ── canvas_state ──────────────────────────────────────────────
create table if not exists canvas_state (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references auth.users on delete cascade unique,
  nodes      jsonb       default '[]',
  links      jsonb       default '[]',
  genres     jsonb       default '[]',
  updated_at timestamptz default now()
);

alter table canvas_state enable row level security;

-- ALL operations: own rows only (covers SELECT / INSERT / UPDATE / DELETE)
do $$ begin
  create policy "canvas_state_all_own"
    on canvas_state for all
    using      (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;


-- ── Helper: auto-update updated_at on row change ─────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_set_updated_at    on profiles;
drop trigger if exists canvas_state_set_updated_at on canvas_state;

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger canvas_state_set_updated_at
  before update on canvas_state
  for each row execute function set_updated_at();
