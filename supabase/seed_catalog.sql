-- ALMOX production seed: reference catalog only.
-- Safe to run on the hosted Supabase project. It does NOT create auth users
-- and does NOT touch auth.* (unlike supabase/seed.sql, which is local/dev only).
-- Idempotent: re-running does not duplicate categories/departments.

begin;

insert into public.categories (name, active)
select v.name, true
from (values ('EPI'), ('Ferramentas'), ('Escritório'), ('Limpeza')) as v(name)
where not exists (
  select 1 from public.categories c
  where c.name_normalized = public.almox_normalize_name(v.name)
);

insert into public.departments (name, active)
select v.name, true
from (values ('Manutenção'), ('Produção'), ('Administrativo'), ('Expedição')) as v(name)
where not exists (
  select 1 from public.departments d
  where d.name_normalized = public.almox_normalize_name(v.name)
);

commit;