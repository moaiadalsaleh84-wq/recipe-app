-- Reusing imports: the same link is read by the AI only once, for everyone.
-- Holds the recipe as read from the public source and NOTHING about who imported it
-- (no user id, device, name or IP). Only the Edge Function (server key) can read or write it;
-- it is never listed or shown to users. Each import becomes the user's own private copy.

create table if not exists public.shared_recipes (
  key text primary key,                       -- sha256 of the link in one form
  source_url text not null,                   -- the link in one form (public)
  result jsonb not null,                      -- the recipe as returned to the app
  reuse_count integer not null default 0,     -- AI calls saved (a number only)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shared_recipes enable row level security;
-- No policies: with RLS on and no policies, the app's public key can't read or write it.

create or replace function public.shared_recipe_reused(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update shared_recipes set reuse_count = reuse_count + 1 where key = p_key;
$$;

revoke all on function public.shared_recipe_reused(text) from public, anon, authenticated;
