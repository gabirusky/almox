-- Run in an isolated Supabase test database after migrations + seed, as postgres.
-- All fixtures roll back. This checks domain logic; concurrent/API checks are in docs.
begin;
do $$
declare
  v_product uuid;
  v_category uuid;
  v_department uuid;
  v_entry uuid;
  v_exit uuid;
  v_original jsonb;
  v_result jsonb;
  v_replay jsonb;
  v_key text := gen_random_uuid()::text;
  v_balance numeric;
  v_count integer;
begin
  perform set_config('request.jwt.claim.sub','9018e72c-b54e-4fcc-8f36-14edd2848ea5',true);
  select id into v_category from public.categories where active limit 1;
  select id into v_department from public.departments where active limit 1;
  v_product := public.almox_create_product('RF09-' || gen_random_uuid()::text, 'Teste RF09', null, v_category, 'UN', 0, null);
  perform public.almox_register_entry(v_product,10,'Teste','Saldo inicial',null,gen_random_uuid()::text);
  select id into v_entry from public.stock_movements where product_id=v_product and kind='ENTRADA';
  v_exit := (public.almox_register_exit(v_product,4,v_department,'Teste','Consumo',gen_random_uuid()::text)->>'movement_id')::uuid;
  select to_jsonb(m) into v_original from public.stock_movements m where id=v_exit;

  -- Reversing consumed incoming stock cannot make stock negative.
  begin
    perform public.almox_reverse_movement(v_entry,'Correção',gen_random_uuid()::text);
    raise exception 'Expected insufficient stock';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'REVERSAL_INSUFFICIENT_STOCK' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','4515bbb4-df35-4d9f-8ece-5c8d391e2619',true);
  begin
    perform public.almox_reverse_movement(v_exit,'Correção',v_key);
    raise exception 'Employee unexpectedly reversed stock';
  exception when insufficient_privilege then
    if sqlerrm <> 'REVERSAL_ADMIN_REQUIRED' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','9018e72c-b54e-4fcc-8f36-14edd2848ea5',true);
  begin
    perform public.almox_reverse_movement(v_exit,'  ',v_key);
    raise exception 'Expected required reason';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'REVERSAL_REASON_INVALID' then raise; end if;
  end;
  v_result := public.almox_reverse_movement(v_exit,'Entrega incorreta',v_key);
  if (v_result->>'balance')::numeric <> 10 or (v_result->>'delta')::numeric <> 4
     or (v_result->>'version')::integer <> 3 or (v_result->>'reversal_of')::uuid <> v_exit then
    raise exception 'Wrong reversal result: %',v_result;
  end if;
  if (select to_jsonb(m) from public.stock_movements m where id=v_exit) <> v_original then
    raise exception 'Original movement was modified';
  end if;
  v_replay := public.almox_reverse_movement(v_exit,'Entrega incorreta',v_key);
  if v_replay <> v_result then raise exception 'Replay changed result'; end if;
  select count(*) into v_count from public.stock_movements where reversal_of=v_exit;
  if v_count <> 1 then raise exception 'Duplicate reversal'; end if;
  select count(*) into v_count from public.audit_events
  where entity_type='stock_movements' and entity_id=(v_result->>'movement_id')::uuid;
  if v_count <> 1 then raise exception 'Missing reversal audit'; end if;
  begin
    perform public.almox_reverse_movement(v_exit,'Entrega incorreta',gen_random_uuid()::text);
    raise exception 'Expected duplicate rejection';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'MOVEMENT_ALREADY_REVERSED' then raise; end if;
  end;
  begin
    perform public.almox_reverse_movement((v_result->>'movement_id')::uuid,'Outra correção',gen_random_uuid()::text);
    raise exception 'Expected reversal-of-reversal rejection';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'REVERSAL_OF_REVERSAL_FORBIDDEN' then raise; end if;
  end;
  begin
    perform public.almox_reverse_movement(v_exit,'Outra justificativa',v_key);
    raise exception 'Expected key conflict';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT' then raise; end if;
  end;
  perform public.almox_reverse_movement(v_entry,'Entrada incorreta',gen_random_uuid()::text);
  select quantity into v_balance from public.stock_balances where product_id=v_product;
  if v_balance <> 0 then raise exception 'Entry reversal did not restore zero'; end if;
  if (select sum(delta) from public.stock_movements where product_id=v_product) <> v_balance then
    raise exception 'History/balance mismatch';
  end if;
end $$;
rollback;
