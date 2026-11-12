-- RF13: Bloquear duplicação em categorias, setores e produtos

-- Índice único para categorias (ignora maiúsculas/minúsculas e espaços nas pontas)
create unique index if not exists categories_name_unique_idx 
on public.categories (lower(trim(name)));

-- Índice único para departamentos/setores
create unique index if not exists departments_name_unique_idx 
on public.departments (lower(trim(name)));

-- Índice único para SKU de produtos (se aplicável ao seu catálogo)
create unique index if not exists products_sku_unique_idx 
on public.products (lower(trim(sku)));