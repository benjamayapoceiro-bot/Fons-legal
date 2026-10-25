create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 180),
  kind text not null default 'person' check (kind in ('person','company')),
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_user_id_name_idx on public.clients(user_id, lower(name));
alter table public.clients enable row level security;
drop policy if exists "clients_select_own" on public.clients;
create policy "clients_select_own" on public.clients for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "clients_insert_own" on public.clients;
create policy "clients_insert_own" on public.clients for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "clients_update_own" on public.clients;
create policy "clients_update_own" on public.clients for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_delete_own" on public.clients for delete to authenticated using ((select auth.uid()) = user_id);
