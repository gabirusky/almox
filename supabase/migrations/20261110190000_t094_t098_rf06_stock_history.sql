-- ALMOX RF06 / RNF01 / RNF04 / RNF08 - append-only stock history foundation.
-- Writes will be enabled only through future RF07-RF10 domain functions.

begin;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  actor_id uuid null references public.profiles(id) on delete restrict,
  kind text not null check (kind in ('ENTRADA', 'SAIDA', 'ABERTURA', 'AJUSTE', 'ESTORNO')),
  delta numeric(14,3) not null check (delta <> 0),
  balance_before numeric(14,3) not null check (balance_before >= 0),
  balance_after numeric(14,3) not null check (balance_after >= 0),
  product_version integer not null check (product_version > 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  origin text null check (origin is null or char_length(btrim(origin)) <= 240),
  department_id uuid null references public.departments(id) on delete restrict,
  recipient_ref text null check (recipient_ref is null or char_length(btrim(recipient_ref)) <= 240),
  document_ref text null check (document_ref is null or char_length(btrim(document_ref)) <= 240),
  reversal_of uuid null references public.stock_movements(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  snapshots jsonb not null default '{}'::jsonb,
  constraint stock_movements_balance_equation_ck check (balance_after = balance_before + delta),
  constraint stock_movements_snapshot_object_ck check (jsonb_typeof(snapshots) = 'object')
);

create unique index if not exists stock_movements_reversal_uidx
  on public.stock_movements (reversal_of)
  where reversal_of is not null;
create unique index if not exists stock_movements_product_version_uidx
  on public.stock_movements (product_id, product_version);
create index if not exists stock_movements_product_recorded_idx
  on public.stock_movements (product_id, recorded_at, id);
create index if not exists stock_movements_actor_idx
  on public.stock_movements (actor_id);
create index if not exists stock_movements_department_idx
  on public.stock_movements (department_id);
create index if not exists stock_movements_kind_idx
  on public.stock_movements (kind);

alter table public.stock_movements enable row level security;

drop policy if exists stock_movements_select_active_users on public.stock_movements;
create policy stock_movements_select_active_users on public.stock_movements
for select to authenticated
using (public.almox_is_active_user());

revoke insert, update, delete, truncate on public.stock_movements from anon, authenticated;

commit;
