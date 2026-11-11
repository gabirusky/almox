# Handoff RF05–RF06 (histórico / estado atual)

> **Status:** RF05 e RF06 implementados; RF07 entregue e RF08/RF09 implementados no código, ainda sem verificação integrada no Supabase. Registra as interfaces para RF10+.

## Base entregue
- **RF01–RF04:** auth/perfis/guards + catálogo (`categories`, `departments`, `products`, `stock_balances`, `audit_events`), RPC `almox_create_product`, regras RLS/RN14/RN15.
- **RF05 (consulta):** `ProductsPage` com busca (nome/SKU), filtros (categoria/situação), ordenação e paginação via `listProducts`.
- **RF06 (saldo/histórico):** `ProductDetailsPage` (`/produtos/:id`) exibe saldo atual e histórico paginado; migration `20261110190000_t094_t098_rf06_stock_history.sql` cria base de `stock_movements`/leitura histórica.
- **RF07 (já iniciado/entregue após este handoff):** rota `/movimentacoes/nova` + RPC `almox_register_entry` e `stock_commands` (idempotência) em `20261110191000_t121_t128_rf07_entries.sql`.

## Interfaces/áreas relevantes
- UI: `app/src/modules/catalog/pages/ProductsPage.tsx`, `ProductDetailsPage.tsx`, `NewEntryPage.tsx`
- API cliente: `app/src/modules/catalog/services/catalog-api.ts`
- DB: migrations em `supabase/migrations/` (ver `README.md` raiz para ordem)

## Próximos slices (sugestão)
- **RF08:** código de saída em `NewExitPage`, `almox_register_exit` e migration `20261110192000_rf08_exits.sql`; aplicar e validar em Supabase local/homologação antes de considerar o fluxo integrado.
- **RF09:** `almox_reverse_movement` e `ReversalAction` implementados; validação integrada pendente. O histórico retorna `reversedBy` para identificar originais já estornados mesmo quando o estorno estiver em outra página.
- **RF10:** ajustes sobre `stock_movements` + atualização consistente de saldo. Preservar a ordem de bloqueio comando → produto → saldo e usar discriminador de tipo no hash de idempotência.
- **RF11–RF13+:** ampliar auditoria operacional, validações de concorrência/idempotência e relatórios conforme análise.
- Manter autorização no banco, snapshots históricos imutáveis e sem `service_role` no frontend.
