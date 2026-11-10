-- ALMOX seed (T029) - fictitious/dev data only. No real secrets.
-- Prerequisites: create auth users in Supabase Auth (Studio/CLI), then insert matching profiles.
-- Local dev tip: after `supabase start`, create users and run profile inserts below with their UUIDs.

begin;

-- Catalog reference data (idempotent-ish by normalized unique name; safe to re-run if empty)
insert into public.categories (name, active)
select v.name, true
from (values ('EPI'), ('Ferramentas'), ('Escritório'), ('Limpeza')) as v(name)
where not exists (
  select 1 from public.categories c where c.name_normalized = public.almox_normalize_name(v.name)
);

insert into public.departments (name, active)
select v.name, true
from (values ('Manutenção'), ('Produção'), ('Administrativo'), ('Expedição')) as v(name)
where not exists (
  select 1 from public.departments d where d.name_normalized = public.almox_normalize_name(v.name)
);

commit;

-- -----------------------------------------------------------------------------
-- Mock auth users + profiles (local/dev only, deterministic)
-- Login (local): admin@almox.test / Test1234!  |  operador@almox.test / Test1234!
-- Safe to re-run; inserts into auth.* require local/dev DB privileges.
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;

do $$
declare
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
  v_now timestamptz := now();
  v_pw text := crypt('Test1234!', gen_salt('bf'));
begin
  -- admin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
    email_change_token_current, email_change_confirm_status, banned_until,
    reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
  ) values (
    v_instance, '9018e72c-b54e-4fcc-8f36-14edd2848ea5', 'authenticated', 'authenticated',
    'admin@almox.test', v_pw, v_now,
    null, '', null, '', null,
    '', '', null, null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Admin Teste","email_verified":true}'::jsonb,
    null, v_now, v_now,
    null, null, '', '', null,
    '', 0, null,
    '', null, false, null, false
  )
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    '28863606-3275-4467-92f3-ae743977c8a7',
    '9018e72c-b54e-4fcc-8f36-14edd2848ea5',
    '9018e72c-b54e-4fcc-8f36-14edd2848ea5',
    jsonb_build_object('sub','9018e72c-b54e-4fcc-8f36-14edd2848ea5','email','admin@almox.test','email_verified',true,'phone_verified',false),
    'email', v_now, v_now, v_now
  )
  on conflict (id) do update set
    identity_data = excluded.identity_data,
    updated_at = excluded.updated_at;

  -- operador
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
    email_change_token_current, email_change_confirm_status, banned_until,
    reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
  ) values (
    v_instance, '4515bbb4-df35-4d9f-8ece-5c8d391e2619', 'authenticated', 'authenticated',
    'operador@almox.test', v_pw, v_now,
    null, '', null, '', null,
    '', '', null, null,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Operador Teste","email_verified":true}'::jsonb,
    null, v_now, v_now,
    null, null, '', '', null,
    '', 0, null,
    '', null, false, null, false
  )
  on conflict (id) do update set
    email = excluded.email,
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
    raw_app_meta_data = excluded.raw_app_meta_data,
    raw_user_meta_data = excluded.raw_user_meta_data,
    updated_at = excluded.updated_at;

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    '789aea39-940a-4163-8a5f-52d4d0571ecb',
    '4515bbb4-df35-4d9f-8ece-5c8d391e2619',
    '4515bbb4-df35-4d9f-8ece-5c8d391e2619',
    jsonb_build_object('sub','4515bbb4-df35-4d9f-8ece-5c8d391e2619','email','operador@almox.test','email_verified',true,'phone_verified',false),
    'email', v_now, v_now, v_now
  )
  on conflict (id) do update set
    identity_data = excluded.identity_data,
    updated_at = excluded.updated_at;
end $$;

insert into public.profiles (id, display_name, role, active)
values
  ('9018e72c-b54e-4fcc-8f36-14edd2848ea5', 'Admin Teste', 'admin', true),
  ('4515bbb4-df35-4d9f-8ece-5c8d391e2619', 'Operador Teste', 'employee', true)
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  active = excluded.active;

-- Example product creation (admin session): select public.almox_create_product('LUV-001','Luva nitrílica','Caixa com luvas',(select id from public.categories where name_normalized='epi'),'CX',5,null);
