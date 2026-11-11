-- ALMOX RF10/RF11: optimistic physical-count adjustment and filtered history.
begin;

create or replace function public.almox_adjust_stock_by_count(
  p_product_id uuid,
  p_counted_quantity numeric,
  p_expected_version integer,
  p_reason text,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_product public.products;
  v_balance public.stock_balances;
  v_command public.stock_commands;
  v_hash text;
  v_delta numeric;
  v_result jsonb;
  v_movement_id uuid;
begin
  if not public.almox_is_active_user() then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;
  if not public.almox_is_admin() then
    raise exception 'STOCK_ADJUSTMENT_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_operation_key is null or char_length(btrim(p_operation_key)) not between 1 and 120 then
    raise exception 'OPERATION_KEY_INVALID' using errcode = 'P0001';
  end if;
  if p_expected_version is null or p_expected_version < 0 then
    raise exception 'STOCK_VERSION_INVALID' using errcode = 'P0001';
  end if;
  if p_counted_quantity is null or p_counted_quantity < 0
     or p_counted_quantity > 99999999999.999
     or p_counted_quantity <> round(p_counted_quantity, 3) then
    raise exception 'COUNTED_QUANTITY_INVALID' using errcode = 'P0001';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'ADJUSTMENT_REASON_INVALID' using errcode = 'P0001';
  end if;

  v_hash := encode(digest(jsonb_build_object(
    'kind', 'AJUSTE', 'product_id', p_product_id,
    'counted_quantity', p_counted_quantity,
    'expected_version', p_expected_version, 'reason', btrim(p_reason)
  )::text, 'sha256'), 'hex');
  insert into public.stock_commands(actor_id, operation_key, request_hash)
  values(v_actor, btrim(p_operation_key), v_hash)
  on conflict(actor_id, operation_key) do nothing;
  select * into v_command from public.stock_commands
  where actor_id = v_actor and operation_key = btrim(p_operation_key) for update;
  if v_command.request_hash <> v_hash then
    raise exception 'OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT' using errcode = 'P0001';
  end if;
  if v_command.result is not null then return v_command.result; end if;

  -- Shared lock order: operation command -> product -> stock balance.
  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001'; end if;
  if not v_product.active then raise exception 'PRODUCT_INACTIVE' using errcode = 'P0001'; end if;
  if v_product.unit in ('UN', 'CX') and p_counted_quantity <> trunc(p_counted_quantity) then
    raise exception 'COUNTED_QUANTITY_MUST_BE_INTEGER' using errcode = 'P0001';
  end if;
  select * into v_balance from public.stock_balances where product_id = p_product_id for update;
  if not found then raise exception 'STOCK_BALANCE_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_balance.version <> p_expected_version then
    raise exception 'STOCK_VERSION_CHANGED' using errcode = 'P0001';
  end if;
  v_delta := p_counted_quantity - v_balance.quantity;
  if v_delta = 0 then raise exception 'COUNT_MATCHES_CURRENT_STOCK' using errcode = 'P0001'; end if;

  insert into public.stock_movements(
    product_id, actor_id, kind, delta, balance_before, balance_after,
    product_version, reason, snapshots
  ) values (
    v_product.id, v_actor, 'AJUSTE', v_delta, v_balance.quantity,
    p_counted_quantity, v_balance.version + 1, btrim(p_reason),
    jsonb_build_object(
      'sku', v_product.sku, 'name', v_product.name, 'unit', v_product.unit,
      'actor_name', (select display_name from public.profiles where id = v_actor),
      'counted_quantity', p_counted_quantity,
      'counted_from_version', p_expected_version
    )
  ) returning id into v_movement_id;
  update public.stock_balances
  set quantity = p_counted_quantity, version = v_balance.version + 1
  where product_id = p_product_id;
  update public.products set first_movement_at = coalesce(first_movement_at, now())
  where id = p_product_id;

  v_result := jsonb_build_object(
    'movement_id', v_movement_id, 'product_id', v_product.id,
    'delta', v_delta::text, 'balance', p_counted_quantity::text,
    'version', v_balance.version + 1, 'kind', 'AJUSTE'
  );
  update public.stock_commands set result = v_result, completed_at = now()
  where actor_id = v_actor and operation_key = btrim(p_operation_key);
  return v_result;
end;
$$;
revoke all on function public.almox_adjust_stock_by_count(uuid,numeric,integer,text,text) from public;
grant execute on function public.almox_adjust_stock_by_count(uuid,numeric,integer,text,text) to authenticated;

create or replace function public.almox_search_stock_movements(
  p_from timestamptz default null,
  p_to_exclusive timestamptz default null,
  p_product text default null,
  p_kind text default null,
  p_actor text default null,
  p_department text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_total bigint;
  v_items jsonb;
  v_product text := nullif(btrim(p_product), '');
  v_actor text := nullif(btrim(p_actor), '');
  v_department text := nullif(btrim(p_department), '');
begin
  if not public.almox_is_active_user() then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;
  if p_page is null or p_page < 1 or p_page_size is null or p_page_size not between 1 and 100 then
    raise exception 'MOVEMENT_PAGE_INVALID' using errcode = 'P0001';
  end if;
  if p_from is not null and p_to_exclusive is not null and p_to_exclusive <= p_from then
    raise exception 'MOVEMENT_DATE_RANGE_INVALID' using errcode = 'P0001';
  end if;
  if p_kind is not null and p_kind not in ('ENTRADA','SAIDA','ABERTURA','AJUSTE','ESTORNO') then
    raise exception 'MOVEMENT_KIND_INVALID' using errcode = 'P0001';
  end if;

  select count(*) into v_total
  from public.stock_movements m
  join public.products p on p.id = m.product_id
  where (p_from is null or m.recorded_at >= p_from)
    and (p_to_exclusive is null or m.recorded_at < p_to_exclusive)
    and (p_kind is null or m.kind = p_kind)
    and (v_product is null or m.snapshots->>'sku' ilike '%' || v_product || '%'
      or m.snapshots->>'name' ilike '%' || v_product || '%')
    and (v_actor is null or m.snapshots->>'actor_name' ilike '%' || v_actor || '%')
    and (v_department is null or m.snapshots->>'department_name' ilike '%' || v_department || '%');

  select coalesce(jsonb_agg(
    to_jsonb(page_rows) || jsonb_build_object(
      'reversed_by', (select reversal.id from public.stock_movements reversal where reversal.reversal_of = page_rows.id limit 1)
    ) order by page_rows.recorded_at desc, page_rows.id desc
  ), '[]'::jsonb) into v_items
  from (
    select m.*, p.sku as product_sku, p.name as product_name, p.unit as product_unit
    from public.stock_movements m
    join public.products p on p.id = m.product_id
    where (p_from is null or m.recorded_at >= p_from)
      and (p_to_exclusive is null or m.recorded_at < p_to_exclusive)
      and (p_kind is null or m.kind = p_kind)
      and (v_product is null or m.snapshots->>'sku' ilike '%' || v_product || '%'
        or m.snapshots->>'name' ilike '%' || v_product || '%')
      and (v_actor is null or m.snapshots->>'actor_name' ilike '%' || v_actor || '%')
      and (v_department is null or m.snapshots->>'department_name' ilike '%' || v_department || '%')
    order by m.recorded_at desc, m.id desc
    limit p_page_size offset (p_page - 1) * p_page_size
  ) page_rows;
  return jsonb_build_object('items', v_items, 'total', v_total, 'page', p_page, 'page_size', p_page_size);
end;
$$;
revoke all on function public.almox_search_stock_movements(timestamptz,timestamptz,text,text,text,text,integer,integer) from public;
grant execute on function public.almox_search_stock_movements(timestamptz,timestamptz,text,text,text,text,integer,integer) to authenticated;

create index if not exists stock_movements_recorded_at_idx
  on public.stock_movements (recorded_at desc, id desc);
commit;
