-- Run in an isolated Supabase test database after migrations + seed, as postgres.
-- All fixtures roll back. Covers RF14 (painel), RF15 (exportação) e RF16/RN17 (usuários).
-- The invite Edge Function (Auth admin API) is exercised manually: docs/demo-rf14-rf16.md.
begin;
do $$
declare
  v_admin uuid := '9018e72c-b54e-4fcc-8f36-14edd2848ea5';
  v_operator uuid := '4515bbb4-df35-4d9f-8ece-5c8d391e2619';
  v_category uuid;
  v_product uuid;
  v_summary jsonb;
  v_export jsonb;
  v_before integer;
  v_audits integer;
begin
  -- RF14: indicadores coerentes com os saldos.
  perform set_config('request.jwt.claim.sub', v_operator, true);
  select id into v_category from public.categories where active limit 1;
  perform set_config('request.jwt.claim.sub', v_admin, true);
  v_product := public.almox_create_product('RF14-' || gen_random_uuid()::text, 'Teste RF14', null, v_category, 'UN', 5, null);
  perform set_config('request.jwt.claim.sub', v_operator, true);
  v_summary := public.almox_dashboard_summary(100);
  if (v_summary->'counts'->>'at_or_below_minimum')::int
     <> (select count(*) from public.products p join public.stock_balances b on b.product_id = p.id where p.active and b.quantity <= p.minimum_stock) then
    raise exception 'RF14 at_or_below_minimum mismatch';
  end if;
  if not exists (select 1 from jsonb_array_elements(v_summary->'alerts') a where (a->>'id')::uuid = v_product) then
    raise exception 'RF14 zero-balance product missing from alerts';
  end if;

  -- RF15: funcionário não exporta; administrador exporta e gera auditoria.
  begin
    perform public.almox_export_stock_balances(null, 'all');
    raise exception 'Employee unexpectedly exported';
  exception when insufficient_privilege then
    if sqlerrm <> 'EXPORT_ADMIN_REQUIRED' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', v_admin, true);
  select count(*) into v_before from public.audit_events where action = 'EXPORT';
  v_export := public.almox_export_stock_balances(null, 'zero_balance');
  if exists (select 1 from jsonb_array_elements(v_export->'rows') r where (r->>'quantity')::numeric <> 0) then
    raise exception 'RF15 zero_balance filter returned non-zero rows';
  end if;
  if (v_export->>'row_count')::int <> jsonb_array_length(v_export->'rows') then
    raise exception 'RF15 row_count mismatch';
  end if;
  v_export := public.almox_export_stock_movements(null, null, null, 'SAIDA', null, null);
  if exists (select 1 from jsonb_array_elements(v_export->'rows') r where r->>'kind' <> 'SAIDA') then
    raise exception 'RF15 kind filter leaked other kinds';
  end if;
  select count(*) into v_audits from public.audit_events where action = 'EXPORT';
  if v_audits <> v_before + 2 then raise exception 'RF15 exports not audited'; end if;

  -- RF16: escrita direta em profiles foi fechada para clientes.
  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE') then
    raise exception 'RF16 authenticated can still update profiles directly';
  end if;

  -- RF16/RN17: último administrador ativo é preservado.
  begin
    perform public.almox_set_user_active(v_admin, false);
    raise exception 'Last admin unexpectedly deactivated';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'LAST_ADMIN_REQUIRED' then raise; end if;
  end;
  begin
    perform public.almox_set_user_role(v_admin, 'employee');
    raise exception 'Last admin unexpectedly demoted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'LAST_ADMIN_REQUIRED' then raise; end if;
  end;

  -- Funcionário não gerencia usuários.
  perform set_config('request.jwt.claim.sub', v_operator, true);
  begin
    perform public.almox_set_user_role(v_operator, 'admin');
    raise exception 'Employee unexpectedly promoted self';
  exception when insufficient_privilege then
    if sqlerrm <> 'USER_ADMIN_REQUIRED' then raise; end if;
  end;

  -- Desativação bloqueia a próxima chamada protegida (TA10).
  perform set_config('request.jwt.claim.sub', v_admin, true);
  perform public.almox_set_user_active(v_operator, false);
  perform set_config('request.jwt.claim.sub', v_operator, true);
  if public.almox_is_active_user() then raise exception 'Deactivated user still active'; end if;
  begin
    perform public.almox_dashboard_summary(5);
    raise exception 'Deactivated user unexpectedly read dashboard';
  exception when insufficient_privilege then
    if sqlerrm <> 'ACTIVE_PROFILE_REQUIRED' then raise; end if;
  end;

  -- Promoção de outro admin libera a remoção do primeiro, com auditoria do perfil.
  perform set_config('request.jwt.claim.sub', v_admin, true);
  perform public.almox_set_user_active(v_operator, true);
  perform public.almox_set_user_role(v_operator, 'admin');
  if not (public.almox_set_user_role(v_admin, 'employee')->>'changed')::boolean then
    raise exception 'Admin demotion should succeed when another admin exists';
  end if;
  if not exists (select 1 from public.audit_events where entity_type = 'profiles' and entity_id = v_admin and action = 'UPDATE') then
    raise exception 'RF16 profile change not audited';
  end if;

  -- Convite: pedido idempotente; mesma chave com outro conteúdo é recusada.
  perform set_config('request.jwt.claim.sub', v_operator, true);
  perform public.almox_begin_access_request('novo@almox.test', 'Nova Pessoa', 'employee', 'rf16-key');
  if (select count(*) from public.access_requests where operation_key = 'rf16-key') <> 1 then
    raise exception 'RF16 access request not registered once';
  end if;
  perform public.almox_begin_access_request('novo@almox.test', 'Nova Pessoa', 'employee', 'rf16-key');
  if (select count(*) from public.access_requests where operation_key = 'rf16-key') <> 1 then
    raise exception 'RF16 replay duplicated access request';
  end if;
  begin
    perform public.almox_begin_access_request('outro@almox.test', 'Nova Pessoa', 'employee', 'rf16-key');
    raise exception 'Reused key with different content accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT' then raise; end if;
  end;
  if (public.almox_begin_access_request('admin@almox.test', 'Duplicado', 'employee', 'rf16-dup')->>'error_code') <> 'USER_ALREADY_EXISTS' then
    raise exception 'RF16 existing e-mail not flagged';
  end if;
end $$;
rollback;
