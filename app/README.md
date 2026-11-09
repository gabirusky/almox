# ALMOX — App (frontend)

Aplicação React + TypeScript + Vite para o recorte **RF01–RF04** do projeto ALMOX.

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
npm run lint
npm run build
```

## Stack (scaffold)
React 19, Vite 8, TypeScript 7 (strict), React Router 7, TanStack Query 5, React Hook Form 7, Zod 4, Supabase JS 2, Tailwind CSS 4, shadcn/ui (base). Lint: `oxlint` (template Vite). 

Consulte o `../README.md` para escopo RF/NFR e decisões de arquitetura.
