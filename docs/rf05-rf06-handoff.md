# Handoff RF05–RF06 (histórico / estado atual)

> **Status:** RF05–RF11 implementados no código; RF08–RF11 ainda requerem verificação integrada no Supabase. Este handoff registra a base histórica e suas interfaces.

## Base entregue
- **RF01–RF04:** auth/perfis/guards + catálogo (`categories`, `departments`, `products`, `stock_balances`, `audit_events`), RPC `almox_create_product`, regras RLS/RN14/RN15.
- **RF05 (consulta):** `ProductsPage` com busca (nome/SKU), filtros (categoria/situação), ordenação e paginação via `listProducts`.
- **RF06 (saldo/histórico):** `ProductDetailsPage` (`/produtos/:id`) exibe saldo atual e histórico paginado; migration `20261110190000_t094_t098_rf06_stock_history.sql` cria base de `stock_movements`/leitura histórica.
- **RF07 (já iniciado/entregue após este handoff):** rota `/movimentacoes/nova` + RPC `almox_register_entry` e `stock_commands` (idempotência) em `20261110191000_t121_t128_rf07_entries.sql`.

## Interfaces/áreas relevantes
- UI: `app/src/modules/catalog/pages/ProductsPage.tsx`, `ProductDetailsPage.tsx`, `NewEntryPage.tsx`
- API cliente: `app/src/modules/catalog/services/catalog-api.ts`
- DB: migrations em `supabase/migrations/` (ver `README.md` raiz para ordem)

## Implementações posteriores e próximos passos
- **RF08:** código de saída em `NewExitPage`, `almox_register_exit` e migration `20261110192000_rf08_exits.sql`; aplicar e validar em Supabase local/homologação antes de considerar o fluxo integrado.
- **RF09:** `almox_reverse_movement` e `ReversalAction` implementados; validação integrada pendente. O histórico retorna `reversedBy` para identificar originais já estornados mesmo quando o estorno estiver em outra página.
- **RF10:** `almox_adjust_stock_by_count` registra contagem física com versão esperada e recusa divergência concorrente; interface em `/movimentacoes/ajuste`.
- **RF11:** `almox_search_stock_movements` oferece filtros por período, produto, tipo, responsável e setor, com paginação e vínculos de estorno; interface em `/movimentacoes`.
- **Próximos:** RF12–RF13+ (auditoria operacional, validações adicionais e relatórios) conforme análise.
- Manter autorização no banco, snapshots históricos imutáveis e sem `service_role` no frontend.
