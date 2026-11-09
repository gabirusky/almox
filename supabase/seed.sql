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

-- Manual profile bootstrap (replace UUIDs with real auth.users ids):
-- insert into public.profiles (id, display_name, role, active)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'Admin Teste', 'admin', true),
--   ('00000000-0000-0000-0000-000000000002', 'Operador Teste', 'employee', true);
--
-- Example product creation (admin session): select public.almox_create_product('LUV-001','Luva nitrílica','Caixa com luvas',(select id from public.categories where name_normalized='epi'),'CX',5,null);
