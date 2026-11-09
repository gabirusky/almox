-- ALMOX RF01/RF02/RNF01/RNF04 - RLS, role helper, policies, audit (T030-T036)
-- Security model: RLS enabled; frontend uses anon key + user JWT only.
-- Policies use SECURITY DEFINER helpers with fixed search_path to avoid recursion/pitfalls.

begin;

-- T031: safe current profile helpers (bypass RLS safely, fixed search_path)
create or replace function public.almox_current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public, auth
as $$
  select p
  from public.profiles p
  where p.id = auth.uid()
    and p.active = true
  limit 1;
$$;

create or replace function public.almox_is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  );
$$;

create or replace function public.almox_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true and p.role = 'admin'
  );
$$;

revoke all on function public.almox_current_profile() from public;
revoke all on function public.almox_is_active_user() from public;
revoke all on function public.almox_is_admin() from public;
grant execute on function public.almox_is_active_user() to authenticated;
grant execute on function public.almox_is_admin() to authenticated;

-- T030: enable RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.departments enable row level security;
alter table public.products enable row level security;
alter table public.stock_balances enable row level security;
alter table public.audit_events enable row level security;

-- profiles: users can read own row when active context applies; admins can read/manage (RF16 expands later)
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
for select to authenticated
using (id = auth.uid() and active = true);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
for all to authenticated
using (public.almox_is_admin())
with check (public.almox_is_admin());

-- Catalog read: any active authenticated user (employee/admin). Writes: admin only.
drop policy if exists categories_select_active_users on public.categories;
create policy categories_select_active_users on public.categories
for select to authenticated
using (public.almox_is_active_user());

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
for all to authenticated
using (public.almox_is_admin())
with check (public.almox_is_admin());

drop policy if exists departments_select_active_users on public.departments;
create policy departments_select_active_users on public.departments
for select to authenticated
using (public.almox_is_active_user());

drop policy if exists departments_admin_write on public.departments;
create policy departments_admin_write on public.departments
for all to authenticated
using (public.almox_is_admin())
with check (public.almox_is_admin());

drop policy if exists products_select_active_users on public.products;
create policy products_select_active_users on public.products
for select to authenticated
using (public.almox_is_active_user());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
for all to authenticated
using (public.almox_is_admin())
with check (public.almox_is_admin());

drop policy if exists stock_balances_select_active_users on public.stock_balances;
create policy stock_balances_select_active_users on public.stock_balances
for select to authenticated
using (public.almox_is_active_user());

-- stock_balances writes only through controlled DB paths (RPC/definer functions in T040+)
drop policy if exists stock_balances_admin_write on public.stock_balances;
create policy stock_balances_admin_write on public.stock_balances
for all to authenticated
using (public.almox_is_admin())
with check (public.almox_is_admin());

-- T035: audit events - admin read; inserts only via trigger/definer path
drop policy if exists audit_events_admin_select on public.audit_events;
create policy audit_events_admin_select on public.audit_events
for select to authenticated
using (public.almox_is_admin());

revoke insert, update, delete on public.audit_events from anon, authenticated;

-- T034: audit capture
create or replace function public.almox_write_audit()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor uuid;
  v_action text;
  v_entity uuid;
begin
  v_actor := auth.uid();
  v_action := case
    when tg_op = 'INSERT' then 'INSERT'
    when tg_op = 'UPDATE' and coalesce((to_jsonb(new)->>'active')::boolean, true) = false
         and coalesce((to_jsonb(old)->>'active')::boolean, true) = true then 'INACTIVATE'
    when tg_op = 'UPDATE' and coalesce((to_jsonb(new)->>'active')::boolean, false) = true
         and coalesce((to_jsonb(old)->>'active')::boolean, false) = false then 'REACTIVATE'
    when tg_op = 'UPDATE' then 'UPDATE'
    else tg_op
  end;
  v_entity := coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid);

  insert into public.audit_events (actor_id, action, entity_type, entity_id, before_data, after_data, recorded_at)
  values (
    v_actor,
    v_action,
    tg_table_name,
    v_entity,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    now()
  );
  return coalesce(new, old);
exception when others then
  -- RNF02/RNF04: fail the business operation if audit cannot be recorded
  raise exception 'AUDIT_WRITE_FAILED: %', sqlerrm using errcode = 'P0001';
end;
$$;

revoke all on function public.almox_write_audit() from public;

drop trigger if exists trg_audit_categories on public.categories;
create trigger trg_audit_categories
after insert or update on public.categories
for each row execute function public.almox_write_audit();

drop trigger if exists trg_audit_departments on public.departments;
create trigger trg_audit_departments
after insert or update on public.departments
for each row execute function public.almox_write_audit();

drop trigger if exists trg_audit_products on public.products;
create trigger trg_audit_products
after insert or update on public.products
for each row execute function public.almox_write_audit();

commit;
