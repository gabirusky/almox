# RF14/RF15/RF16 — painel, exportação CSV e gestão de acessos

A migration `20261112120000_rf14_rf16_dashboard_export_users.sql` adiciona as RPCs do painel, da exportação e da gestão de usuários. A Edge Function `supabase/functions/admin-invite` faz o convite pela API administrativa de Auth. Aplicar em ambiente local descartável ou homologação antes de uso real.

## Preparação

1. `npx supabase start` e `npx supabase db reset` na raiz (aplica migrations e seed; apaga dados locais).
2. Servir a função localmente: `npx supabase functions serve admin-invite`. Em projeto hospedado: `npx supabase functions deploy admin-invite`.
   - A função lê `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` do ambiente da própria função (fornecidas pelo Supabase). A `service_role` **nunca** vai para o frontend.
   - Opcional: `ALMOX_ALLOWED_ORIGIN` restringe o CORS à origem do frontend.
3. Configurar `app/.env.local` e iniciar `npm run dev` em `app/`.
4. Checks SQL automáticos (rollback ao final): `supabase/tests/rf14_rf16_checks.sql`.

Sem Supabase, os três fluxos funcionam no **modo offline/mock** (dados no `localStorage`), apenas para demonstração.

## RF14 — painel (`/`)

- Indicadores: produtos ativos (e inativos), itens no limite mínimo (saldo ≤ mínimo), itens zerados e movimentos dos últimos 7 dias.
- Lista de alertas prioriza zerados e depois menor cobertura (saldo ÷ mínimo); botão "Repor" abre a entrada com o produto pré-selecionado.
- Todos os números vêm de uma única chamada `almox_dashboard_summary` (função `STABLE`: mesmo snapshot para indicadores e lista).
- Conferência: registrar uma saída que deixe o saldo ≤ mínimo e recarregar o painel; o item deve aparecer no alerta e o contador subir.
- Funcionário e administrador ativos consultam; anônimo e inativo são recusados (`ACTIVE_PROFILE_REQUIRED`).

## RF15 — relatórios CSV (`/relatorios`, administrador)

- **Saldo**: filtros de categoria e situação (todos, ativos, inativos, zerados, no limite mínimo).
- **Movimentações**: período, produto, tipo, responsável e setor; até 50.000 linhas (`EXPORT_TOO_LARGE` acima disso).
- O arquivo começa com o nome do relatório, o **momento da geração no servidor**, os **filtros aplicados** e a contagem de linhas; depois vem o cabeçalho.
- As linhas são produzidas por um único comando SQL (consulta consistente). Cada exportação gera um evento `EXPORT` em `audit_events` com filtros e quantidade de linhas.
- Formato: UTF-8 com BOM, separador `;`, decimais com vírgula. Textos iniciados por `=`, `+`, `-` ou `@` recebem apóstrofo (proteção contra injeção de fórmulas).
- Funcionário que chama a RPC diretamente recebe `EXPORT_ADMIN_REQUIRED`.

## RF16 — usuários (`/usuarios`, administrador)

- **Convite**: nome, e-mail e perfil. A Edge Function abre o pedido (`almox_begin_access_request`) no contexto do administrador, chama `inviteUserByEmail` e conclui (`almox_complete_access_request`). O perfil nasce **inativo**; o administrador clica em "Habilitar" quando autorizado.
- Repetir o mesmo convite (mesma chave e conteúdo) retorna o pedido original; mesma chave com outro conteúdo é recusada; e-mail já existente marca o pedido como falho (`USER_ALREADY_EXISTS`).
- **Perfil e situação**: `almox_set_user_role` / `almox_set_user_active`. Ambas bloqueiam as linhas de administradores ativos antes de decidir, então operações concorrentes não removem o último administrador ativo (RN17 → `LAST_ADMIN_REQUIRED`).
- **Desativação imediata (TA10)**: as políticas RLS e as RPCs consultam `profiles.active` a cada requisição; o usuário desativado com sessão aberta é negado na próxima chamada protegida.
- Escrita direta em `profiles` foi revogada para `authenticated`; alterações passam pelas funções e geram auditoria (trigger `trg_audit_profiles` + evento `INVITE`).
- Conferência manual: convidar, abrir o e-mail na caixa local do Supabase (`[local_smtp]`, porta 54324), definir senha, tentar entrar (acesso inativo), habilitar e entrar novamente.
