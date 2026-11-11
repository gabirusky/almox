-- RF09 / RN07-RN10 / RN13-RN16 / RNF01-RNF04: administrative full reversal.
begin;

create or replace function public.almox_reverse_movement(
  p_movement_id uuid, p_reason text, p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_actor uuid := auth.uid();
  v_original public.stock_movements;
  v_product public.products;
  v_balance public.stock_balances;
  v_command public.stock_commands;
  v_hash text;
  v_after numeric;
  v_id uuid;
  v_result jsonb;
begin
  if not public.almox_is_active_user() then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;
  if not public.almox_is_admin() then
    raise exception 'REVERSAL_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_operation_key is null or char_length(btrim(p_operation_key)) not between 1 and 120 then
    raise exception 'OPERATION_KEY_INVALID' using errcode = 'P0001';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 500 then
    raise exception 'REVERSAL_REASON_INVALID' using errcode = 'P0001';
  end if;
  v_hash := encode(digest(jsonb_build_object(
    'kind', 'ESTORNO', 'movement_id', p_movement_id, 'reason', btrim(p_reason)
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

  -- Movements are immutable. Read the product identity before taking the shared
  -- command -> product -> balance lock order used by entry and exit RPCs.
  select * into v_original from public.stock_movements where id = p_movement_id;
  if not found then raise exception 'MOVEMENT_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_original.kind = 'ESTORNO' or v_original.reversal_of is not null then
    raise exception 'REVERSAL_OF_REVERSAL_FORBIDDEN' using errcode = 'P0001';
  end if;
  select * into v_product from public.products where id = v_original.product_id for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001'; end if;
  if not v_product.active then raise exception 'PRODUCT_INACTIVE' using errcode = 'P0001'; end if;
  select * into v_balance from public.stock_balances where product_id = v_product.id for update;
  if not found then raise exception 'STOCK_BALANCE_NOT_FOUND' using errcode = 'P0001'; end if;
  -- Recheck after the product lock: concurrent requests with different keys
  -- serialize here. The existing unique reversal_of index is a second guard.
  if exists(select 1 from public.stock_movements where reversal_of = v_original.id) then
    raise exception 'MOVEMENT_ALREADY_REVERSED' using errcode = 'P0001';
  end if;
  v_after := v_balance.quantity - v_original.delta;
  if v_after < 0 then raise exception 'REVERSAL_INSUFFICIENT_STOCK' using errcode = 'P0001'; end if;
  if v_after > 99999999999.999 then raise exception 'STOCK_LIMIT_EXCEEDED' using errcode = 'P0001'; end if;

  insert into public.stock_movements(
    product_id, actor_id, kind, delta, balance_before, balance_after,
    product_version, reason, origin, department_id, recipient_ref, document_ref,
    reversal_of, snapshots
  ) values (
    v_product.id, v_actor, 'ESTORNO', -v_original.delta, v_balance.quantity, v_after,
    v_balance.version + 1, btrim(p_reason), v_original.origin, v_original.department_id,
    v_original.recipient_ref, v_original.document_ref, v_original.id,
    v_original.snapshots || jsonb_build_object(
      'actor_name', (select display_name from public.profiles where id = v_actor)
    )
  ) returning id into v_id;
  -- The existing insert audit trigger must succeed for this transaction to commit.
  update public.stock_balances set quantity = v_after, version = v_balance.version + 1
  where product_id = v_product.id;
  v_result := jsonb_build_object(
    'movement_id', v_id, 'reversal_of', v_original.id, 'product_id', v_product.id,
    'delta', (-v_original.delta)::text, 'balance', v_after::text,
    'version', v_balance.version + 1, 'kind', 'ESTORNO'
  );
  update public.stock_commands set result = v_result, completed_at = now()
  where actor_id = v_actor and operation_key = btrim(p_operation_key);
  return v_result;
end;
$$;
revoke all on function public.almox_reverse_movement(uuid,text,text) from public;
grant execute on function public.almox_reverse_movement(uuid,text,text) to authenticated;
commit;
