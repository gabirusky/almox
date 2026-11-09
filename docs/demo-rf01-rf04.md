# Demo manual — RF01–RF04 (T092)

## Pré-requisitos
1. `cd app && npm install && copy .env.example .env.local` (preencher URL/chave anon).
2. `npx supabase start && npx supabase db reset` na raiz.
3. Criar usuários no Supabase Auth (admin/funcionário) e inserir perfis ativos em `public.profiles` (ver `supabase/seed.sql`).

## Roteiro
1. **RF01 (acesso):** login com credenciais válidas abre sessão; logout encerra; rota `/produtos` sem sessão redireciona para `/login`.
2. **RF02 (permissão UI):** admin vê ações de cadastro/edição/inativação; funcionário visualiza dados sem manutenção administrativa.
3. **RF02 (permissão API):** com token de funcionário, tentar `insert/update` em `categories/products` ou RPC `almox_create_product` deve falhar (RLS/FORBIDDEN). Usar `supabase/tests/rf01_rf04_permission_checks.sql` como base.
4. **RF03 (produto):** admin cria produto com SKU, nome, categoria ativa, unidade e mínimo; confirmar saldo inicial 0. Tentar SKU duplicado (inclusive variação normalizada) deve retornar erro claro.
5. **RF03 (inativação):** produto com saldo 0 pode inativar (com confirmação). Produto com saldo != 0 deve ser recusado pelo banco/regra (quando aplicável).
6. **RF04 (categorias/setores):** admin cria/edita/inativa; categoria com produtos ativos não inativa. Itens inativos ficam marcados e não devem ser usados como seleção ativa em novos cadastros.
7. **RNF04 (auditoria):** admin consulta `public.audit_events` e verifica `actor_id`, `action`, `entity_type`, `before_data/after_data`, `recorded_at` após mutações.
8. **Acessibilidade/usabilidade (RNF06/RNF07):** navegação por teclado, labels, mensagens de erro visíveis, confirmação antes de inativar, layout utilizável em 360/1366 px.
