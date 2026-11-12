-- ALMOX RF14 / RF15 / RF16
--   RF14: painel com produtos ativos, itens zerados e itens no limite mínimo.
--   RF15: exportação CSV administrativa (saldo e movimentações filtradas) a partir
--         de uma consulta consistente, com filtros e momento da geração.
--   RF16: gestão de acesso por convite, perfil e situação, sem cadastro público,
--         preservando ao menos um administrador ativo (RN17).
-- Traceability: RNF01 (segurança), RNF02 (integridade), RNF04 (rastreabilidade), RN13, RN17.
begin;

-- ---------------------------------------------------------------------------
-- Auditoria: novas ações de domínio (exportação, convite e mudança de perfil).
-- ---------------------------------------------------------------------------
alter table public.audit_events drop constraint if exists audit_events_action_check;
alter table public.audit_events add constraint audit_events_action_check
  check (action in ('INSERT', 'UPDATE', 'INACTIVATE', 'REACTIVATE', 'EXPORT', 'INVITE', 'ROLE_CHANGE'));

-- ===========================================================================
-- RF14: painel de acompanhamento
-- ===========================================================================
-- STABLE: todas as consultas internas enxergam o mesmo snapshot da chamada,
-- então os indicadores e a lista de alertas são coerentes entre si.
create or replace function public.almox_dashboard_summary(p_alert_limit integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := least(greatest(coalesce(p_alert_limit, 20), 1), 100);
  v_counts jsonb;
  v_alerts jsonb;
  v_activity jsonb;
begin
  if not public.almox_is_active_user() then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'active_products',   count(*) filter (where p.active),
    'inactive_products', count(*) filter (where not p.active),
    'zero_balance',      count(*) filter (where p.active and b.quantity = 0),
    'at_or_below_minimum', count(*) filter (where p.active and b.quantity <= p.minimum_stock),
    'below_minimum_with_stock', count(*) filter (where p.active and b.quantity > 0 and b.quantity <= p.minimum_stock)
  ) into v_counts
  from public.products p
  join public.stock_balances b on b.product_id = p.id;

  select coalesce(jsonb_agg(a order by a.severity, a.coverage, a.name), '[]'::jsonb) into v_alerts
  from (
    select p.id, p.sku, p.name, p.unit, p.location,
           c.name as category_name,
           b.quantity, p.minimum_stock, b.updated_at,
           case when b.quantity = 0 then 0 else 1 end as severity,
           case when p.minimum_stock > 0 then b.quantity / p.minimum_stock else 0 end as coverage
    from public.products p
    join public.stock_balances b on b.product_id = p.id
    left join public.categories c on c.id = p.category_id
    where p.active and b.quantity <= p.minimum_stock
    order by severity, coverage, p.name
    limit v_limit
  ) a;

  select jsonb_build_object(
    'last_7_days', count(*) filter (where m.recorded_at >= now() - interval '7 days'),
    'entries_7_days', count(*) filter (where m.recorded_at >= now() - interval '7 days' and m.kind = 'ENTRADA'),
    'exits_7_days', count(*) filter (where m.recorded_at >= now() - interval '7 days' and m.kind = 'SAIDA'),
    'corrections_7_days', count(*) filter (where m.recorded_at >= now() - interval '7 days' and m.kind in ('AJUSTE', 'ESTORNO')),
    'last_movement_at', max(m.recorded_at)
  ) into v_activity
  from public.stock_movements m;

  return jsonb_build_object(
    'generated_at', now(),
    'counts', v_counts,
    'alerts', v_alerts,
    'activity', v_activity
  );
end;
$$;
revoke all on function public.almox_dashboard_summary(integer) from public;
grant execute on function public.almox_dashboard_summary(integer) to authenticated;

-- ===========================================================================
-- RF15: exportação CSV (administrador)
-- ===========================================================================
-- As linhas são produzidas por um único comando SQL (snapshot consistente).
-- A exportação gera evento de auditoria com os filtros e a quantidade de linhas.

create or replace function public.almox_export_stock_balances(
  p_category_id uuid default null,
  p_situation text default 'all'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_rows jsonb;
  v_count integer;
  v_generated_at timestamptz := now();
  v_filters jsonb;
begin
  if not public.almox_is_admin() then
    raise exception 'EXPORT_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if coalesce(p_situation, 'all') not in ('all', 'active', 'inactive', 'zero_balance', 'at_or_below_minimum') then
    raise exception 'EXPORT_FILTER_INVALID' using errcode = 'P0001';
  end if;

  v_filters := jsonb_build_object('category_id', p_category_id, 'situation', coalesce(p_situation, 'all'));

  select coalesce(jsonb_agg(r order by r.sku), '[]'::jsonb), count(*) into v_rows, v_count
  from (
    select p.sku, p.name, c.name as category_name, p.unit,
           b.quantity, p.minimum_stock, p.location, p.active,
           (p.active and b.quantity <= p.minimum_stock) as at_or_below_minimum,
           b.version, b.updated_at
    from public.products p
    join public.stock_balances b on b.product_id = p.id
    left join public.categories c on c.id = p.category_id
    where (p_category_id is null or p.category_id = p_category_id)
      and case coalesce(p_situation, 'all')
            when 'active' then p.active
            when 'inactive' then not p.active
            when 'zero_balance' then p.active and b.quantity = 0
            when 'at_or_below_minimum' then p.active and b.quantity <= p.minimum_stock
            else true
          end
  ) r;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, recorded_at)
  values (v_actor, 'EXPORT', 'stock_balances_export', gen_random_uuid(), null,
          jsonb_build_object('filters', v_filters, 'row_count', v_count), v_generated_at);

  return jsonb_build_object('generated_at', v_generated_at, 'filters', v_filters, 'row_count', v_count, 'rows', v_rows);
end;
$$;
revoke all on function public.almox_export_stock_balances(uuid, text) from public;
grant execute on function public.almox_export_stock_balances(uuid, text) to authenticated;

create or replace function public.almox_export_stock_movements(
  p_from timestamptz default null,
  p_to_exclusive timestamptz default null,
  p_product_id uuid default null,
  p_kind text default null,
  p_actor_id uuid default null,
  p_department_id uuid default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_rows jsonb;
  v_count integer;
  v_generated_at timestamptz := now();
  v_filters jsonb;
  v_max_rows constant integer := 50000;
begin
  if not public.almox_is_admin() then
    raise exception 'EXPORT_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_from is not null and p_to_exclusive is not null and p_to_exclusive <= p_from then
    raise exception 'MOVEMENT_DATE_RANGE_INVALID' using errcode = 'P0001';
  end if;
  if p_kind is not null and p_kind not in ('ENTRADA', 'SAIDA', 'ABERTURA', 'AJUSTE', 'ESTORNO') then
    raise exception 'MOVEMENT_KIND_INVALID' using errcode = 'P0001';
  end if;

  v_filters := jsonb_build_object(
    'from', p_from, 'to_exclusive', p_to_exclusive, 'product_id', p_product_id,
    'kind', p_kind, 'actor_id', p_actor_id, 'department_id', p_department_id
  );

  select coalesce(jsonb_agg(r order by r.recorded_at desc, r.id desc), '[]'::jsonb), count(*)
    into v_rows, v_count
  from (
    select m.id, m.recorded_at, m.kind,
           m.snapshots->>'sku' as sku, m.snapshots->>'name' as product_name,
           m.snapshots->>'unit' as unit,
           m.delta, m.balance_before, m.balance_after, m.product_version,
           m.snapshots->>'actor_name' as actor_name,
           m.origin, m.snapshots->>'department_name' as department_name,
           m.recipient_ref, m.document_ref, m.reason, m.reversal_of,
           (select r2.id from public.stock_movements r2 where r2.reversal_of = m.id limit 1) as reversed_by
    from public.stock_movements m
    where (p_from is null or m.recorded_at >= p_from)
      and (p_to_exclusive is null or m.recorded_at < p_to_exclusive)
      and (p_product_id is null or m.product_id = p_product_id)
      and (p_kind is null or m.kind = p_kind)
      and (p_actor_id is null or m.actor_id = p_actor_id)
      and (p_department_id is null or m.department_id = p_department_id)
  ) r;

  if v_count > v_max_rows then
    raise exception 'EXPORT_TOO_LARGE' using errcode = 'P0001';
  end if;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, recorded_at)
  values (v_actor, 'EXPORT', 'stock_movements_export', gen_random_uuid(), null,
          jsonb_build_object('filters', v_filters, 'row_count', v_count), v_generated_at);

  return jsonb_build_object('generated_at', v_generated_at, 'filters', v_filters, 'row_count', v_count, 'rows', v_rows);
end;
$$;
revoke all on function public.almox_export_stock_movements(timestamptz, timestamptz, uuid, text, uuid, uuid) from public;
grant execute on function public.almox_export_stock_movements(timestamptz, timestamptz, uuid, text, uuid, uuid) to authenticated;

-- ===========================================================================
-- RF16: gestão de usuários
-- ===========================================================================

-- Escritas em profiles passam a ocorrer somente por funções de domínio.
drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
for select to authenticated
using (public.almox_is_admin());
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;

-- Trilha de alterações de perfil/situação (RF12/RF16).
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles
after insert or update on public.profiles
for each row execute function public.almox_write_audit();

-- Pedidos de convite: estado consultável e repetição segura (seção 11.1).
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  operation_key text not null check (char_length(operation_key) between 1 and 120),
  target_email text not null check (target_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(target_email) <= 254),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  role public.almox_role not null default 'employee',
  auth_user_id uuid null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, operation_key)
);
create index if not exists access_requests_created_idx on public.access_requests (created_at desc);
create trigger trg_access_requests_updated_at
before update on public.access_requests
for each row execute function public.almox_set_updated_at();

alter table public.access_requests enable row level security;
drop policy if exists access_requests_admin_select on public.access_requests;
create policy access_requests_admin_select on public.access_requests
for select to authenticated
using (public.almox_is_admin());
revoke insert, update, delete, truncate on public.access_requests from anon, authenticated;

-- Listagem administrativa (dados completos só para administrador).
create or replace function public.almox_list_users()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.almox_is_admin() then
    raise exception 'USER_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'email', u.email,
      'role', p.role,
      'active', p.active,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'last_sign_in_at', u.last_sign_in_at,
      'invited_at', u.invited_at
    ) order by p.active desc, p.display_name)
    from public.profiles p
    left join auth.users u on u.id = p.id
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.almox_list_users() from public;
grant execute on function public.almox_list_users() to authenticated;

-- Serializa alterações de privilégio e garante ao menos um admin ativo (RN17).
-- Bloqueia todas as linhas de administradores ativos em ordem estável antes de decidir.
create or replace function public.almox_lock_admins_and_check(p_target uuid, p_new_role public.almox_role, p_new_active boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_remaining integer;
begin
  perform 1 from public.profiles
  where role = 'admin' and active
  order by id
  for update;

  select count(*) into v_remaining
  from public.profiles
  where role = 'admin' and active and id <> p_target;

  if v_remaining = 0 and not (p_new_role = 'admin' and p_new_active) then
    raise exception 'LAST_ADMIN_REQUIRED' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.almox_lock_admins_and_check(uuid, public.almox_role, boolean) from public;

create or replace function public.almox_set_user_role(p_user_id uuid, p_role public.almox_role)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles;
begin
  if not public.almox_is_admin() then
    raise exception 'USER_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_role is null then
    raise exception 'USER_ROLE_INVALID' using errcode = 'P0001';
  end if;

  perform public.almox_lock_admins_and_check(p_user_id, p_role,
    coalesce((select active from public.profiles where id = p_user_id), false));

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_profile.role = p_role then
    return jsonb_build_object('id', v_profile.id, 'role', v_profile.role, 'active', v_profile.active, 'changed', false);
  end if;

  update public.profiles set role = p_role where id = p_user_id returning * into v_profile;
  return jsonb_build_object('id', v_profile.id, 'role', v_profile.role, 'active', v_profile.active, 'changed', true);
end;
$$;
revoke all on function public.almox_set_user_role(uuid, public.almox_role) from public;
grant execute on function public.almox_set_user_role(uuid, public.almox_role) to authenticated;

create or replace function public.almox_set_user_active(p_user_id uuid, p_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_profile public.profiles;
begin
  if not public.almox_is_admin() then
    raise exception 'USER_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_active is null then
    raise exception 'USER_STATUS_INVALID' using errcode = 'P0001';
  end if;

  perform public.almox_lock_admins_and_check(p_user_id,
    coalesce((select role from public.profiles where id = p_user_id), 'employee'), p_active);

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_profile.active = p_active then
    return jsonb_build_object('id', v_profile.id, 'role', v_profile.role, 'active', v_profile.active, 'changed', false);
  end if;

  -- RLS consulta profiles.active em toda requisição: a próxima chamada protegida
  -- do usuário desativado já é negada, mesmo com JWT ainda válido (TA10).
  update public.profiles set active = p_active where id = p_user_id returning * into v_profile;
  return jsonb_build_object('id', v_profile.id, 'role', v_profile.role, 'active', v_profile.active, 'changed', true);
end;
$$;
revoke all on function public.almox_set_user_active(uuid, boolean) from public;
grant execute on function public.almox_set_user_active(uuid, boolean) to authenticated;

-- Convite em duas fases, chamado pela Edge Function no contexto (JWT) do administrador.
-- Fase 1: registra/recupera o pedido de forma idempotente.
create or replace function public.almox_begin_access_request(
  p_email text,
  p_display_name text,
  p_role public.almox_role,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid := auth.uid();
  v_email text := lower(btrim(p_email));
  v_name text := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
  v_request public.access_requests;
begin
  if not public.almox_is_admin() then
    raise exception 'USER_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_operation_key is null or char_length(btrim(p_operation_key)) not between 1 and 120 then
    raise exception 'OPERATION_KEY_INVALID' using errcode = 'P0001';
  end if;
  if v_email is null or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'INVITE_EMAIL_INVALID' using errcode = 'P0001';
  end if;
  if char_length(v_name) not between 1 and 120 then
    raise exception 'INVITE_NAME_INVALID' using errcode = 'P0001';
  end if;

  insert into public.access_requests (actor_id, operation_key, target_email, display_name, role)
  values (v_actor, btrim(p_operation_key), v_email, v_name, coalesce(p_role, 'employee'))
  on conflict (actor_id, operation_key) do nothing;

  select * into v_request from public.access_requests
  where actor_id = v_actor and operation_key = btrim(p_operation_key)
  for update;

  if v_request.target_email <> v_email or v_request.display_name <> v_name or v_request.role <> coalesce(p_role, 'employee') then
    raise exception 'OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT' using errcode = 'P0001';
  end if;

  if v_request.status = 'pending' and exists (select 1 from auth.users u where lower(u.email) = v_email) then
    update public.access_requests set status = 'failed', error_code = 'USER_ALREADY_EXISTS'
    where id = v_request.id returning * into v_request;
  end if;

  return to_jsonb(v_request);
end;
$$;
revoke all on function public.almox_begin_access_request(text, text, public.almox_role, text) from public;
grant execute on function public.almox_begin_access_request(text, text, public.almox_role, text) to authenticated;

-- Fase 2: após o Auth criar o usuário, cria o perfil SEM acesso ativo e conclui o pedido.
create or replace function public.almox_complete_access_request(p_request_id uuid, p_auth_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.access_requests;
begin
  if not public.almox_is_admin() then
    raise exception 'USER_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  select * into v_request from public.access_requests where id = p_request_id for update;
  if not found then
    raise exception 'ACCESS_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_request.status = 'completed' then
    return to_jsonb(v_request);
  end if;
  if not exists (select 1 from auth.users u where u.id = p_auth_user_id and lower(u.email) = v_request.target_email) then
    raise exception 'INVITE_AUTH_USER_MISMATCH' using errcode = 'P0001';
  end if;

  insert into public.profiles (id, display_name, role, active)
  values (p_auth_user_id, v_request.display_name, v_request.role, false)
  on conflict (id) do nothing;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, operation_key, recorded_at)
  values (auth.uid(), 'INVITE', 'profiles', p_auth_user_id, null,
          jsonb_build_object('email', v_request.target_email, 'role', v_request.role, 'request_id', v_request.id),
          v_request.operation_key, now());

  update public.access_requests
  set status = 'completed', auth_user_id = p_auth_user_id, error_code = null
  where id = v_request.id returning * into v_request;
  return to_jsonb(v_request);
end;
$$;
revoke all on function public.almox_complete_access_request(uuid, uuid) from public;
grant execute on function public.almox_complete_access_request(uuid, uuid) to authenticated;

create or replace function public.almox_fail_access_request(p_request_id uuid, p_error_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_request public.access_requests;
begin
  if not public.almox_is_admin() then
    raise exception 'USER_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  update public.access_requests
  set status = 'failed', error_code = left(coalesce(p_error_code, 'INVITE_FAILED'), 80)
  where id = p_request_id and status = 'pending'
  returning * into v_request;
  if not found then
    select * into v_request from public.access_requests where id = p_request_id;
  end if;
  return to_jsonb(v_request);
end;
$$;
revoke all on function public.almox_fail_access_request(uuid, text) from public;
grant execute on function public.almox_fail_access_request(uuid, text) to authenticated;

commit;
