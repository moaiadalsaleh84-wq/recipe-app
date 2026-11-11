-- Rate limits and result cache for the import-recipe Edge Function.
-- Only the function (service role) touches these tables; the app never does.

create table if not exists public.import_hits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create table if not exists public.import_cache (
  key text primary key,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.import_hits enable row level security;
alter table public.import_cache enable row level security;
-- No policies: with RLS on and no policies, the public (anon) key can't read or write them.

-- Atomically count one hit in a fixed window and report whether it's within the limit.
create or replace function public.import_hit(p_key text, p_window_seconds integer, p_max integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into import_hits (key, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set count = import_hits.count + 1
  returning count into v_count;

  return json_build_object(
    'allowed', v_count <= p_max,
    'count', v_count,
    'reset_in', ceil(extract(epoch from (v_start + make_interval(secs => p_window_seconds) - now())))::integer
  );
end;
$$;

revoke all on function public.import_hit(text, integer, integer) from public, anon, authenticated;

-- Housekeeping: old windows and stale cache rows. Run daily (Supabase: Database > Cron).
create or replace function public.import_cleanup()
returns void
language sql
security definer
set search_path = public
as $$
  delete from import_hits where window_start < now() - interval '2 days';
  delete from import_cache where created_at < now() - interval '7 days';
$$;

revoke all on function public.import_cleanup() from public, anon, authenticated;
