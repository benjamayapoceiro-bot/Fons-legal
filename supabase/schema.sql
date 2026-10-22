-- Esquema de referencia. El esquema inicial ya se aplicó al proyecto Supabase fons-legal.
create extension if not exists pgcrypto;
create table if not exists public.matters (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 court text, case_number text, title text not null, client_name text,
 status text not null default 'active' check (status in ('active','paused','closed')),
 source text, external_url text, notes text, last_checked_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.docket_events (
 id uuid primary key default gen_random_uuid(), matter_id uuid not null references public.matters(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, event_date timestamptz,
 description text not null, source text, verified_by_user boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.deadlines (
 id uuid primary key default gen_random_uuid(), matter_id uuid not null references public.matters(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, title text not null, due_at timestamptz not null,
 status text not null default 'pending' check (status in ('pending','verified','completed','cancelled')),
 verified_by_user boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.audit_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.matters enable row level security;
alter table public.docket_events enable row level security;
alter table public.deadlines enable row level security;
alter table public.audit_events enable row level security;
drop policy if exists "Users manage own matters" on public.matters;
create policy "Users manage own matters" on public.matters for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users manage own docket events" on public.docket_events;
create policy "Users manage own docket events" on public.docket_events for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users manage own deadlines" on public.deadlines;
create policy "Users manage own deadlines" on public.deadlines for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users read own audit events" on public.audit_events;
create policy "Users read own audit events" on public.audit_events for select using (auth.uid()=user_id);
drop policy if exists "Users insert own audit events" on public.audit_events;
create policy "Users insert own audit events" on public.audit_events for insert with check (auth.uid()=user_id);
create index if not exists matters_user_status_idx on public.matters(user_id,status);
create index if not exists docket_events_matter_date_idx on public.docket_events(matter_id,event_date desc);
create index if not exists deadlines_user_due_idx on public.deadlines(user_id,due_at) where status='pending';
