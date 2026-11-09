# ALMOX — Controle de Estoque de Almoxarifado

Sistema web para controle interno de estoque com rastreabilidade (autor, data/hora do servidor, motivo e efeito de cada operação), perfis `admin`/`employee` e regras de consistência aplicadas no banco.

> **Status:** análise concluída; implementação iniciada pelo recorte **RF01–RF04** (este responsável). Documento-fonte: `Análise de Requisitos e Arquitetura de Software.md`.

## Objetivo (MVP)
Permitir consulta confiável de saldo, movimentações rastreáveis e correções auditáveis em um único almoxarifado, conforme escopo da análise (RF01–RF16 planejados; fora do MVP: multi-depósito, compras/fiscal, patrimônio individual, lotes/séries, anexos, aprovações, offline, ERP).

## Escopo desta implementação (RF01–RF04)

| ID | Prioridade | Requisito | Estado |
|---|---|---|---|
| RF01 | P0 | Autenticar usuários (e-mail/senha), sessão e recuperação de senha | planejado |
| RF02 | P0 | Permissões `admin`/`employee` em toda operação protegida (UI + API/DB) | planejado |
| RF03 | P0 | Produtos: cadastrar/consultar/editar/inativar (lógico), SKU único normalizado, saldo inicial 0, auditoria de alterações | planejado |
| RF04 | P0 | Categorias e setores: manutenção administrativa, referências históricas preservadas, inativos não selecionáveis em novas operações | planejado |

## Requisitos não funcionais atrelados (RF01–RF04)

| NFR | Aplicação no recorte |
|---|---|
| RNF01 Segurança | Rotas/dados protegidos exigem identidade válida e perfil ativo; matriz anônimo/funcionário/admin/inativo verificada via API. |
| RNF02 Integridade | Escritas compostas (ex.: produto + saldo zero) atômicas no banco. |
| RNF03 Concorrência | Modelo preparado para bloqueio/versionamento em movimentações (RF07+). |
| RNF04 Rastreabilidade | Alterações concluídas registram autor, horário do servidor, ação e antes/depois (auditoria no banco). |
| RNF05 Desempenho | Consultas pagináveis/indexadas; meta p95 validada em homologação (E7). |
| RNF06 Usabilidade | Interface PT-BR, erros claros, confirmação antes de inativar. |
| RNF07 Acessibilidade/compatibilidade | Teclado, foco visível, rótulos, erros associados, contraste, 360/1366 px, Chrome/Firefox estáveis. |
| RNF08 Manutenibilidade | TypeScript estrito, módulos por domínio, migrações versionadas, setup reproduzível, seed. |
| RNF09 Recuperação | Sem garantias no protótipo; validar backup/restore antes de uso real. |
| RNF10 Privacidade/observabilidade | Mínimo de dados; sem senhas/tokens/chaves em logs/cliente. |

## Arquitetura proposta
- **Frontend:** React + TypeScript + Vite; Tailwind CSS + shadcn/ui; React Router; TanStack Query; React Hook Form + Zod.
- **Backend (BaaS):** Supabase Auth + PostgreSQL + PostgREST/RPC.
- **Regras críticas:** RLS, constraints, funções/triggers no PostgreSQL (fonte de verdade para autorização e invariantes). Frontend usa apenas chave publicável/anon + JWT do usuário; **nunca** `service_role` no cliente.

## Stack e versões (decisão inicial — T003)

| Componente | Versão alvo (fixar em `package.json`/lockfile no scaffold) | Observação |
|---|---|---|
| Node.js | 20 LTS (mín.) / 22 LTS recomendado | Alinhar com CI/equipe |
| npm | 10+ | Ou pnpm equivalente, se o grupo padronizar |
| React | 19.x | Fixar versão exata ao scaffold |
| TypeScript | 5.9.x (strict) | `strict: true`, `noUncheckedIndexedAccess` recomendado |
| Vite | 7.x (ou estável vigente no scaffold) | Template React + TS |
| React Router | 7.x | Rotas protegidas |
| TanStack Query | 5.x | Cache/mutações |
| React Hook Form | 7.x | Formulários |
| Zod | 3.x ou 4.x (definir no scaffold) | Validação cliente + esquemas |
| @supabase/supabase-js | 2.x | Cliente Auth/Data API |
| Supabase CLI | estável vigente (fixar via `npx`/devDependency) | Migrações locais/remotas |
| PostgreSQL (Supabase) | 15+ (gerenciado) | `NUMERIC(14,3)` para quantidades/saldos |

> As versões exatas serão **congeladas** no primeiro scaffold (`package.json` + lockfile) e registradas aqui.

## Estrutura planejada
```text
app/                    # frontend (a criar no scaffold)
  src/modules/
    access/             # RF01/RF02
    catalog/            # RF03/RF04
    audit/              # leitura/admin (futuro)
    shared/
supabase/
  migrations/           # SQL versionado (schema, RLS, funções, triggers)
  seed.sql              # dados fictícios reproduzíveis
```

## Configuração local (placeholder — completar no scaffold)

### Pré-requisitos
- Node.js 20+ e npm
- Supabase CLI (ou Docker para stack local, conforme docs Supabase)

### Variáveis de ambiente
Copiar `.env.example` para `.env.local` (não commitar):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### Comandos (frontend em `app/`)
```bash
cd app
npm install
copy .env.example .env.local   # preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

npm run dev
npm run typecheck
npm run lint
npm run build
```

### Supabase local (T020+)
Requer Supabase CLI e runtime compatível (Docker, conforme setup local).
```bash
npx supabase start
npx supabase db reset   # aplica migrations + supabase/seed.sql
```

Após criar usuários no Auth (Studio/local), vincule perfis em `public.profiles` (ver `supabase/seed.sql`). Cadastro público está desabilitado (`enable_signup=false`).

Validação SQL de referência (RNF01): `supabase/tests/rf01_rf04_permission_checks.sql`.

## Estado implementado (nesta entrega)
- **Supabase (RF01–RF04 base):** schema/migrations para `profiles`, `categories`, `departments`, `products`, `stock_balances`, `audit_events`; normalização de SKU/nome; RLS + helpers de perfil ativo/admin; políticas de leitura/escrita; trilha de auditoria em triggers (falha de auditoria aborta operação); RPC atômica `almox_create_product`; guards RN14/RN15 (saldo zero para inativar produto, categoria com produtos ativos, categoria inativa em produto, trava de unidade pós-primeiro movimento).
- **Frontend (RF01/RF02):** rotas `/login`, `/recuperar-senha`, `/acesso-inativo`, `/configuracao`; contexto de sessão/perfil Supabase; guards de autenticação/papel (UI) e UX PT-BR com labels/erros/foco básico.
- **Pendente (próximas tarefas):** UI de catálogo RF03/RF04 (T060–T074), testes automatizados DB/API (T080–T082), ajustes de lint warning shadcn, execução real dos checks de permissão em ambiente Supabase ativo.

## Segurança e dados
- Sem cadastro público; perfis controlados administrativamente.
- Chaves secretas/`service_role` **nunca** no frontend ou repositório.
- Operações críticas validadas no banco; UI não é fonte de autorização.
- Autor/data de domínio vêm de sessão/servidor (RN13).

## Planejamento
- `PLAN.md` / `TASKS.md` / `CONTEXT.md` — apoio local do agente (gitignored).
- Próximas entregas seguem análise: E1 acesso/consulta inicial, E2 manutenção de catálogo (RF01–RF04), depois RF05+.
