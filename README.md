# ALMOX — Controle de Estoque de Almoxarifado

Sistema web para controle interno de estoque com rastreabilidade (autor, data/hora do servidor, motivo e efeito de cada operação), perfis `admin`/`employee` e regras de consistência aplicadas no banco.

> **Status:** base implementada até **RF08** (acesso, catálogo, consulta, saldo/histórico, entrada e saída). RF08 requer aplicação da migration e validação integrada no Supabase antes de uso real. Documento-fonte: `Análise de Requisitos e Arquitetura de Software.md`.

## Objetivo (MVP)
Consulta confiável de saldo, movimentações rastreáveis e correções auditáveis em um único almoxarifado (escopo analisado RF01–RF16). Fora do MVP: multi-depósito, compras/fiscal, patrimônio individual, lotes/séries, anexos, aprovações, offline, ERP.

## Escopo implementado (estado atual)

| ID | Prioridade | Requisito | Estado |
|---|---|---|---|
| RF01 | P0 | Autenticação (e-mail/senha), sessão, recuperação de senha | implementado (base) |
| RF02 | P0 | Permissões `admin`/`employee` em operações protegidas (UI + DB/RLS) | implementado (base) |
| RF03 | P0 | Produtos: cadastrar/consultar/editar/inativar (lógico), SKU único normalizado, saldo inicial 0, auditoria | implementado |
| RF04 | P0 | Categorias e setores: manutenção admin, referências preservadas, inativos não selecionáveis em novas operações | implementado |
| RF05 | P0 | Consulta de produtos: busca/filtros, situação, ordenação e paginação | implementado |
| RF06 | P0 | Detalhe do produto: saldo atual e histórico de movimentações paginado/ordenado | implementado (base de leitura/histórico) |
| RF07 | P0 | Entrada de estoque atômica, auditável e idempotente | implementado |
| RF08 | P0 | Saída com produto, quantidade, setor, recebedor e motivo | implementado no código; validação integrada pendente |

## Requisitos não funcionais atrelados (RF01–RF08)

| NFR | Aplicação no recorte |
|---|---|
| RNF01 Segurança | Rotas/dados protegidos exigem identidade válida e perfil ativo; matriz anônimo/funcionário/admin/inativo verificada via API. |
| RNF02 Integridade | Movimentação, saldo, comando idempotente e auditoria atômicos no banco. |
| RNF03 Concorrência | Bloqueio do produto/saldo e rechecagem do saldo para impedir duas saídas sobre a mesma quantidade. |
| RNF04 Rastreabilidade | Alterações concluídas registram autor, horário do servidor, ação e antes/depois (auditoria no banco). |
| RNF05 Desempenho | Consultas pagináveis/indexadas; meta p95 validada em homologação (E7). |
| RNF06 Usabilidade | Interface PT-BR, erros claros, confirmação antes de inativar. |
| RNF07 Acessibilidade/compatibilidade | Teclado, foco visível, rótulos, erros associados, contraste, 360/1366 px, Chrome/Firefox estáveis. |
| RNF08 Manutenibilidade | TypeScript estrito, módulos por domínio, migrações versionadas, setup reproduzível, seed. |
| RNF09 Recuperação | Sem garantias no protótipo; validar backup/restore antes de uso real. |
| RNF10 Privacidade/observabilidade | Mínimo de dados; sem senhas/tokens/chaves em logs/cliente. |

## Arquitetura
- **Frontend:** React 19 + TypeScript + Vite 8 (`app/`), Tailwind CSS 4, shadcn/ui, React Router, TanStack Query, React Hook Form + Zod.
- **Backend (BaaS):** Supabase Auth + PostgreSQL + PostgREST/RPC.
- **Regras críticas:** RLS, constraints, funções/triggers/RPC no PostgreSQL (fonte de verdade para autorização e invariantes). Frontend usa apenas chave publicável/anon + JWT; **nunca** `service_role` no cliente.

## Stack (atual, `app/package.json`)
| Componente | Versão |
|---|---|
| Node.js | 20+ (recomendado 22 LTS) |
| npm | 10+ |
| React | 19.x |
| TypeScript | ~7.x (`strict`, configs app/node) |
| Vite | 8.x |
| React Router | 8.x |
| TanStack Query | 5.x |
| React Hook Form / @hookform/resolvers | 7.x / 7.x |
| Zod | 4.x |
| @supabase/supabase-js | 2.x |
| Tailwind CSS | 4.x |
| Vitest / Testing Library | 5.x / 16.x |

## Estrutura
```text
app/
  src/
    components/ui/        # base shadcn/ui
    modules/
      access/             # RF01/RF02 (auth, guards, perfis/sessão)
      catalog/            # RF03–RF08 (produtos, categorias, setores, detalhe, entrada, saída)
      shared/             # erros, confirmações, utilitários comuns
supabase/
  migrations/             # SQL versionado (schema, RLS, auditoria, domínio, histórico, entradas)
  seed.sql                # dados fictícios reproduzíveis
  tests/                  # checks SQL de referência
docs/                     # handoffs e roteiros de demo
```

## Rotas principais (`app/src/App.tsx`)
- `/` — início
- `/login`, `/recuperar-senha`, `/acesso-inativo`, `/configuracao` — acesso/estado
- `/produtos`, `/produtos/:id` — consulta, cadastro/edição/inativação (admin), saldo e histórico
- `/movimentacoes/nova` — registro de entrada (RF07)
- `/movimentacoes/saida` — registro de saída (RF08)
- `/categorias`, `/setores` — manutenção administrativa
- `/app` — área autenticada (alias/home protegida)

## Configuração local

### Pré-requisitos
- Node.js 20+ e npm
- Supabase CLI + runtime compatível (ex.: Docker) para stack local

### Variáveis de ambiente
Copiar `app/.env.example` para `app/.env.local` (não commitar):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Frontend (`app/`)
```bash
cd app
npm install
copy .env.example .env.local   # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
```

### Supabase local
```bash
npx supabase start
npx supabase db reset   # aplica migrations + supabase/seed.sql
```

- `supabase/config.toml` desabilita cadastro público (`enable_signup=false`).
- `supabase/seed.sql` inclui **mock users/profiles persistentes (local/dev)**, recriados a cada `db reset`:
  - `admin@almox.test` / `Test1234!` (`admin`, ativo)
  - `operador@almox.test` / `Test1234!` (`employee`, ativo)
  - também semeia categorias/setores de referência
- Metadados locais do CLI são ignorados: `supabase/.temp/` (commit `26d6cf3`).
- Validação SQL de referência (RNF01/RF01–RF04): `supabase/tests/rf01_rf04_permission_checks.sql`.

## Migrations Supabase (ordem no repositório)
- `20261109201907_t020_t029_rf01_rf04_schema.sql` — schema/base catálogo e perfis
- `20261109201908_t030_t036_rls_audit.sql` — RLS e auditoria
- `20261109201909_t040_t045_domain_logic.sql` — regras de domínio/RPC catálogo
- `20261110190000_t094_t098_rf06_stock_history.sql` — histórico de movimentações (base RF06)
- `20261110191000_t121_t128_rf07_entries.sql` — comandos/entrada atômica e idempotente (RF07)
- `20261110192000_rf08_exits.sql` — saída atômica/idempotente e fechamento de escrita direta no saldo (RF08)

## Estado e notas
- **Implementado no código:** RF01–RF08. Saída usa `almox_register_exit` para validar saldo, setor e permissão no banco; grava movimento negativo, saldo, versão, auditoria e resultado idempotente na mesma transação. A tela exige revisão antes do envio e mostra o destino no histórico.
- **Pendente de validação integrada:** aplicar migrations em Supabase local/homologação e verificar concorrência, replay, rollback de auditoria e matriz de acesso. O ambiente usado nesta edição não dispõe de Docker/Supabase CLI.
- **Qualidade frontend:** scripts disponíveis `dev`, `build`, `typecheck`, `test`, `lint`. Cobertura automatizada de banco/harness integrado pode exigir ambiente Supabase específico.
- **Privacidade/segredos:** sem `service_role` no frontend; sem senhas/tokens/chaves no repo.

## Docs de apoio
- Demo manual RF01–RF04: `docs/demo-rf01-rf04.md`
- Handoff RF05–RF06 (histórico/estado atual): `docs/rf05-rf06-handoff.md`
- Checks SQL RNF01: `supabase/tests/rf01_rf04_permission_checks.sql`
- Checks SQL RF08: `supabase/tests/rf08_exit_checks.sql`; roteiro manual: `docs/demo-rf08.md`

## Segurança e dados
- Sem cadastro público; perfis controlados administrativamente.
- Chaves secretas/`service_role` **nunca** no frontend ou repositório.
- Operações críticas validadas no banco; UI não é fonte de autorização.
- Autor/data de domínio vêm de sessão/servidor (RN13).
- Metadados locais Supabase CLI ignorados: `supabase/.temp/` (commit `26d6cf3`).

## Planejamento
- `PLAN.md` / `TASKS.md` / `CONTEXT.md` — apoio local do agente (gitignored).
- Próximas entregas seguem análise: RF09+ (estorno, contagem e consultas ampliadas conforme backlog).
