-- Discover: only recipes the owner publishes (admin mode). The app never fills this on its own.
-- Only the Edge Function (server key) reads or writes these tables; the app's public key can't.

create extension if not exists pgcrypto;

create table if not exists public.discover_recipes (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,            -- sha256 of the link in one form
  source_url text not null,                   -- the original video or page
  source text not null default 'web',         -- tiktok | youtube | instagram | web
  title text not null,
  image_url text,                             -- in the public discover-photos bucket
  crop jsonb,                                 -- { x, y, w, h }: the part of the photo shown on cards
  creator_handle text not null,               -- always shown: "Recipe by @creator"
  creator_url text,
  tags text[] not null default '{}',
  cuisine text,
  meal_type text,
  diet text[] not null default '{}',
  ingredient_names text not null default '',  -- for search and the ingredient filter
  recipe jsonb not null,                      -- the recipe (steps rewritten in the app's own words)
  status text not null default 'published' check (status in ('published', 'reported', 'unpublished', 'removed')),
  save_count integer not null default 0,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists discover_recipes_status on public.discover_recipes (status, published_at desc);

-- One row per save: the time only. Nobody's name, account or device.
create table if not exists public.discover_saves (
  id bigint generated always as identity primary key,
  discover_id uuid not null references public.discover_recipes (id) on delete cascade,
  saved_at timestamptz not null default now()
);
create index if not exists discover_saves_recent on public.discover_saves (saved_at, discover_id);

-- Reports from users: the reason only. A reported recipe is hidden until the owner reviews it.
create table if not exists public.discover_reports (
  id uuid primary key default gen_random_uuid(),
  discover_id uuid not null references public.discover_recipes (id) on delete cascade,
  reason text not null check (reason in ('wrong_recipe', 'not_food', 'creator')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text
);

alter table public.discover_recipes enable row level security;
alter table public.discover_saves enable row level security;
alter table public.discover_reports enable row level security;
-- No policies: the public key can't read or write; everything goes through the Edge Function.

-- +1 save, counted in one step; returns the new total.
create or replace function public.discover_add_save(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v integer;
begin
  insert into discover_saves (discover_id) values (p_id);
  update discover_recipes set save_count = save_count + 1 where id = p_id returning save_count into v;
  return v;
end;
$$;

-- Saves per recipe in the last 7 days ("Most popular this week").
create or replace function public.discover_week_saves()
returns table (discover_id uuid, saves bigint)
language sql
security definer
set search_path = public
as $$
  select discover_id, count(*) from discover_saves where saved_at > now() - interval '7 days' group by discover_id;
$$;

revoke all on function public.discover_add_save(uuid) from public, anon, authenticated;
revoke all on function public.discover_week_saves() from public, anon, authenticated;

-- Photos of published recipes: a public bucket (anyone can view a photo by its link; only the
-- Edge Function can upload).
insert into storage.buckets (id, name, public)
values ('discover-photos', 'discover-photos', true)
on conflict (id) do nothing;
