-- ALMOX RF03/RF04 domain logic (T040-T045)
-- Atomic product creation (RN05/RNF02), RN14/RN15 guards, selection integrity.

begin;

-- T044: prevent associating/inactivating via invalid states at DB level where feasible
create or replace function public.almox_guard_product_category_active()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') and new.category_id is not null then
    if not exists (select 1 from public.categories c where c.id = new.category_id and c.active = true) then
      raise exception 'CATEGORY_INACTIVE_OR_NOT_FOUND' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_category_active on public.products;
create trigger trg_products_category_active
before insert or update of category_id on public.products
for each row execute function public.almox_guard_product_category_active();

-- T042: inactivate product only when balance is zero (RN15)
create or replace function public.almox_guard_product_inactivation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_qty numeric(14,3);
begin
  if tg_op = 'UPDATE' and old.active = true and new.active = false then
    select sb.quantity into v_qty from public.stock_balances sb where sb.product_id = old.id;
    if coalesce(v_qty, 0) <> 0 then
      raise exception 'PRODUCT_INACTIVATION_REQUIRES_ZERO_BALANCE' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_inactivation_guard on public.products;
create trigger trg_products_inactivation_guard
before update of active on public.products
for each row execute function public.almox_guard_product_inactivation();

-- T043: category inactivation refused when referenced by active products (RN15)
create or replace function public.almox_guard_category_inactivation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.active = true and new.active = false then
    if exists (select 1 from public.products p where p.category_id = old.id and p.active = true) then
      raise exception 'CATEGORY_HAS_ACTIVE_PRODUCTS' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_categories_inactivation_guard on public.categories;
create trigger trg_categories_inactivation_guard
before update of active on public.categories
for each row execute function public.almox_guard_category_inactivation();

-- T045 hook: unit immutable after first movement (first_movement_at set by future RF07+ flows)
create or replace function public.almox_guard_product_unit_lock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.first_movement_at is not null and new.unit is distinct from old.unit then
    raise exception 'PRODUCT_UNIT_LOCKED_AFTER_FIRST_MOVEMENT' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_products_unit_lock on public.products;
create trigger trg_products_unit_lock
before update of unit on public.products
for each row execute function public.almox_guard_product_unit_lock();

-- T040: atomic product + zero balance creation (admin only)
create or replace function public.almox_create_product(
  p_sku text,
  p_name text,
  p_description text,
  p_category_id uuid,
  p_unit text,
  p_minimum_stock numeric,
  p_location text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_product_id uuid;
begin
  if not public.almox_is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.products (sku, name, description, category_id, unit, minimum_stock, location, active)
  values (
    btrim(p_sku),
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_category_id,
    p_unit,
    coalesce(p_minimum_stock, 0),
    nullif(btrim(coalesce(p_location, '')), ''),
    true
  )
  returning id into v_product_id;

  insert into public.stock_balances (product_id, quantity, version)
  values (v_product_id, 0, 0);

  return v_product_id;
end;
$$;

revoke all on function public.almox_create_product(text,text,text,uuid,text,numeric,text) from public;
grant execute on function public.almox_create_product(text,text,text,uuid,text,numeric,text) to authenticated;

commit;
