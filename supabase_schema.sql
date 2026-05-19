-- Supabase Dashboard > SQL Editor에서 실행하세요

-- 사용자 프로필
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null,
  avatar_url text,
  spotify_access_token text,
  spotify_refresh_token text,
  spotify_connected_at timestamptz,
  updated_at timestamptz default now()
);

-- 캔버스 상태
create table if not exists canvas_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade unique,
  nodes jsonb default '[]',
  links jsonb default '[]',
  genres jsonb default '[]',
  updated_at timestamptz default now()
);

-- Row Level Security
alter table profiles enable row level security;
alter table canvas_state enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can read own canvas"
  on canvas_state for select using (auth.uid() = user_id);

create policy "Users can upsert own canvas"
  on canvas_state for all using (auth.uid() = user_id);
