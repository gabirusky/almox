-- RF08 smoke checks against a local/dev database after applying migrations and seed.
-- Run as a privileged test connection (for example psql against supabase db).
-- This transaction always rolls back its test data. API-role and concurrency checks
-- still require separate client sessions; see the notes after the transaction.
begin;

do $$
declare
  v_product uuid;
  v_category uuid;
  v_department uuid;
  v_key text := 'rf08-exit-' || gen_random_uuid()::text;
  v_result jsonb;
  v_replay jsonb;
  v_balance numeric;
  v_version integer;
  v_count integer;
begin
  perform set_config('request.jwt.claim.sub', '9018e72c-b54e-4fcc-8f36-14edd2848ea5', true);
  select id into v_category from public.categories where active order by id limit 1;
  select id into v_department from public.departments where active order by id limit 1;
  if v_category is null or v_department is null then
    raise exception 'RF08 test requires seeded active category and department';
  end if;

  v_product := public.almox_create_product(
    'RF08-' || substr(gen_random_uuid()::text, 1, 8), 'Produto teste RF08', null,
    v_category, 'UN', 0, null
  );
  perform public.almox_register_entry(v_product, 10, 'Teste RF08', 'Preparar saldo', null,
    'rf08-entry-' || gen_random_uuid()::text);

  perform set_config('request.jwt.claim.sub', '4515bbb4-df35-4d9f-8ece-5c8d391e2619', true);
  v_result := public.almox_register_exit(v_product, 4, v_department, 'Recebedor teste', 'Consumo', v_key);
  if v_result->>'kind' <> 'SAIDA' or (v_result->>'balance')::numeric <> 6
     or v_result->>'movement_id' is null then
    raise exception 'RF08 success result mismatch: %', v_result;
  end if;
  select quantity, version into v_balance, v_version
  from public.stock_balances where product_id = v_product;
  if v_balance <> 6 or v_version <> 2 then
    raise exception 'RF08 balance/version mismatch';
  end if;
  select count(*) into v_count from public.stock_movements
  where product_id = v_product and kind = 'SAIDA' and delta = -4
    and department_id = v_department and recipient_ref = 'Recebedor teste'
    and snapshots->>'department_name' is not null;
  if v_count <> 1 then
    raise exception 'RF08 movement or destination missing';
  end if;
  select count(*) into v_count from public.audit_events
  where entity_type = 'stock_movements'
    and entity_id = (v_result->>'movement_id')::uuid
    and actor_id = '4515bbb4-df35-4d9f-8ece-5c8d391e2619';
  if v_count <> 1 then
    raise exception 'RF08 audit missing';
  end if;

  v_replay := public.almox_register_exit(v_product, 4, v_department, 'Recebedor teste', 'Consumo', v_key);
  if v_replay <> v_result then
    raise exception 'RF08 replay changed the result';
  end if;
  select count(*) into v_count from public.stock_movements
  where product_id = v_product and kind = 'SAIDA';
  if v_count <> 1 then
    raise exception 'RF08 replay duplicated movement';
  end if;

  begin
    perform public.almox_register_exit(v_product, 11, v_department, 'Recebedor teste', 'Consumo',
      'rf08-insufficient-' || gen_random_uuid()::text);
    raise exception 'RF08 expected INSUFFICIENT_STOCK';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'INSUFFICIENT_STOCK' then raise; end if;
  end;

  begin
    perform public.almox_register_exit(v_product, 3, v_department, 'Recebedor teste', 'Consumo', v_key);
    raise exception 'RF08 expected operation-key conflict';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT' then raise; end if;
  end;

  select quantity, version into v_balance, v_version
  from public.stock_balances where product_id = v_product;
  if v_balance <> 6 or v_version <> 2 then
    raise exception 'RF08 rejection changed balance/version';
  end if;
  select count(*) into v_count from public.stock_movements
  where product_id = v_product and kind = 'SAIDA';
  if v_count <> 1 then
    raise exception 'RF08 rejection changed history';
  end if;

  if has_table_privilege('authenticated', 'public.stock_balances', 'UPDATE') then
    raise exception 'RF08 direct balance update is still granted';
  end if;
end $$;

rollback;

-- Additional integration checks: call the RPC through PostgREST as employee,
-- admin, anonymous, and an inactive profile. With balance 5, send two exits of
-- 4 simultaneously under different keys: exactly one must succeed, ending at 1.
-- Force audit trigger failure in an isolated test DB and confirm full rollback.
