-- ALMOX RF07 / RF13 / RN01-RN06 / RN12-RN16
-- Atomic, auditable and idempotent product entry command.

begin;

create table if not exists public.stock_commands (
  actor_id uuid not null references public.profiles(id) on delete restrict,
  operation_key text not null check (char_length(btrim(operation_key)) between 1 and 120),
  request_hash text not null,
  result jsonb null,
  completed_at timestamptz null,
  primary key (actor_id, operation_key)
);

alter table public.stock_commands enable row level security;
revoke all on public.stock_commands from anon, authenticated;

create or replace function public.almox_register_entry(
  p_product_id uuid,
  p_quantity numeric,
  p_origin text,
  p_reason text,
  p_document_ref text default null,
  p_operation_key text default null
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
  v_after numeric(14,3);
  v_version integer;
  v_result jsonb;
begin
  if not public.almox_is_active_user() then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;
  if p_operation_key is null or char_length(btrim(p_operation_key)) = 0 then
    raise exception 'OPERATION_KEY_REQUIRED' using errcode = 'P0001';
  end if;

  v_hash := encode(digest(jsonb_build_object(
    'product_id', p_product_id,
    'quantity', p_quantity,
    'origin', p_origin,
    'reason', p_reason,
    'document_ref', p_document_ref
  )::text, 'sha256'), 'hex');

  insert into public.stock_commands (actor_id, operation_key, request_hash)
  values (v_actor, btrim(p_operation_key), v_hash)
  on conflict (actor_id, operation_key) do nothing;

  select * into v_command
  from public.stock_commands
  where actor_id = v_actor and operation_key = btrim(p_operation_key)
  for update;

  if v_command.result is not null then
    if v_command.request_hash <> v_hash then
      raise exception 'OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT' using errcode = 'P0001';
    end if;
    return v_command.result;
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'ENTRY_QUANTITY_MUST_BE_POSITIVE' using errcode = 'P0001';
  end if;
  if p_quantity <> round(p_quantity, 3) then
    raise exception 'ENTRY_QUANTITY_PRECISION_EXCEEDED' using errcode = 'P0001';
  end if;
  if p_origin is null or char_length(btrim(p_origin)) = 0 then
    raise exception 'ENTRY_ORIGIN_REQUIRED' using errcode = 'P0001';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) = 0 then
    raise exception 'ENTRY_REASON_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;
  if not found then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_product.active then
    raise exception 'PRODUCT_INACTIVE' using errcode = 'P0001';
  end if;
  if v_product.unit in ('UN', 'CX') and p_quantity <> trunc(p_quantity) then
    raise exception 'ENTRY_QUANTITY_MUST_BE_INTEGER' using errcode = 'P0001';
  end if;

  select * into v_balance
  from public.stock_balances
  where product_id = p_product_id
  for update;
  if not found then
    raise exception 'STOCK_BALANCE_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_after := v_balance.quantity + p_quantity;
  v_version := v_balance.version + 1;

  insert into public.stock_movements (
    product_id, actor_id, kind, delta, balance_before, balance_after,
    product_version, reason, origin, document_ref, snapshots
  ) values (
    v_product.id, v_actor, 'ENTRADA', p_quantity, v_balance.quantity, v_after,
    v_version, btrim(p_reason), btrim(p_origin), nullif(btrim(p_document_ref), ''),
    jsonb_build_object(
      'sku', v_product.sku,
      'name', v_product.name,
      'unit', v_product.unit,
      'actor_name', (select display_name from public.profiles where id = v_actor)
    )
  );

  update public.stock_balances
  set quantity = v_after, version = v_version
  where product_id = p_product_id;

  update public.products
  set first_movement_at = coalesce(first_movement_at, now())
  where id = p_product_id;

  v_result := jsonb_build_object(
    'product_id', v_product.id,
    'quantity', p_quantity,
    'balance', v_after,
    'version', v_version,
    'kind', 'ENTRADA'
  );
  update public.stock_commands
  set result = v_result, completed_at = now()
  where actor_id = v_actor and operation_key = btrim(p_operation_key);
  return v_result;
end;
$$;

revoke all on function public.almox_register_entry(uuid, numeric, text, text, text, text) from public;
grant execute on function public.almox_register_entry(uuid, numeric, text, text, text, text) to authenticated;

drop trigger if exists trg_audit_stock_movements on public.stock_movements;
create trigger trg_audit_stock_movements
after insert on public.stock_movements
for each row execute function public.almox_write_audit();

commit;
