-- ALMOX demo data for the hosted free Supabase project.
--
-- Run ONCE, on a fresh database, after:
--   1. supabase/seed_catalog.sql
--   2. supabase/bootstrap_admin.sql
--
-- It inserts 3 fictitious products, their stock balances and 4 movements so the
-- dashboard, product history and global log have something to show. All rows use
-- fixed UUIDs and `on conflict do nothing`, so a re-run is safe (it will not
-- duplicate rows, but it also will not repair values changed later).
--
-- This path is direct SQL for demo purposes only: it bypasses the RF07/RF08 RPCs
-- and their audit/idempotency guarantees. Do not use it for real stock data.
-- The admin profile created by bootstrap_admin.sql is used as the movement actor.

do $$
declare
  v_admin_id uuid;
  v_admin_name text;
  v_epi uuid;
  v_ferr uuid;
  v_manut uuid;
  v_prod uuid;
  v_p1 constant uuid := '11111111-1111-4111-8111-111111111111';
  v_p2 constant uuid := '22222222-2222-4222-8222-222222222222';
  v_p3 constant uuid := '33333333-3333-4333-8333-333333333333';
begin
  select p.id, p.display_name
  into v_admin_id, v_admin_name
  from public.profiles p
  where p.role = 'admin' and p.active
  order by p.created_at
  limit 1;

  if v_admin_id is null then
    raise exception 'ADMIN_PROFILE_REQUIRED: execute supabase/bootstrap_admin.sql first.';
  end if;

  select id into v_epi from public.categories
  where name_normalized = public.almox_normalize_name('EPI');
  select id into v_ferr from public.categories
  where name_normalized = public.almox_normalize_name('Ferramentas');
  select id into v_manut from public.departments
  where name_normalized = public.almox_normalize_name('Manutenção');
  select id into v_prod from public.departments
  where name_normalized = public.almox_normalize_name('Produção');

  if v_epi is null or v_ferr is null or v_manut is null or v_prod is null then
    raise exception 'REFERENCE_DATA_MISSING: execute supabase/seed_catalog.sql first.';
  end if;

  insert into public.products (
    id, sku, name, description, category_id, unit, minimum_stock, location, active, first_movement_at
  )
  values
    (v_p1, 'EPI-001', 'Luva de proteção', 'Luva nitrílica tamanho M', v_epi, 'CX', 5, 'Prateleira A1', true, '2026-11-10T13:00:00Z'),
    (v_p2, 'EPI-002', 'Óculos de segurança', null, v_epi, 'UN', 10, 'Prateleira A2', true, '2026-11-10T13:02:00Z'),
    (v_p3, 'FER-010', 'Martelo unha', 'Cabo de fibra', v_ferr, 'UN', 2, 'Armário F1', true, null)
  on conflict (id) do nothing;

  insert into public.stock_balances (product_id, quantity, version)
  values
    (v_p1, 18, 2),
    (v_p2, 0, 2),
    (v_p3, 0, 0)
  on conflict (product_id) do nothing;

  insert into public.stock_movements (
    id, product_id, actor_id, kind, delta, balance_before, balance_after,
    product_version, reason, origin, department_id, recipient_ref, document_ref,
    recorded_at, snapshots
  )
  values
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      v_p1, v_admin_id, 'ENTRADA', 20, 0, 20,
      1, 'Compra inicial', 'Fornecedor ABC', null, null, 'NF-1001',
      '2026-11-10T13:00:00Z',
      jsonb_build_object('sku', 'EPI-001', 'name', 'Luva de proteção', 'unit', 'CX', 'actor_name', v_admin_name)
    ),
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      v_p1, v_admin_id, 'SAIDA', -2, 20, 18,
      2, 'Uso em manutenção', null, v_manut, 'João Silva', null,
      '2026-11-10T13:10:00Z',
      jsonb_build_object('sku', 'EPI-001', 'name', 'Luva de proteção', 'unit', 'CX', 'actor_name', v_admin_name, 'department_name', 'Manutenção')
    ),
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      v_p2, v_admin_id, 'ENTRADA', 10, 0, 10,
      1, 'Reposição', 'Fornecedor XYZ', null, null, null,
      '2026-11-10T13:02:00Z',
      jsonb_build_object('sku', 'EPI-002', 'name', 'Óculos de segurança', 'unit', 'UN', 'actor_name', v_admin_name)
    ),
    (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      v_p2, v_admin_id, 'SAIDA', -10, 10, 0,
      2, 'Distribuição', null, v_prod, 'Equipe A', null,
      '2026-11-10T13:05:00Z',
      jsonb_build_object('sku', 'EPI-002', 'name', 'Óculos de segurança', 'unit', 'UN', 'actor_name', v_admin_name, 'department_name', 'Produção')
    )
  on conflict (id) do nothing;
end $$;

select
  (select count(*) from public.products)       as products,
  (select count(*) from public.stock_balances) as balances,
  (select count(*) from public.stock_movements) as movements;

-- ---------------------------------------------------------------------------
-- Cleanup (destructive; run only on a fresh/demo database):
--
-- delete from public.stock_movements
-- where product_id in (
--   '11111111-1111-4111-8111-111111111111',
--   '22222222-2222-4222-8222-222222222222',
--   '33333333-3333-4333-8333-333333333333'
-- );
-- delete from public.stock_balances
-- where product_id in (
--   '11111111-1111-4111-8111-111111111111',
--   '22222222-2222-4222-8222-222222222222',
--   '33333333-3333-4333-8333-333333333333'
-- );
-- delete from public.products
-- where id in (
--   '11111111-1111-4111-8111-111111111111',
--   '22222222-2222-4222-8222-222222222222',
--   '33333333-3333-4333-8333-333333333333'
-- );
-- ---------------------------------------------------------------------------