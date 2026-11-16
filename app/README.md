# ALMOX — App (frontend)

Frontend React + TypeScript + Vite do ALMOX (código RF01–RF11 e RF13–RF16 — acesso, catálogo, consulta, saldo/histórico, entrada, saída, estorno, contagem, log global, painel, CSV, usuários e auditoria). O app usa Supabase Auth + PostgreSQL + RPCs; o modo offline/mock é apenas para desenvolvimento local e demonstração.

## Requisitos
- Node.js 20+ (recomendado 22 LTS)
- npm 10+

## Configuração
1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave publicável/anon). **Nunca** use `service_role` no frontend.
3. O `.env.local` versionado local mantém `VITE_OFFLINE_MODE=true` para desenvolvimento mock. Para testar o Supabase real localmente, remova essa linha e use as credenciais do projeto (e adicione `http://localhost:5173/definir-senha` ao redirect allowlist).
4. O build de produção no GitHub Pages recebe `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` dos **GitHub Secrets**. Passo a passo: [`../docs/supabase-go-live.md`](../docs/supabase-go-live.md).

## Scripts
```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run lint
npm run build
```

## Stack
React 19, Vite 8, TypeScript ~7 (strict), React Router 8, TanStack Query 5, React Hook Form 7, Zod 4, Supabase JS 2, Tailwind CSS 4, shadcn/ui. Testes: Vitest + Testing Library. Lint: `oxlint`.

## Estrutura relevante
- `src/modules/access/` — autenticação, sessão/perfil, guards
- `src/modules/catalog/` — produtos, categorias, setores, detalhe/histórico, entrada, saída e estorno administrativo no histórico
- `src/modules/shared/` — erros e componentes compartilhados

Consulte `../README.md` para escopo, migrations Supabase e notas de segurança.
