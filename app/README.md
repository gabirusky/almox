# ALMOX — App (frontend)

Frontend React + TypeScript + Vite do ALMOX (código até **RF09** — acesso, catálogo, consulta, saldo/histórico, entrada, saída e estorno). Saída e estorno dependem das migrations RF08/RF09 aplicadas no Supabase.

## Requisitos
- Node.js 20+ (recomendado 22 LTS)
- npm 10+

## Configuração
1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave publicável/anon). **Nunca** use `service_role` no frontend.

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
