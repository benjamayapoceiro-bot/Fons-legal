create table if not exists public.case_documents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 matter_id uuid null references public.matters(id) on delete set null,
 original_name text not null,
 storage_path text not null,
 mime_type text not null,
 file_size bigint not null default 0,
 status text not null default 'uploaded' check (status in ('uploaded','ocr_processing','ocr_done','ocr_failed')),
 ocr_text text,
 ocr_language text not null default 'spa',
 ocr_engine text not null default 'tesseract.js-browser',
 ocr_error text,
 page_count integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists case_documents_user_created_idx on public.case_documents(user_id, created_at desc);
create index if not exists case_documents_matter_idx on public.case_documents(matter_id);
alter table public.case_documents enable row level security;
create policy "Users can read own case documents" on public.case_documents for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can insert own case documents" on public.case_documents for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update own case documents" on public.case_documents for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can delete own case documents" on public.case_documents for delete to authenticated using ((select auth.uid()) = user_id);
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-documents','case-documents',false,52428800,array['image/jpeg','image/png','image/webp','image/tiff','image/bmp'])
on conflict (id) do update set public=false, file_size_limit=52428800, allowed_mime_types=excluded.allowed_mime_types;
create policy "Users upload own case documents" on storage.objects for insert to authenticated with check (bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "Users read own case documents" on storage.objects for select to authenticated using (bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid()::text));
create policy "Users delete own case documents" on storage.objects for delete to authenticated using (bucket_id='case-documents' and (storage.foldername(name))[1]=(select auth.uid()::text));
