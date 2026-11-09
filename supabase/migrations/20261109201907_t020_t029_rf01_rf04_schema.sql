-- ALMOX RF01-RF04 schema foundation (T020-T029)
-- Traceability: RNF02 (integrity/atomicity), RNF04 (auditability), RNF08 (versioned migrations),
-- RN05/RN14/RN15 (product/category rules), analysis sec. 7/11.

begin;

-- Extensions
create extension if not exists pgcrypto;

-- Domain helpers
create or replace function public.almox_normalize_name(value text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select nullif(btrim(regexp_replace(value, '\s+', ' ', 'g')), '');
$$;

create or replace function public.almox_normalize_sku(value text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select nullif(upper(btrim(regexp_replace(value, '\s+', ' ', 'g'))), '');
$$;

create or replace function public.almox_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (linked to Supabase Auth; no passwords duplicated)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'almox_role') then
    create type public.almox_role as enum ('admin', 'employee');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  role public.almox_role not null default 'employee',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_normalized check (display_name = btrim(regexp_replace(display_name, '\s+', ' ', 'g')))
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.almox_set_updated_at();

-- Categories (admin-maintained catalog)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  name_normalized text generated always as (public.almox_normalize_name(name)) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_normalized_ck check (name_normalized is not null)
);

create unique index if not exists categories_name_normalized_uidx on public.categories (name_normalized);
create index if not exists categories_active_idx on public.categories (active);

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.almox_set_updated_at();

-- Departments / destination sectors
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  name_normalized text generated always as (public.almox_normalize_name(name)) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_name_normalized_ck check (name_normalized is not null)
);

create unique index if not exists departments_name_normalized_uidx on public.departments (name_normalized);
create index if not exists departments_active_idx on public.departments (active);

create trigger trg_departments_updated_at
before update on public.departments
for each row execute function public.almox_set_updated_at();

-- Products (RN03/RN14; unit immutability after first movement enforced later - T045 hook)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null check (char_length(btrim(sku)) between 1 and 64),
  sku_normalized text generated always as (public.almox_normalize_sku(sku)) stored,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text null check (description is null or char_length(description) <= 2000),
  category_id uuid not null references public.categories(id) on delete restrict,
  unit text not null default 'UN' check (unit in ('UN', 'CX', 'KG', 'L', 'M')),
  minimum_stock numeric(14,3) not null default 0 check (minimum_stock >= 0),
  location text null check (location is null or char_length(btrim(location)) <= 120),
  active boolean not null default true,
  first_movement_at timestamptz null, -- T045/RN14: set by movements; unit lock hook
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sku_normalized_ck check (sku_normalized is not null),
  constraint products_unit_discrete_ck check (
    (unit in ('UN', 'CX') and minimum_stock = trunc(minimum_stock))
    or (unit in ('KG', 'L', 'M'))
  )
);

create unique index if not exists products_sku_normalized_uidx on public.products (sku_normalized);
create index if not exists products_name_idx on public.products (name);
create index if not exists products_category_active_idx on public.products (category_id, active);
create index if not exists products_active_idx on public.products (active);

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.almox_set_updated_at();

-- Stock balance projection (RN05/RN06 foundation)
create table if not exists public.stock_balances (
  product_id uuid primary key references public.products(id) on delete restrict,
  quantity numeric(14,3) not null default 0 check (quantity >= 0),
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now()
);

create trigger trg_stock_balances_updated_at
before update on public.stock_balances
for each row execute function public.almox_set_updated_at();

-- Audit events (RNF04/RNF10). Insert by controlled DB path; no client update/delete.
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null references public.profiles(id) on delete restrict,
  action text not null check (action in ('INSERT', 'UPDATE', 'INACTIVATE', 'REACTIVATE')),
  entity_type text not null check (char_length(entity_type) between 1 and 64),
  entity_id uuid not null,
  before_data jsonb null,
  after_data jsonb null,
  operation_key text null,
  recorded_at timestamptz not null default now()
);

create index if not exists audit_events_entity_idx on public.audit_events (entity_type, entity_id);
create index if not exists audit_events_actor_idx on public.audit_events (actor_id);
create index if not exists audit_events_recorded_at_idx on public.audit_events (recorded_at desc);

commit;
