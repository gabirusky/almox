import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/modules/access/use-auth"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { PaginationBar } from "@/modules/shared/components/PaginationBar"
import { EmptyState, ErrorState, LoadingSkeleton } from "@/modules/shared/components/States"
import { MovementKindBadge } from "@/modules/shared/components/StatusBadge"
import { formatDateTime, formatQuantity, shortId } from "@/modules/shared/formatters"
import { getErrorMessage } from "@/modules/shared/errors"
import { listDepartments, listMovements, listProducts } from "../services/catalog-api"
import type { MovementKind, MovementLogFilters } from "../types"
import { ReversalAction } from "./ReversalAction"

const kinds: Array<{ value: MovementKind | "all"; label: string }> = [
  { value: "all", label: "Todos os tipos" },
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
  { value: "ABERTURA", label: "Abertura" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "ESTORNO", label: "Estorno" },
]

function defaultFilters(): MovementLogFilters {
  return { page: 1, pageSize: 10, kind: "all", productId: "", actorId: "", departmentId: "", dateFrom: "", dateTo: "" }
}

export function OperationsLogPage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const initial = { ...defaultFilters(), productId: searchParams.get("produto") ?? "" }
  const [draft, setDraft] = useState<MovementLogFilters>(initial)
  const [applied, setApplied] = useState<MovementLogFilters>(initial)

  const products = useQuery({ queryKey: ["products", { page: 1, pageSize: 100, sort: "name", direction: "asc" }], queryFn: () => listProducts({ page: 1, pageSize: 100, sort: "name", direction: "asc" }) })
  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments })
  const actorSample = useQuery({ queryKey: ["movement-actors"], queryFn: () => listMovements({ page: 1, pageSize: 200 }) })

  const actorOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of actorSample.data?.items ?? []) {
      if (m.actor_id) map.set(m.actor_id, m.snapshots.actor_name || m.actor_id)
    }
    if (applied.actorId && !map.has(applied.actorId)) map.set(applied.actorId, applied.actorId)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
  }, [actorSample.data, applied.actorId])

  const query = useQuery({
    queryKey: ["movements", applied],
    queryFn: () => {
      const f: MovementLogFilters = { page: applied.page ?? 1, pageSize: applied.pageSize ?? 10 }
      if (applied.productId) f.productId = applied.productId
      if (applied.actorId) f.actorId = applied.actorId
      if (applied.departmentId) f.departmentId = applied.departmentId
      if (applied.dateFrom) f.dateFrom = applied.dateFrom
      if (applied.dateTo) f.dateTo = applied.dateTo
      if (applied.kind && applied.kind !== "all") f.kind = applied.kind
      return listMovements(f)
    },
  })

  const hasFilters = Boolean(applied.productId || (applied.kind && applied.kind !== "all") || applied.actorId || applied.departmentId || applied.dateFrom || applied.dateTo)

  function applyFilters() { setApplied({ ...draft, page: 1 }) }
  function clearFilters() { const f = defaultFilters(); setDraft(f); setApplied(f) }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Operações"
        description="Log global de movimentações de estoque com rastreabilidade, filtros e vínculos de estorno. Datas/horários exibidos conforme registro do servidor."
        actions={<div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/movimentacoes/nova">Nova entrada</Link></Button><Button asChild variant="outline"><Link to="/movimentacoes/saida">Nova saída</Link></Button></div>}
      />

      <form className="space-y-4 rounded-lg border border-line bg-surface p-4" onSubmit={(e) => { e.preventDefault(); applyFilters() }} aria-label="Filtros de operações">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-from">De (data)</Label>
            <Input id="f-from" type="date" value={draft.dateFrom ?? ""} onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-to">Até (data)</Label>
            <Input id="f-to" type="date" value={draft.dateTo ?? ""} onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-product">Produto</Label>
            <Select id="f-product" value={draft.productId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, productId: e.target.value }))}>
              <option value="">Todos os produtos</option>
              {(products.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-kind">Tipo</Label>
            <Select id="f-kind" value={draft.kind ?? "all"} onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as MovementKind | "all" }))}>
              {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-actor">Responsável</Label>
            <Select id="f-actor" value={draft.actorId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, actorId: e.target.value }))}>
              <option value="">Todos</option>
              {actorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-dept">Setor / destino</Label>
            <Select id="f-dept" value={draft.departmentId ?? ""} onChange={(e) => setDraft((d) => ({ ...d, departmentId: e.target.value }))}>
              <option value="">Todos os setores</option>
              {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}{d.active ? "" : " (inativo)"}</option>)}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Aplicar filtros</Button>
          <Button type="button" variant="outline" onClick={clearFilters}>Limpar</Button>
          {hasFilters ? <span className="text-xs text-muted">Filtros ativos aplicados à consulta.</span> : <span className="text-xs text-muted">Exibindo todas as movimentações visíveis.</span>}
        </div>
      </form>

      <div className="rounded-lg border border-line bg-surface">
        <div className="border-b border-line p-4 sm:p-5">
          <h2 className="font-heading text-lg font-semibold">Registro de operações</h2>
          <p className="mt-1 text-sm text-muted">Ordenação: mais recentes primeiro. Passe o mouse sobre versões/IDs abreviados para ver o identificador completo; vínculos de estorno aparecem mesmo entre páginas ou produtos.</p>
        </div>
        {query.isLoading ? <LoadingSkeleton className="border-0" lines={8} /> : null}
        {query.error ? <div className="p-4"><ErrorState message={getErrorMessage(query.error, "Falha ao carregar operações.")} action={<Button variant="outline" onClick={() => void query.refetch()}>Tentar novamente</Button>} /></div> : null}
        {!query.isLoading && !query.error ? (
          (query.data?.items.length ?? 0) === 0 ? <div className="p-4"><EmptyState title={hasFilters ? "Nenhuma movimentação encontrada" : "Nenhuma movimentação registrada"} description={hasFilters ? "Ajuste ou limpe os filtros para ver outros resultados." : "As operações de estoque aparecerão aqui conforme forem registradas."} action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Limpar filtros</Button> : undefined} /></div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registro</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead>Saldo antes/depois</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Destino / Origem / Motivo</TableHead>
                  <TableHead>Correção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(query.data?.items ?? []).map((movement) => {
                  const sku = movement.snapshots.sku ?? movement.products?.sku ?? "—"
                  const name = movement.snapshots.name ?? movement.products?.name ?? "Produto"
                  const unit = movement.snapshots.unit ?? movement.products?.unit ?? "UN"
                  const reversedById = query.data?.reversedBy[movement.id]
                  const canReverse = profile?.role === "admin" && movement.kind !== "ESTORNO" && !movement.reversal_of && !reversedById
                  const productActive = movement.products?.active ?? true
                  return (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-ink">{formatDateTime(movement.recorded_at)}</div>
                          <div className="font-mono text-xs text-muted" title={movement.id}>v{movement.product_version} · {shortId(movement.id)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/produtos/${movement.product_id}`} className="font-medium text-signal underline decoration-signal/30 underline-offset-2 hover:decoration-signal">{name}</Link>
                        <div className="font-mono text-xs text-muted">SKU {sku}</div>
                      </TableCell>
                      <TableCell><MovementKindBadge kind={movement.kind} /></TableCell>
                      <TableCell className="font-mono text-xs">{formatQuantity(movement.delta, unit)}</TableCell>
                      <TableCell className="font-mono text-xs">{formatQuantity(movement.balance_before, unit)} → {formatQuantity(movement.balance_after, unit)}</TableCell>
                      <TableCell className="text-sm">{movement.snapshots.actor_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {movement.department_id || movement.snapshots.department_name ? <div><div>{movement.snapshots.department_name ?? "Setor informado"}</div><div className="text-xs text-muted">Recebedor: {movement.recipient_ref ?? "—"}</div></div> : <span className="text-muted">Sem setor/destino</span>}
                        <div className="mt-1 text-xs text-muted">Motivo: {movement.reason}</div>
                        {movement.origin ? <div className="text-xs text-muted">Origem: {movement.origin}</div> : null}
                        {movement.document_ref ? <div className="text-xs text-muted">Documento: {movement.document_ref}</div> : null}
                      </TableCell>
                      <TableCell className="min-w-[180px] space-y-1.5">
                        {movement.reversal_of ? <p className="text-xs text-ink">Estorno de: <span className="break-all font-mono text-muted" title={movement.reversal_of}>{shortId(movement.reversal_of)}</span></p> : null}
                        {reversedById ? <p className="text-xs text-ink">Estornado por: <span className="break-all font-mono text-muted" title={reversedById}>{shortId(reversedById)}</span></p> : null}
                        {canReverse ? (productActive ? <ReversalAction movement={movement} unit={unit} /> : <p className="text-xs text-muted">Produto inativo: reative antes de estornar.</p>) : null}
                        {!movement.reversal_of && !reversedById && movement.kind === "ESTORNO" ? <span className="text-xs text-muted">Lançamento de estorno</span> : null}
                        {!canReverse && !movement.reversal_of && !reversedById && movement.kind !== "ESTORNO" && profile?.role !== "admin" ? <span className="text-xs text-muted">—</span> : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )
        ) : null}
      </div>

      {!query.isLoading && !query.error && query.data ? (
        <PaginationBar page={applied.page ?? 1} pageSize={applied.pageSize ?? 10} total={query.data.total} onPageChange={(p) => setApplied((a) => ({ ...a, page: p }))} loading={query.isFetching} label="Paginação de operações" />
      ) : null}
    </section>
  )
}
