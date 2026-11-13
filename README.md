# ALMOX — Controle de Estoque de Almoxarifado

Sistema web para controle interno de estoque com rastreabilidade (autor, data/hora do servidor, motivo e efeito de cada operação), perfis `admin`/`employee` e regras de consistência aplicadas no banco.

> **Status:** código implementado em **RF01–RF11 e RF14–RF16** (acesso, catálogo, consulta, saldo/histórico, entrada, saída, estorno, contagem física, log global, painel de estoque mínimo, exportação CSV e gestão de usuários por convite). RF08–RF11 e RF14–RF16 requerem aplicação das migrations e validação integrada no Supabase antes de uso real. RF12 (tela de auditoria) e RF13 (já aplicado nas operações via `stock_commands`) seguem como próximos passos de interface. Documento-fonte: `Análise de Requisitos e Arquitetura de Software.md`.

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
| RF09 | P0 | Estorno integral administrativo, com justificativa e vínculo ao original | implementado no código; validação integrada pendente |
| RF10 | P0 | Ajuste administrativo pela contagem física, com recusa se o saldo mudou desde a leitura | implementado no código; validação integrada pendente |
| RF11 | P0 | Consulta global de movimentações/histórico com filtros, paginação e rastreabilidade/vínculos de estorno | implementado no código (UI + API/RPC + mock); validação integrada pendente |
| RF14 | P1 | Painel: produtos ativos, itens zerados e itens no limite mínimo, com alertas | implementado no código (RPC `almox_dashboard_summary` + UI + mock); validação integrada pendente |
| RF15 | P1 | Exportação CSV administrativa de saldo e movimentações filtradas, com filtros e momento da geração | implementado no código (RPCs de exportação + auditoria `EXPORT` + UI + mock); validação integrada pendente |
| RF16 | P0 | Gestão de acesso por convite, perfil e situação, sem cadastro público; ao menos um admin ativo | implementado no código (Edge Function `admin-invite` + RPCs + UI + mock); validação integrada pendente |

## Requisitos não funcionais atrelados (RF01–RF11)

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
- **Log de operações (global):** consulta paginada de `stock_movements` (usuários ativos, via RLS) com filtros (período, produto, tipo, responsável, setor), ordenação estável (`recorded_at desc, id desc`), exibição por snapshots/joins permitidos e resolução de vínculos de estorno (`reversal_of`/`reversedBy`) inclusive entre páginas/produtos. Estorno administrativo a partir do log reutiliza as mesmas garantias de RF09 (RPC, idempotência, elegibilidade e erros do banco).
- **UI (Figma + shadcn):** protótipos no Figma, quando existirem, são usados apenas como inspiração de intenção visual e layout. A implementação deve ser reconstruída com componentes shadcn/ui padrão e reutilizáveis, priorizando consistência, acessibilidade e manutenção (servidor MCP do Figma conectado para consulta quando necessário).
- **Identidade visual:** logo ALMOX aplicada no frontend (shell, páginas de acesso/estado e home), com assets em `app/assets/`, `app/src/assets/` e `app/public/`. Arte horizontal (900×528, proporção 1,70:1, fundo transparente, navy `#002030` + verde `#00A060`); `app/assets/logo-nobg.png` guarda a arte-mestra e `app/public/logo_almox.png` é o favicon 256×256.

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
  assets/                 # assets de origem (ex.: logo)
  public/                 # arquivos estáticos públicos (ex.: favicon/logo)
  src/
    assets/               # assets importados pelo frontend
    components/ui/        # base shadcn/ui + primitivas compartilhadas
    lib/                  # utilitários, cliente Supabase, modo/store mock offline
    modules/
      access/             # RF01/RF02 (auth, guards, perfis/sessão)
      catalog/            # RF03–RF11 (produtos, categorias, setores, detalhe, operações/log, entrada, saída, contagem, estorno)
      admin/              # RF14–RF16 (painel, relatórios CSV, usuários/convites)
      shared/             # erros, formatação, confirmações, layout/estados reutilizáveis
supabase/
  migrations/             # SQL versionado (schema, RLS, auditoria, domínio, histórico, entradas)
  seed.sql                # dados fictícios reproduzíveis
  tests/                  # checks SQL de referência
docs/                     # handoffs e roteiros de demo
```

## Rotas principais (`app/src/App.tsx`)
- `/` — landing (anônimo, com transição animada para `/login`) ou **painel RF14** (autenticado)
- `/login`, `/recuperar-senha`, `/acesso-inativo`, `/configuracao` — acesso/estado
- `/definir-senha` — destino dos links de convite (RF16) e recuperação (RF01): define a nova senha
- `/produtos`, `/produtos/:id` — consulta, cadastro/edição/inativação (admin), saldo, histórico e estorno administrativo (RF09)
- `/movimentacoes` — log global de operações/histórico (filtros, paginação, rastreabilidade e estorno elegível)
- `/movimentacoes/nova` — registro de entrada (RF07)
- `/movimentacoes/saida` — registro de saída (RF08)
- `/movimentacoes/ajuste` — ajuste de estoque por contagem física (RF10; administrador)
- `/categorias`, `/setores` — manutenção administrativa
- `/relatorios` — exportação CSV de saldo e movimentações (RF15; administrador)
- `/usuarios` — convites, perfis e situação de usuários (RF16; administrador)
- `/painel`, `/app` — aliases que redirecionam para `/`

## Configuração local

### Pré-requisitos
- Node.js 20+ e npm
- Supabase CLI + runtime compatível (ex.: Docker) para stack local

### Variáveis de ambiente
Copiar `app/.env.example` para `app/.env.local` (não commitar):

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# Opcional: forçar modo offline/mock do frontend
# VITE_OFFLINE_MODE=true
```

> `VITE_BASE_PATH` não é necessário no dia a dia: localmente o site roda em `/`. Apenas o build de deploy no GitHub Pages usa `/almox/`, definido em `.github/workflows/pages.yml`.

> Se `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` não estiverem configuradas, o frontend entra automaticamente em **modo offline/mock** (demo local). Para usar Supabase real/local, preencha as variáveis com valores válidos e reinicie o Vite.

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
- `supabase/seed.sql` inclui **usuários/perfis de teste persistentes (local/dev)**, recriados a cada `db reset`: um `admin` ativo e um `employee` ativo. As credenciais não ficam no repositório.
  - também semeia categorias/setores de referência
- Metadados locais do CLI são ignorados: `supabase/.temp/` (commit `26d6cf3`).
- Validação SQL de referência (RNF01/RF01–RF04): `supabase/tests/rf01_rf04_permission_checks.sql`.

### Modo offline/mock (frontend, sem API)
- **Objetivo:** permitir navegação/demo local quando o Supabase não estiver disponível.
- **Ativação:** automática quando `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` estão ausentes; também pode ser forçado com `VITE_OFFLINE_MODE=true`.
- **Credenciais de demo:** não ficam no repositório; são entregues à parte. Usuários de teste já vêm semeados no mock local.
- **Dados:** catálogo, saldos e movimentações fictícias pré-populadas para exercitar RF01–RF16 na UI (consulta, manutenção admin, entrada/saída, estorno, contagem física, log global, painel com alertas, exportação CSV e convites/perfis de usuários). Convidados no mock nascem inativos e usam a senha padrão de demonstração.
- **Persistência:** estado do mock salvo no navegador (`localStorage`, chaves `almox.offline.*`); limpar essas chaves restaura o seed.
- **Limitação:** é uma simulação de frontend para demonstração/usabilidade — **não substitui** RLS, RPCs, constraints, transações, concorrência e demais garantias do PostgreSQL/Supabase. Para validação integrada/autoridade de regras, use o ambiente Supabase.

### Demo online (GitHub Pages)
Deploy automático a cada push em `main` via `.github/workflows/pages.yml` (build de `app/` em modo offline/mock, artefato publicado no GitHub Pages).

- **URL:** https://gabirusky.github.io/almox/
- **Modo:** offline/mock (`VITE_OFFLINE_MODE=true` no build) — sem Supabase e sem chaves no repositório.
- **Credenciais:** fornecidas fora do repositório (usuários de teste já semeados).
- **Dados:** ficam no navegador (`localStorage`, chaves `almox.offline.*`); limpar o storage restaura o seed. Nada é enviado a servidor.
- **Deep links:** SPA com fallback `404.html` (cópia de `dist/index.html` gerada no build), então `/almox/produtos` e similares funcionam em acesso direto/refresh.

Pull requests rodam apenas verificação (`lint`, `typecheck`, `test`, `build`); deploy só em `main`. Pré-requisito no GitHub: **Settings → Pages → Source = GitHub Actions**.

Para ativar o Supabase depois: adicionar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` como *repository variables*, remover `VITE_OFFLINE_MODE` do build e configurar Supabase Auth (Site URL `https://gabirusky.github.io/almox/`, redirect `/almox/definir-senha`). Detalhes em `docs/deploy-pages.md`.

## Migrations Supabase (ordem no repositório)
- `20261109201907_t020_t029_rf01_rf04_schema.sql` — schema/base catálogo e perfis
- `20261109201908_t030_t036_rls_audit.sql` — RLS e auditoria
- `20261109201909_t040_t045_domain_logic.sql` — regras de domínio/RPC catálogo
- `20261110190000_t094_t098_rf06_stock_history.sql` — histórico de movimentações (base RF06)
- `20261110191000_t121_t128_rf07_entries.sql` — comandos/entrada atômica e idempotente (RF07)
- `20261110192000_rf08_exits.sql` — saída atômica/idempotente e fechamento de escrita direta no saldo (RF08)
- `20261110193000_rf09_reversals.sql` — estorno integral administrativo, com unicidade e proteção do saldo (RF09)
- `20261111120000_rf10_rf11_inventory_and_history.sql` — ajuste pela contagem com versão esperada e consulta paginada filtrável (RF10/RF11)
- `20261112120000_rf14_rf16_dashboard_export_users.sql` — painel (RF14), exportações auditadas (RF15), gestão de usuários com proteção do último admin e pedidos de convite (RF16)

## Edge Function (RF16)
- `supabase/functions/admin-invite` — valida o JWT do administrador, registra o pedido via RPC no contexto dele e só então usa a `service_role` (variável de ambiente da função) para `auth.admin.inviteUserByEmail`. O perfil nasce inativo.
- Local: `npx supabase functions serve admin-invite` · Hospedado: `npx supabase functions deploy admin-invite`.

## Estado e notas
- **UI:** navegação lateral agrupada (Visão geral, Estoque, Cadastros, Administração) com menu em gaveta no mobile, painel com faixa de destaque, landing e login em duas colunas; todas as telas usam os tokens Ledger Bench e componentes shadcn/ui existentes. Frontend modernizado com design system "Ledger Bench" (tokens/tema, tipografia, shell compartilhado, primitivas e componentes reutilizáveis shadcn/ui), logo ALMOX e melhorias de acessibilidade/responsividade nas rotas existentes.
- **Landing ⇄ login (experiência única de acesso):** `/` e `/login` são dois estados visuais do **mesmo** componente (`modules/access/components/AuthExperience.tsx`), montado por uma rota de layout (`AuthLayout`) para que o logo seja o **mesmo elemento DOM** durante a transição. Coreografia em CSS puro (`modules/access/auth-experience.css`), sem biblioteca de animação e sem dependência nova: tracks do grid interpolam (`100% 0%` → `33.3333% 66.6667%`), o painel de marca vira vidro fosco, o formulário entra por baixo com revelação em cascata e a volta é mais curta e sem stagger. Autenticação, guards, rotas e copy intactas; painéis colapsados ficam `inert` + `aria-hidden`; `prefers-reduced-motion` mantém apenas um cross-fade de 120 ms. Detalhes em `docs/landing-login-animation.md`.
- **Log global de operações (`/movimentacoes`):** tela de consulta de movimentações visíveis ao usuário ativo, com filtros combinados (período, produto, tipo, responsável, setor), paginação, ordenação por data/hora do servidor + identificador, rastreabilidade (autor, data, tipo, delta, saldo antes/depois, versão, origem/motivo, setor/recebedor quando aplicável) e vínculos de estorno resolvidos mesmo entre páginas/produtos. Administradores elegíveis podem estornar a partir do log com as mesmas regras de RF09; entradas/saídas/estornos invalidam e sincronizam catálogo, histórico do produto e log.
- **RF09:** no histórico e no log global, administradores podem justificar e confirmar o estorno integral quando elegível. A RPC `almox_reverse_movement` preserva o original, calcula o delta inverso, recusa saldo negativo/produto inativo/estorno duplicado/estorno de estorno e confirma saldo, auditoria e comando conjuntamente.
- **RF10:** a rota administrativa `/movimentacoes/ajuste` registra a contagem física e o motivo. `almox_adjust_stock_by_count` verifica a versão lida sob bloqueios na ordem comando → produto → saldo; se houver alteração concorrente, responde `STOCK_VERSION_CHANGED` e exige nova conferência. Saldo, movimento, auditoria e resultado idempotente são atômicos.
- **RF11:** consulta global implementada na UI/API (`listMovements` com suporte offline) e no banco via RPC `almox_search_stock_movements` (filtros/paginação e vínculos de estorno). A migration `20261111120000_rf10_rf11_inventory_and_history.sql` adiciona suporte a RF10/RF11.
- **Modo offline/mock:** suporte a demo local sem Supabase (auto ou `VITE_OFFLINE_MODE=true`) para navegação dos fluxos principais, incluindo o log global; não substitui validação/garantias do banco.
- **Implementado no código:** RF01–RF11. Saída usa `almox_register_exit` para validar saldo, setor e permissão no banco; a tela exige revisão antes do envio.
- **Pendente de validação integrada:** aplicar migrations em Supabase local/homologação e verificar RLS/matriz de acesso, filtros/contagem/paginação em dados reais, concorrência, replay, rollback de auditoria e vínculo de estorno cross-page (especialmente RF08–RF11). Ambiente sem Docker/Supabase não valida esses cenários ponta a ponta.
- **Qualidade frontend:** scripts disponíveis `dev`, `build`, `typecheck`, `test`, `lint`. Cobertura automatizada de banco/harness integrado pode exigir ambiente Supabase específico.
- **Privacidade/segredos:** sem `service_role` no frontend; sem senhas/tokens/chaves no repo.

## Docs de apoio
- Demo manual RF01–RF04: `docs/demo-rf01-rf04.md`
- Handoff RF05–RF06 (histórico/estado atual): `docs/rf05-rf06-handoff.md`
- Checks SQL RNF01: `supabase/tests/rf01_rf04_permission_checks.sql`
- Checks SQL RF08: `supabase/tests/rf08_exit_checks.sql`; roteiro manual: `docs/demo-rf08.md`
- Checks SQL RF09: `supabase/tests/rf09_reversal_checks.sql`; contrato, RNFs e roteiro: `docs/demo-rf09.md`
- RF10/RF11: cenários de validação após `supabase db reset` em `docs/demo-rf10-rf11.md` (acesso, concorrência, idempotência, auditoria, filtros, paginação e vínculos do histórico).
- RF14–RF16: checks SQL `supabase/tests/rf14_rf16_checks.sql`; roteiro e configuração da Edge Function em `docs/demo-rf14-rf16.md`.
- Landing ⇄ login (transição animada): referência técnica em `docs/landing-login-animation.md`, plano original em `docs/landing-login-animation-plan.md` e roteiro de verificação em `docs/demo-landing-login.md`.

## Segurança e dados
- Sem cadastro público; perfis controlados administrativamente.
- Chaves secretas/`service_role` **nunca** no frontend ou repositório.
- Operações críticas validadas no banco; UI não é fonte de autorização.
- Autor/data de domínio vêm de sessão/servidor (RN13).
- Metadados locais Supabase CLI ignorados: `supabase/.temp/` (commit `26d6cf3`).

## Planejamento
- `PLAN.md` / `TASKS.md` / `CONTEXT.md` — apoio local do agente (gitignored).
- Próximas entregas: homologação integrada RF08–RF11 e validações operacionais dos requisitos seguintes.
