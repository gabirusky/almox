# ALMOX no Supabase free — guia de integração e go-live

Este documento é o passo a passo completo para colocar o ALMOX real (Supabase + PostgreSQL + Auth + Edge Function) no ar, usando a conta free do Supabase e o GitHub Pages já configurado.

- **App real:** <https://gabirusky.github.io/almox/>
- **Repositório:** <https://github.com/gabirusky/almox> (público, exigência do Pages free)
- **Banco:** projeto Supabase free, região São Paulo
- **E-mail transacional:** Resend (SMTP custom)
- **Admin:** `gabirusky`

> **Importante:** com o provedor de e-mail padrão do Supabase, o Auth só envia mensagens para endereços que pertencem à organização Supabase (2 e-mails/hora). Por isso este guia usa **Resend**. A chave da Resend **não** vai para o GitHub: ela é configurada em **Supabase → Authentication → Emails → SMTP Settings**.

---

## 1. Visão geral do que já existe

| Camada | Estado |
|---|---|
| Migrations | 10 migrations versionadas: RF01–RF04, RLS/auditoria, regras de domínio, RF06, RF07, RF08, RF09, RF10/RF11, RF13, RF14–RF16 |
| Frontend | React 19 + Vite + Supabase JS; acesso, catálogo, operações, painel, CSV, usuários, auditoria |
| Edge Function | `supabase/functions/admin-invite` (convites RF16) |
| Deploy | GitHub Pages com `VITE_BASE_PATH=/almox/` e fallback `404.html` |
| Offline mock | Mantido para desenvolvimento local e PRs |

O que este guia adiciona:

1. Correção das URLs de convite/recuperação para respeitar `/almox/`.
2. Workflow do Pages usando **GitHub Secrets** em vez de forçar o mock.
3. Seeds seguros para produção (`seed_catalog.sql`, `seed_demo_prod.sql`).
4. Bootstrap do primeiro admin (`bootstrap_admin.sql`).
5. Este runbook + checklist de validação.

---

## 2. Pré-requisitos

- Conta no Supabase (organization free; projeto novo).
- Conta no Resend + acesso ao DNS do domínio.
- Node.js 20+ e npm na máquina.
- Supabase CLI via `npx` (não precisa de Docker para `db push` / `functions deploy`).
- Permissão de administrador no repositório GitHub para criar secrets.

---

## 3. Criar o projeto Supabase

1. Acesse <https://supabase.com/dashboard> → **New project**.
2. Organization: crie uma free, se ainda não tiver.
3. Nome: `almox`.
4. Database Password: gere uma senha forte e guarde no gerenciador.
5. Region: **South America (São Paulo)**.
6. Crie e aguarde o provisionamento.
7. Copie:
   - **Project URL**: `https://<PROJECT_REF>.supabase.co`
   - **anon public key**: Project Settings → API Keys → `anon` (ou publishable)
   - **Project ref**: aparece na URL do dashboard
8. Não crie um segundo projeto (a free permite 2 ativos).

---

## 4. Configurar o Resend (SMTP)

1. Crie conta em <https://resend.com>.
2. **Domains → Add Domain**: `mail.<seu-dominio>`.
3. Adicione os registros DNS que o Resend mostrar (MX/TXT para SPF, CNAME/TXT para DKIM).
4. Aguarde o status **Verified**.
5. **API Keys → Create API Key** (permissão Sending) e copie a chave.
6. No Supabase: **Authentication → Emails → SMTP Settings** → ative SMTP custom:
   - Host: `smtp.resend.com`
   - Port: `587` (ou `465`)
   - Username: `resend`
   - Password: a chave da Resend
   - Sender email: `no-reply@mail.<seu-dominio>`
   - Sender name: `ALMOX`
7. Envie um e-mail de teste para um endereço que **não** seja membro da organização Supabase.
8. **Authentication → Rate Limits**: e-mails enviados ≥ `30/hour`.
9. Opcional: **Authentication → Email Templates** → traduza “Invite user” e “Reset password” para PT-BR, mantendo `{{ .ConfirmationURL }}`.

> A chave da Resend fica **somente** no Supabase. Não é secret do GitHub Actions.

> Se você também guardou a chave da Resend como GitHub Secret, ela não é consumida pelo workflow: o único consumidor é o Supabase Auth. Configure-a em **Authentication → Emails → SMTP Settings**.

---

## 5. Configurar o Auth

No dashboard do Supabase:

1. **Authentication → URL Configuration**
   - Site URL: `https://gabirusky.github.io/almox/`
   - Redirect allow list:
     - `https://gabirusky.github.io/almox/definir-senha`
     - opcional (teste local): `http://localhost:5173/definir-senha`
2. **Authentication → Sign In / Providers**
   - Email provider: habilitado
   - “Allow new users to sign up”: **OFF**
   - “Confirm email”: **ON**
   - Anonymous sign-ins: **OFF**
   - **CAPTCHA: OFF** (o app não envia token de CAPTCHA; ligar quebraria o login)
3. **Authentication → Policies**
   - Tamanho mínimo de senha: `8` (igual ao Zod do app).

---

## 6. Aplicar migrations e Edge Function

Na raiz do repositório:

```powershell
cd C:\Users\es.gabriel.santos\Documents\Code\almox
npx supabase@3 login
npx supabase@3 link --project-ref <PROJECT_REF>
# cole a senha do banco quando solicitado

# Prévia: confirme que seed.sql NÃO aparece na lista
npx supabase@3 db push --remote --dry-run
npx supabase@3 db push --remote
```

**Não** use `--include-seed`. O `supabase/seed.sql` é local/dev e cria usuários `@almox.test` e grava em `auth.*`.

Depois:

```powershell
npx supabase@3 functions deploy admin-invite
npx supabase@3 secrets set ALMOX_ALLOWED_ORIGIN=https://gabirusky.github.io
```

Notas:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente nas functions hospedadas.
- Se a function retornar `FUNCTION_MISCONFIGURED`, configure `SUPABASE_SERVICE_ROLE_KEY` via `npx supabase@3 secrets set ...` (nunca no frontend).
- Se o `link` reclamar da versão major do Postgres, ajuste `db.major_version` em `supabase/config.toml` para a versão mostrada no dashboard e tente novamente.

---

## 7. Criar o primeiro admin (gabirusky)

1. **Authentication → Users → Add user**
   - Email: seu e-mail real
   - Password: senha forte (≥ 8 caracteres), salva no gerenciador
   - **Auto Confirm User: ON**
2. Abra `supabase/bootstrap_admin.sql` e substitua:

```sql
v_email text := 'COLOQUE_SEU_EMAIL_AQUI';
```

pelo e-mail exato cadastrado no passo 1. O nome já está como `gabirusky`.

3. **SQL Editor** → cole o conteúdo de `supabase/bootstrap_admin.sql` → execute.
4. Deve retornar uma linha `admin | true`.

O script falha explicitamente se o usuário não existir em `auth.users`, evitando deixar o projeto sem administrador.

---

## 8. Popular catálogo e dados de demonstração

1. **SQL Editor** → execute `supabase/seed_catalog.sql` (categorias/setores).
2. **SQL Editor** → execute `supabase/seed_demo_prod.sql` (3 produtos, 3 saldos, 4 movimentos).
3. Confira:

```sql
select count(*) from public.products;        -- 3
select count(*) from public.stock_balances;  -- 3
select count(*) from public.stock_movements; -- 4
```

O seed demo usa SQL direto (caminho de demonstração). Não use SQL direto para estoque real: as RPCs RF07/RF08/RF09/RF10 garantem atomicidade, idempotência e auditoria.

Para remover os dados fictícios depois, use o bloco de limpeza comentado no final de `supabase/seed_demo_prod.sql` (destrutivo; só em banco de demonstração).

---

## 9. GitHub Secrets e publicação

### 9.1 Criar os secrets

No GitHub → **Settings → Secrets and variables → Actions → Secrets → New repository secret**:

| Secret | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://<PROJECT_REF>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | chave `anon`/publishable (pública por design) |

**Não** coloque `service_role` nem a chave da Resend no GitHub.

### 9.2 Publicar

1. Confirme **Settings → Pages → Source = GitHub Actions**.
2. Faça commit/push na `main`.
3. Acompanhe **Actions → Deploy to GitHub Pages**.
4. Aguarde ~10 min (cache do Pages).
5. Abra <https://gabirusky.github.io/almox/>.

O workflow falha de propósito no push em `main` se os secrets não existirem, para não publicar o mock silenciosamente.

---

## 10. Primeiro login e teste de convite

1. Abra `/almox/` e entre com o admin `gabirusky`.
2. O painel deve mostrar os contadores/alertas do seed demo.
3. `/almox/produtos`: 3 produtos; abra um e confira o histórico.
4. `/almox/usuarios` → convide um e-mail real (perfil `employee`).
5. Verifique o e-mail no Resend; o link deve abrir:
   `https://gabirusky.github.io/almox/definir-senha`
6. Defina a senha. Tente entrar: deve aparecer “acesso inativo” (o perfil nasce inativo).
7. Volte como admin, habilite o usuário e peça para entrar novamente.
8. `/almox/recuperar-senha` → solicite recuperação → o link também deve abrir `/almox/definir-senha`.

Essa sequência valida Edge Function + Resend + correção de redirect + RLS + ciclo de convite.

---

## 11. Checklist de validação RF01–RF16

Use os roteiros detalhados em `docs/demo-rf01-rf04.md`, `docs/demo-rf08.md`, `docs/demo-rf09.md`, `docs/demo-rf10-rf11.md` e `docs/demo-rf14-rf16.md`.

| Área | Verificação | Esperado |
|---|---|---|
| RF01 | Login, logout, recuperação | Funciona; link abre `/almox/definir-senha` |
| RF02 | Admin × employee × inativo × anônimo | Rotas/RPCs admin negadas para employee; inativo negado; anônimo redirecionado |
| RF03 | Criar/editar/inativar produto | SKU único normalizado; saldo inicia 0; inativo não selecionável |
| RF04 | Categorias/setores | CRUD admin; inativos não selecionáveis em novas operações |
| RF05 | Lista de produtos | Busca/filtro/ordenação/paginação |
| RF06 | Detalhe do produto | Saldo atual + histórico paginado |
| RF07 | Entrada | Atômica; origem/motivo obrigatórios; duplo envio seguro |
| RF08 | Saída | Valida saldo/setor/recebedor/motivo |
| RF09 | Estorno | Só admin; justificativa; vínculo; não estornar duas vezes |
| RF10 | Ajuste por contagem | Conflito de versão → `STOCK_VERSION_CHANGED` |
| RF11 | Log global | Filtros, paginação, vínculos cross-page |
| RF12 | `/almox/auditoria` | Eventos de produtos/usuários/exportações |
| RF13 | Constraints únicas | SKU/categoria/setor duplicados rejeitados |
| RF14 | Painel | Contadores/alertas coerentes |
| RF15 | CSV | Filtros, momento da geração, evento `EXPORT` |
| RF16 | Usuários | Convite, papel, ativar/desativar, último admin protegido |
| RNF01–04 | Segurança/integridade | Matriz RLS, trilhas, concorrência |

---

## 12. Operação no free tier

- **Pausa:** o projeto pausa após 7 dias sem requisições. Restaure manualmente no dashboard.
- **Backup:** não há backup automático. Antes de mudanças destrutivas:

```powershell
npx supabase@3 db dump -f "backup_$(Get-Date -Format yyyyMMdd_HHmmss).sql"
```

Se o `db dump` exigir Docker, use `pg_dump` com a connection string do pooler (Project Settings → Database).
- **Logs:** retenção de 1 dia. Consulte Auth/Edge Functions quando um convite falhar.
- **Resend:** free ~3.000/mês (~100/dia). Acompanhe o painel da Resend.
- **Chaves:** a anon é pública por design; `service_role` nunca vai para o frontend. Rotacione se vazar.
- **Limites:** 500 MB de banco, 5 GB de egress, 50k MAU. A restrição real é a pausa por ociosidade.

---

## 13. Diagnóstico rápido

| Sintoma | Causa provável | Ação |
|---|---|---|
| Login “credenciais inválidas” | Usuário não confirmado | Recrie o admin com **Auto Confirm User** |
| Convite não chega | Resend não verificado / limite / spam | Veja logs da Resend e Auth; confira spam |
| Link abre `/definir-senha` sem `/almox/` | Correção de redirect não publicada | Verifique `import.meta.env.BASE_URL` e faça redeploy |
| App em modo mock após deploy | Secrets ausentes | Crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |
| Guard do workflow falha | Mesmo caso | Crie os secrets |
| `Email address not authorized` | SMTP padrão ainda ativo | Conclua o SMTP custom (Resend) |
| `FUNCTION_MISCONFIGURED` | Secret da function ausente | Configure `SUPABASE_SERVICE_ROLE_KEY` |
| Erro de CORS no convite | `ALMOX_ALLOWED_ORIGIN` divergente | `https://gabirusky.github.io` |
| `ACTIVE_PROFILE_REQUIRED` | Sem perfil ou inativo | Rode `bootstrap_admin.sql` / habilite o usuário |
| `LAST_ADMIN_REQUIRED` | Proteção esperada | Mantenha ao menos um admin ativo |
| Refresh em `/almox/produtos` dá 404 do GitHub | `404.html` ausente | Confirme o passo `cp dist/index.html dist/404.html` |
| Projeto pausado | 7 dias ocioso | Restaure no dashboard |

---

## 14. Arquivos alterados nesta integração

| Arquivo | Mudança |
|---|---|
| `app/src/modules/access/auth-context.tsx` | Redirect de recuperação respeita `BASE_URL` |
| `app/src/modules/admin/services/admin-api.ts` | Redirect de convite respeita `BASE_URL` |
| `.github/workflows/pages.yml` | Usa secrets do Supabase; remove `VITE_OFFLINE_MODE`; guard no main |
| `supabase/seed_catalog.sql` | Seed seguro de categorias/setores |
| `supabase/bootstrap_admin.sql` | Cria o perfil admin `gabirusky` |
| `supabase/seed_demo_prod.sql` | Dados fictícios de demonstração |
| `docs/supabase-go-live.md` | Este guia |
| `README.md`, `docs/deploy-pages.md` | Documentação atualizada |