-- Rascunhos do criador de páginas. O conteúdo publicado continua em
-- app_settings, que é a fonte pública já usada pela plataforma.
create table if not exists public.page_builder_drafts (
  page_key text primary key,
  document jsonb not null,
  revision bigint not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint page_builder_drafts_page_key_check
    check (page_key in ('public-home', 'no-products')),
  constraint page_builder_drafts_revision_check check (revision > 0),
  constraint page_builder_drafts_document_object_check
    check (jsonb_typeof(document) = 'object')
);

drop trigger if exists set_updated_at on public.page_builder_drafts;
create trigger set_updated_at
  before update on public.page_builder_drafts
  for each row execute function public.touch_updated_at();

alter table public.page_builder_drafts enable row level security;

drop policy if exists "Admins leem rascunhos de paginas" on public.page_builder_drafts;
create policy "Admins leem rascunhos de paginas"
  on public.page_builder_drafts for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins criam rascunhos de paginas" on public.page_builder_drafts;
create policy "Admins criam rascunhos de paginas"
  on public.page_builder_drafts for insert
  to authenticated
  with check ((select public.is_admin()) and updated_by = (select auth.uid()));

drop policy if exists "Admins atualizam rascunhos de paginas" on public.page_builder_drafts;
create policy "Admins atualizam rascunhos de paginas"
  on public.page_builder_drafts for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()) and updated_by = (select auth.uid()));

revoke all on table public.page_builder_drafts from public, anon;
grant select, insert, update on table public.page_builder_drafts to authenticated;
grant all on table public.page_builder_drafts to service_role;
