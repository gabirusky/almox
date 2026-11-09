# Handoff RF05–RF06 (T091)

## Dependências já entregues (RF01–RF04)
- Auth/session + `profiles` (`admin`/`employee`, `active`) e guards de rota; **autorização final sempre no banco**.
- Catálogo: `categories`, `departments`, `products`, `stock_balances` (saldo atual/materializado), `audit_events`.
- RPC: `public.almox_create_product(...)` cria produto + saldo zero atomicamente.
- Regras DB ativas: SKU normalizado único (RN14), inativação produto só com saldo zero, categoria com produtos ativos não inativa (RN15), categoria de produto deve estar ativa.

## RF05 — Consulta de produtos
- **Necessidade:** busca por nome/SKU/categoria/situação com paginação.
- **Sugestão de API:** query PostgREST paginada (`range`/`count=exact`) ou RPC dedicada com filtros whitelisted; manter RLS.
- **Índices existentes:** SKU, nome, `category_id+active`, `active`. Avaliar `pg_trgm` apenas se busca textual exigir.
- **UI:** diferenciar ativo/inativo/sem saldo (já há base em `ProductsPage`); adicionar paginação/ordenação estável.

## RF06 — Saldo atual e histórico por produto
- **Necessidade:** tela/detalhe com unidade, saldo, última atualização e lançamentos em ordem verificável.
- **Schema futuro:** `stock_movements` (ou equivalente da análise, seção 11) com `product_id`, `kind/delta`, saldos anterior/posterior, versão, autor, motivo/origem/destino, vínculo de estorno, `recorded_at`.
- **Contrato sugerido:** endpoint/RPC `get_product_history(product_id, filters, page)` retornando saldo atual (`stock_balances`) + movimentos paginados ordenados por `(product_version asc, recorded_at asc, id asc)`.
- **Integração:** ao registrar movimentos (RF07–RF10), atualizar `stock_balances` na mesma transação e auditar; manter `first_movement_at`/trava de unidade (RN14).

## Cuidados para o próximo slice
- Não expor `service_role` no frontend; comandos críticos via RLS/RPC/Edge Function apropriada.
- Manter idempotência de comandos de movimentação (RF13/RN16) separada de consultas.
- Preservar snapshots/rótulos históricos nos movimentos (análise 11.2) para não reescrever fatos passados.
