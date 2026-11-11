import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Link, useParams } from "react-router"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { PaginationBar } from "@/modules/shared/components/PaginationBar"
import { LoadingSkeleton, ErrorState, EmptyState } from "@/modules/shared/components/States"
import { MovementKindBadge, ProductStatusBadge } from "@/modules/shared/components/StatusBadge"
import { formatDateTime, formatQuantity } from "@/modules/shared/formatters"
import { useAuth } from "@/modules/access/use-auth"
import { getErrorMessage } from "@/modules/shared/errors"
import { balanceQuantity, getProductHistory } from "../services/catalog-api"
import { ReversalAction } from "./ReversalAction"

export function ProductDetailsPage() {
  const { profile } = useAuth()
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState(1)
  const history = useQuery({
    queryKey: ["product-history", id, page],
    queryFn: () => getProductHistory(id ?? "", page, 10),
    enabled: Boolean(id),
  })

  if (!id) return <ErrorState message="Produto inválido." />
  if (history.isLoading) return <LoadingSkeleton lines={8} />
  if (history.error) return (
    <section className="space-y-4">
      <PageHeader title="Produto" back={<Link to="/produtos" className="text-sm text-signal underline underline-offset-2">← Voltar para produtos</Link>} />
      <ErrorState message={getErrorMessage(history.error, "Verifique seu acesso e tente novamente.")} action={<Button asChild variant="outline"><Link to="/produtos">Voltar para produtos</Link></Button>} />
    </section>
  )
  if (!history.data) return null

  const { product, movements, reversedBy, total, pageSize } = history.data
  const quantity = balanceQuantity(product)
  const balanceUpdated = product.stock_balances && !Array.isArray(product.stock_balances) ? product.stock_balances.updated_at : null

  return (
    <section className="space-y-6">
      <PageHeader
        back={<Link to="/produtos" className="text-sm text-signal underline underline-offset-2">← Voltar para produtos</Link>}
        title={product.name}
        description={<span className="font-mono text-xs">SKU {product.sku} · {product.categories?.name ?? "Sem categoria"}</span>}
        actions={<div className="flex flex-wrap items-center gap-2"><ProductStatusBadge active={product.active} balance={quantity} /><Button asChild variant="outline"><Link to={`/movimentacoes?produto=${product.id}`}>Ver operações</Link></Button>{product.active ? <Button asChild variant="outline"><Link to={`/movimentacoes/saida?produto=${product.id}`}>Registrar saída</Link></Button> : null}</div>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-line bg-surface p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">Saldo atual</p><p className="mt-1 font-mono text-xl font-semibold text-ink">{formatQuantity(quantity, product.unit)}</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">Unidade</p><p className="mt-1 font-mono text-xl font-semibold text-ink">{product.unit}</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">Última atualização</p><p className="mt-1 text-sm font-medium text-ink">{formatDateTime(balanceUpdated)}</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted">Situação</p><p className="mt-1 text-sm font-medium text-ink">{product.active ? "Produto ativo" : "Produto inativo"}</p></div>
      </div>

      <div className="rounded-lg border border-line bg-surface">
        <div className="border-b border-line p-4 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Histórico de movimentações</h2>
          <p className="mt-1 text-sm text-muted">Ordenado por versão do estoque, horário do servidor e identificador. Cada lançamento exibe variação e saldo resultante.</p>
        </div>
        {movements.length === 0 ? <div className="p-4"><EmptyState title="Nenhuma movimentação registrada" description="As entradas e saídas deste produto aparecerão aqui." /></div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Variação</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Destino / Motivo</TableHead>
                <TableHead>Correção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => {
                const canReverse = profile?.role === "admin" && movement.kind !== "ESTORNO" && !movement.reversal_of && !reversedBy[movement.id]
                return (
                  <TableRow key={movement.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-xs text-ink">v{movement.product_version} · Δ {formatQuantity(movement.delta, product.unit)} · = {formatQuantity(movement.balance_after, product.unit)}</div>
                        <div className="text-xs text-muted">{formatDateTime(movement.recorded_at)}</div>
                        <div className="break-all font-mono text-[11px] text-muted">{movement.id}</div>
                      </div>
                    </TableCell>
                    <TableCell><MovementKindBadge kind={movement.kind} /></TableCell>
                    <TableCell className="font-mono text-xs">{formatQuantity(movement.delta, product.unit)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatQuantity(movement.balance_after, product.unit)}</TableCell>
                    <TableCell className="text-sm">{movement.snapshots.actor_name ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {movement.department_id ? <div><div>{movement.snapshots.department_name ?? "Setor não informado"}</div><div className="text-xs text-muted">Recebedor: {movement.recipient_ref ?? "—"}</div></div> : <span className="text-muted">—</span>}
                      <div className="mt-1 text-xs text-muted">Motivo: {movement.reason}</div>
                      {movement.origin ? <div className="text-xs text-muted">Origem: {movement.origin}</div> : null}
                    </TableCell>
                    <TableCell>
                      {movement.reversal_of ? <p className="break-all text-xs text-ink">Estorno de: <span className="font-mono">{movement.reversal_of}</span></p> : null}
                      {reversedBy[movement.id] ? <p className="break-all text-xs text-ink">Estornado por: <span className="font-mono">{reversedBy[movement.id]}</span></p> : null}
                      {canReverse ? (product.active ? <ReversalAction movement={movement} unit={movement.snapshots.unit ?? product.unit} /> : <p className="text-xs text-muted">Reative o produto antes de estornar.</p>) : null}
                      {!movement.reversal_of && !reversedBy[movement.id] && movement.kind === "ESTORNO" ? <span className="text-xs text-muted">Lançamento de estorno</span> : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={setPage} label="Paginação do histórico" />
    </section>
  )
}
