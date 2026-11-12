import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"
import { Activity, ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardCheck, PackageX, RefreshCw, TriangleAlert } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { useAuth } from "@/modules/access/use-auth"
import { listMovements } from "@/modules/catalog/services/catalog-api"
import { EmptyState, ErrorState, LoadingSkeleton } from "@/modules/shared/components/States"
import { MovementKindBadge } from "@/modules/shared/components/StatusBadge"
import { getErrorMessage } from "@/modules/shared/errors"
import { formatDateTime, formatQuantity } from "@/modules/shared/formatters"
import { getDashboardSummary } from "../services/admin-api"
import type { StockAlert } from "../types"

type Tone = "signal" | "success" | "warn" | "danger"

const toneClasses: Record<Tone, { bar: string; icon: string }> = {
  signal: { bar: "bg-signal", icon: "bg-signal/10 text-signal" },
  success: { bar: "bg-success", icon: "bg-success/10 text-success" },
  warn: { bar: "bg-warn", icon: "bg-warn/10 text-warn" },
  danger: { bar: "bg-danger", icon: "bg-danger/10 text-danger" },
}

function KpiTile({ label, value, hint, icon: Icon, tone, to }: { label: string; value: number | string; hint: string; icon: LucideIcon; tone: Tone; to?: string }) {
  const body = (
    <div className="relative h-full overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-5 transition-shadow group-hover:shadow-md">
      <span className={cn("absolute inset-y-0 left-0 w-1", toneClasses[tone].bar)} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg sm:size-9", toneClasses[tone].icon)} aria-hidden="true"><Icon className="size-4 sm:size-5" /></span>
      </div>
      <p className="mt-2 font-mono text-3xl font-semibold sm:text-4xl tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  )
  return to ? <Link to={to} className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2">{body}</Link> : <div className="group">{body}</div>
}

function CoverageBar({ alert }: { alert: StockAlert }) {
  const qty = Number(alert.quantity)
  const min = Number(alert.minimum_stock)
  const ratio = min > 0 ? Math.min(qty / min, 1) : 0
  return (
    <div className="min-w-32">
      <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
        <span className={cn("font-semibold", qty === 0 ? "text-danger" : "text-warn")}>{formatQuantity(qty, alert.unit)}</span>
        <span className="text-muted">mín. {formatQuantity(min)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/60" role="meter" aria-valuemin={0} aria-valuemax={min} aria-valuenow={qty} aria-label={`Saldo ${qty} de mínimo ${min}`}>
        <div className={cn("h-full rounded-full", qty === 0 ? "bg-danger" : "bg-warn")} style={{ width: `${Math.max(ratio * 100, qty === 0 ? 0 : 6)}%` }} />
      </div>
    </div>
  )
}

function ActivityRow({ label, value, total, tone, icon: Icon }: { label: string; value: number; total: number; tone: Tone; icon: LucideIcon }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-ink"><Icon className={cn("size-4", toneClasses[tone].icon.split(" ")[1])} aria-hidden="true" />{label}</span>
        <span className="font-mono tabular-nums text-ink">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line/50" aria-hidden="true"><div className={cn("h-full rounded-full", toneClasses[tone].bar)} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export function DashboardPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === "admin"
  const summary = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => getDashboardSummary(20) })
  const recent = useQuery({ queryKey: ["movements", { page: 1, pageSize: 6, scope: "dashboard" }], queryFn: () => listMovements({ page: 1, pageSize: 6 }) })
  const data = summary.data
  const firstName = profile?.display_name?.split(" ")[0] ?? ""

  return (
    <section className="space-y-6" aria-labelledby="dashboard-title">
      {/* Faixa de destaque */}
      <div className="relative overflow-hidden rounded-2xl bg-ink p-6 text-surface shadow-sm sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-signal/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 right-40 size-64 rounded-full bg-success/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-surface/70">Painel · RF14</p>
            <h1 id="dashboard-title" className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Olá{firstName ? `, ${firstName}` : ""}.</h1>
            <p className="max-w-xl text-sm text-surface/80">
              {data
                ? data.counts.at_or_below_minimum > 0
                  ? `${data.counts.at_or_below_minimum} ${data.counts.at_or_below_minimum === 1 ? "item está" : "itens estão"} no limite mínimo ou zerados. Planeje a reposição a partir da lista abaixo.`
                  : "Nenhum item ativo está no limite mínimo. Estoque em dia."
                : "Consultando indicadores do almoxarifado..."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-surface text-ink hover:bg-surface/90"><Link to="/movimentacoes/nova"><ArrowDownToLine />Registrar entrada</Link></Button>
            <Button asChild variant="outline" className="border-surface/30 bg-transparent text-surface hover:bg-surface/10 hover:text-surface"><Link to="/movimentacoes/saida"><ArrowUpFromLine />Registrar saída</Link></Button>
            {isAdmin ? <Button asChild variant="outline" className="border-surface/30 bg-transparent text-surface hover:bg-surface/10 hover:text-surface"><Link to="/movimentacoes/ajuste"><ClipboardCheck />Contagem</Link></Button> : null}
          </div>
        </div>
      </div>

      {summary.isLoading ? <LoadingSkeleton lines={4} /> : null}
      {summary.error ? <ErrorState message={getErrorMessage(summary.error, "Não foi possível carregar o painel.")} action={<Button size="sm" variant="outline" onClick={() => void summary.refetch()}>Tentar novamente</Button>} /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <KpiTile label="Produtos ativos" value={data.counts.active_products} hint={`${data.counts.inactive_products} inativo(s) no catálogo`} icon={Boxes} tone="signal" to="/produtos" />
            <KpiTile label="No limite mínimo" value={data.counts.at_or_below_minimum} hint="saldo ≤ estoque mínimo configurado" icon={TriangleAlert} tone="warn" />
            <KpiTile label="Itens zerados" value={data.counts.zero_balance} hint="ativos sem saldo disponível" icon={PackageX} tone="danger" to="/produtos?situacao=zero_balance" />
            <KpiTile label="Movimentos em 7 dias" value={data.activity.last_7_days} hint={data.activity.last_movement_at ? `último em ${formatDateTime(data.activity.last_movement_at)}` : "sem movimentações"} icon={Activity} tone="success" to="/movimentacoes" />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="min-w-0 gap-4 xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-heading text-base"><TriangleAlert className="size-4 text-warn" aria-hidden="true" />Alertas de estoque mínimo</CardTitle>
                <CardDescription>Itens ativos com saldo menor ou igual ao mínimo, priorizando os zerados.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.alerts.length === 0 ? (
                  <EmptyState title="Nenhum alerta" description="Todos os itens ativos estão acima do estoque mínimo." />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead className="hidden md:table-cell">Local</TableHead>
                          <TableHead>Saldo × mínimo</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.alerts.map((alert) => (
                          <TableRow key={alert.id}>
                            <TableCell>
                              <Link to={`/produtos/${alert.id}`} className="font-medium text-ink hover:underline">{alert.name}</Link>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <span className="font-mono text-xs text-muted">{alert.sku}</span>
                                {Number(alert.quantity) === 0 ? <Badge variant="danger">Zerado</Badge> : <Badge variant="warning">No limite</Badge>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden text-sm text-muted md:table-cell">{alert.location ?? "—"}</TableCell>
                            <TableCell><CoverageBar alert={alert} /></TableCell>
                            <TableCell className="text-right"><Button asChild size="sm" variant="outline"><Link to={`/movimentacoes/nova?produto=${alert.id}`}>Repor</Link></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid min-w-0 content-start gap-6 md:grid-cols-2 xl:grid-cols-1">
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle className="font-heading text-base">Atividade (7 dias)</CardTitle>
                  <CardDescription>Distribuição dos lançamentos confirmados.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ActivityRow label="Entradas" value={data.activity.entries_7_days} total={data.activity.last_7_days} tone="success" icon={ArrowDownToLine} />
                  <ActivityRow label="Saídas" value={data.activity.exits_7_days} total={data.activity.last_7_days} tone="warn" icon={ArrowUpFromLine} />
                  <ActivityRow label="Correções" value={data.activity.corrections_7_days} total={data.activity.last_7_days} tone="signal" icon={RefreshCw} />
                </CardContent>
              </Card>

              <Card className="gap-3">
                <CardHeader>
                  <CardTitle className="font-heading text-base">Últimas operações</CardTitle>
                </CardHeader>
                <CardContent>
                  {recent.error ? <p className="text-sm text-danger" role="alert">{getErrorMessage(recent.error, "Não foi possível carregar.")}</p> : null}
                  <ol className="space-y-3">
                    {(recent.data?.items ?? []).map((m) => (
                      <li key={m.id} className="flex items-start justify-between gap-3 border-b border-line/70 pb-3 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{m.snapshots.name ?? m.products?.name ?? "Produto"}</p>
                          <p className="text-xs text-muted">{m.snapshots.actor_name ?? "—"} · {formatDateTime(m.recorded_at)}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <MovementKindBadge kind={m.kind} />
                          <span className={cn("font-mono text-xs tabular-nums", Number(m.delta) < 0 ? "text-warn" : "text-success")}>{Number(m.delta) > 0 ? "+" : ""}{formatQuantity(m.delta, m.snapshots.unit)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <Button asChild variant="link" className="mt-2 h-auto px-0"><Link to="/movimentacoes">Ver log completo →</Link></Button>
                </CardContent>
              </Card>
            </div>
          </div>
          <p className="text-right font-mono text-xs text-muted">Indicadores gerados pelo servidor em {formatDateTime(data.generated_at)}</p>
        </>
      ) : null}
    </section>
  )
}
