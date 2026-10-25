alter table public.clients add constraint clients_id_user_id_unique unique (id, user_id);
alter table public.matters add constraint matters_id_user_id_unique unique (id, user_id);
alter table public.matters add column if not exists client_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'matters_client_user_fkey') then
    alter table public.matters add constraint matters_client_user_fkey
      foreign key (client_id, user_id) references public.clients(id, user_id) on delete set null (client_id);
  end if;
end $$;
create index if not exists matters_user_client_idx on public.matters(user_id, client_id);
alter table public.case_documents add constraint case_documents_matter_user_fkey
  foreign key (matter_id, user_id) references public.matters(id, user_id) on delete set null (matter_id);
