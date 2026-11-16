-- ALMOX first-admin bootstrap for the hosted Supabase project.
--
-- Prerequisites:
--   1. Authentication -> Users -> Add user
--      - email: the admin's real email
--      - password: a strong password (the app requires at least 8 chars)
--      - Auto Confirm User: ON
--   2. Confirme o e-mail abaixo (preenchido com o e-mail dos commits do autor;
--      se o e-mail do Auth for diferente, substitua antes de executar).

do $$
declare
  v_email text := 'gpereiragsantos@gmail.com';
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