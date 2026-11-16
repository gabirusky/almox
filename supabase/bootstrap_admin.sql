-- ALMOX first-admin bootstrap for the hosted Supabase project.
--
-- Prerequisites:
--   1. Authentication -> Users -> Add user
--      - email: the admin's real email
--      - password: a strong password (the app requires at least 8 chars)
--      - Auto Confirm User: ON
--   2. Replace COLOQUE_SEU_EMAIL_AQUI below with that exact email.
--
-- Then run this file in the SQL Editor. It fails loudly if the auth user is
-- missing, so a typo cannot silently leave the project without an admin.
-- The profile is created active with role admin (RN17 / last-admin protection
-- is enforced later by the RF16 functions).

do $$
declare
  v_email text := 'COLOQUE_SEU_EMAIL_AQUI';
  v_name text := 'gabirusky';
  v_user_id uuid;
begin
  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_email)
  limit 1;

  if v_user_id is null then
    raise exception
      'AUTH_USER_NOT_FOUND: crie o usuário % em Authentication -> Users (Auto Confirm) antes de executar este script.',
      v_email;
  end if;

  insert into public.profiles (id, display_name, role, active)
  values (v_user_id, v_name, 'admin', true)
  on conflict (id) do update
  set display_name = excluded.display_name,
      role = 'admin',
      active = true;
end $$;

select id, display_name, role, active
from public.profiles
where role = 'admin'
order by created_at;