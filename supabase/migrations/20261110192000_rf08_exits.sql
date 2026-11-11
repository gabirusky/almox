-- RF08 / RF13: atomic, auditable and idempotent stock exit.
begin;

-- The balance is a projection maintained by domain functions only.
drop policy if exists stock_balances_admin_write on public.stock_balances;
revoke insert, update, delete, truncate on public.stock_balances from anon, authenticated;

create or replace function public.almox_register_exit(
  p_product_id uuid,
  p_quantity numeric,
  p_department_id uuid,
  p_recipient_ref text,
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
  v_department public.departments;
  v_command public.stock_commands;
  v_hash text;
  v_after numeric(14,3);
  v_version integer;
  v_movement_id uuid;
  v_result jsonb;
begin
  if not public.almox_is_active_user() then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;
  if p_operation_key is null or char_length(btrim(p_operation_key)) not between 1 and 120 then
    raise exception 'OPERATION_KEY_INVALID' using errcode = 'P0001';
  end if;

  -- A discriminator prevents an entry key from replaying an exit (and vice versa).
  v_hash := encode(digest(jsonb_build_object(
    'kind', 'SAIDA',
    'product_id', p_product_id,
    'quantity', p_quantity,
    'department_id', p_department_id,
    'recipient_ref', nullif(btrim(p_recipient_ref), ''),
    'reason', nullif(btrim(p_reason), '')
  )::text, 'sha256'), 'hex');

  insert into public.stock_commands (actor_id, operation_key, request_hash)
  values (v_actor, btrim(p_operation_key), v_hash)
  on conflict (actor_id, operation_key) do nothing;

  select * into v_command from public.stock_commands
  where actor_id = v_actor and operation_key = btrim(p_operation_key)
  for update;
  if v_command.request_hash <> v_hash then
    raise exception 'OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT' using errcode = 'P0001';
  end if;
  if v_command.result is not null then
    return v_command.result;
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'EXIT_QUANTITY_MUST_BE_POSITIVE' using errcode = 'P0001';
  end if;
  if p_quantity <> round(p_quantity, 3) or p_quantity > 99999999999.999 then
    raise exception 'EXIT_QUANTITY_INVALID_PRECISION' using errcode = 'P0001';
  end if;
  if p_department_id is null then
    raise exception 'EXIT_DEPARTMENT_REQUIRED' using errcode = 'P0001';
  end if;
  if p_recipient_ref is null or char_length(btrim(p_recipient_ref)) not between 1 and 240 then
    raise exception 'EXIT_RECIPIENT_INVALID' using errcode = 'P0001';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'EXIT_REASON_INVALID' using errcode = 'P0001';
  end if;

  -- Same lock order as RF07: product, then balance.
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_product.active then
    raise exception 'PRODUCT_INACTIVE' using errcode = 'P0001';
  end if;
  if v_product.unit in ('UN', 'CX') and p_quantity <> trunc(p_quantity) then
    raise exception 'EXIT_QUANTITY_MUST_BE_INTEGER' using errcode = 'P0001';
  end if;

  select * into v_balance from public.stock_balances where product_id = p_product_id for update;
  if not found then
    raise exception 'STOCK_BALANCE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_balance.quantity < p_quantity then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  -- This lock serializes concurrent department inactivation with the exit.
  select * into v_department from public.departments where id = p_department_id for share;
  if not found or not v_department.active then
    raise exception 'DEPARTMENT_INACTIVE_OR_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_after := v_balance.quantity - p_quantity;
  v_version := v_balance.version + 1;

  insert into public.stock_movements (
    product_id, actor_id, kind, delta, balance_before, balance_after,
    product_version, reason, department_id, recipient_ref, snapshots
  ) values (
    v_product.id, v_actor, 'SAIDA', -p_quantity, v_balance.quantity, v_after,
    v_version, btrim(p_reason), v_department.id, btrim(p_recipient_ref),
    jsonb_build_object(
      'sku', v_product.sku,
      'name', v_product.name,
      'unit', v_product.unit,
      'actor_name', (select display_name from public.profiles where id = v_actor),
      'department_name', v_department.name
    )
  ) returning id into v_movement_id;

  update public.stock_balances
  set quantity = v_after, version = v_version
  where product_id = p_product_id;

  update public.products
  set first_movement_at = coalesce(first_movement_at, now())
  where id = p_product_id and first_movement_at is null;

  v_result := jsonb_build_object(
    'movement_id', v_movement_id,
    'product_id', v_product.id,
    'quantity', p_quantity,
    'balance', v_after,
    'version', v_version,
    'kind', 'SAIDA'
  );
  update public.stock_commands
  set result = v_result, completed_at = now()
  where actor_id = v_actor and operation_key = btrim(p_operation_key);
  return v_result;
end;
$$;

revoke all on function public.almox_register_exit(uuid, numeric, uuid, text, text, text) from public;
grant execute on function public.almox_register_exit(uuid, numeric, uuid, text, text, text) to authenticated;

commit;
