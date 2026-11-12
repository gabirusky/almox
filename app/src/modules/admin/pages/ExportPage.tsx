import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { FileDown, FileSpreadsheet, ScrollText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { listCategories, listDepartments, listMovements, listProducts } from "@/modules/catalog/services/catalog-api"
import type { MovementKind } from "@/modules/catalog/types"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { FeedbackAlert } from "@/modules/shared/components/States"
import { getErrorMessage } from "@/modules/shared/errors"
import { formatDateTime } from "@/modules/shared/formatters"
import { csvFileName, downloadCsv, toCsv, type CsvColumn } from "../csv"
import { exportBalances, exportMovements } from "../services/admin-api"
import type { BalanceExportFilters, BalanceExportRow, BalanceExportSituation, MovementExportFilters, MovementExportRow } from "../types"

const situations: Array<{ value: BalanceExportSituation; label: string }> = [
  { value: "all", label: "Todos os produtos" },
  { value: "active", label: "Somente ativos" },
  { value: "inactive", label: "Somente inativos" },
  { value: "zero_balance", label: "Ativos zerados" },
  { value: "at_or_below_minimum", label: "Ativos no limite mínimo" },
]

const kinds: Array<{ value: MovementKind | ""; label: string }> = [
  { value: "", label: "Todos os tipos" },
  { value: "ENTRADA", label: "Entrada" },
  { value: "SAIDA", label: "Saída" },
  { value: "ABERTURA", label: "Abertura" },
  { value: "AJUSTE", label: "Ajuste" },
  { value: "ESTORNO", label: "Estorno" },
]

const balanceColumns: CsvColumn<BalanceExportRow>[] = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Produto" },
  { key: "category_name", label: "Categoria" },
  { key: "unit", label: "Unidade" },
  { key: "quantity", label: "Saldo", type: "number" },
  { key: "minimum_stock", label: "Estoque mínimo", type: "number" },
  { key: "at_or_below_minimum", label: "Limite mínimo", type: "boolean" },
  { key: "location", label: "Localização" },
  { key: "active", label: "Ativo", type: "boolean" },
  { key: "version", label: "Versão do saldo", type: "number" },
  { key: "updated_at", label: "Última atualização", type: "datetime" },
]

const movementColumns: CsvColumn<MovementExportRow>[] = [
  { key: "recorded_at", label: "Data/hora (servidor)", type: "datetime" },
  { key: "kind", label: "Tipo" },
  { key: "sku", label: "SKU" },
  { key: "product_name", label: "Produto" },
  { key: "unit", label: "Unidade" },
  { key: "delta", label: "Efeito", type: "number" },
  { key: "balance_before", label: "Saldo anterior", type: "number" },
  { key: "balance_after", label: "Saldo posterior", type: "number" },
  { key: "product_version", label: "Versão", type: "number" },
  { key: "actor_name", label: "Responsável" },
  { key: "origin", label: "Origem" },
  { key: "department_name", label: "Setor" },
  { key: "recipient_ref", label: "Recebedor" },
  { key: "document_ref", label: "Documento" },
  { key: "reason", label: "Motivo" },
  { key: "id", label: "ID do lançamento" },
  { key: "reversal_of", label: "Estorna o lançamento" },
  { key: "reversed_by", label: "Estornado por" },
]

export function ExportPage() {
  const [balanceFilters, setBalanceFilters] = useState<BalanceExportFilters>({ categoryId: "", situation: "all" })
  const [movementFilters, setMovementFilters] = useState<MovementExportFilters>({ dateFrom: "", dateTo: "", productId: "", kind: "", actorId: "", departmentId: "" })
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null)

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories })
  const departments = useQuery({ queryKey: ["departments"], queryFn: listDepartments })
  const products = useQuery({ queryKey: ["products", { page: 1, pageSize: 100, sort: "name", direction: "asc" }], queryFn: () => listProducts({ page: 1, pageSize: 100, sort: "name", direction: "asc" }) })
  const actorSample = useQuery({ queryKey: ["movement-actors"], queryFn: () => listMovements({ page: 1, pageSize: 200 }) })
  const actorOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of actorSample.data?.items ?? []) if (m.actor_id) map.set(m.actor_id, m.snapshots.actor_name || m.actor_id)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
  }, [actorSample.data])

  const categoryName = (id?: string) => (id ? categories.data?.find((c) => c.id === id)?.name ?? id : "Todas")
  const productName = (id?: string) => (id ? (() => { const p = products.data?.items.find((x) => x.id === id); return p ? `${p.sku} — ${p.name}` : id })() : "Todos")
  const departmentName = (id?: string) => (id ? departments.data?.find((d) => d.id === id)?.name ?? id : "Todos")
  const actorName = (id?: string) => (id ? actorOptions.find(([a]) => a === id)?.[1] ?? id : "Todos")

  const balancesMutation = useMutation({
    mutationFn: () => exportBalances(balanceFilters),
    onSuccess: (result) => {
      const meta: Array<[string, string]> = [
        ["Relatório", "ALMOX — Saldo de estoque"],
        ["Gerado em (servidor)", formatDateTime(result.generated_at)],
        ["Filtro: categoria", categoryName(balanceFilters.categoryId)],
        ["Filtro: situação", situations.find((s) => s.value === (balanceFilters.situation ?? "all"))?.label ?? "Todos"],
        ["Linhas", String(result.row_count)],
      ]
      downloadCsv(csvFileName("saldos", result.generated_at), toCsv(balanceColumns, result.rows, meta))
      setFeedback({ type: "success", text: `Saldo exportado: ${result.row_count} linha(s), consulta de ${formatDateTime(result.generated_at)}. A exportação foi registrada na auditoria.` })
    },
    onError: (error) => setFeedback({ type: "danger", text: getErrorMessage(error, "Não foi possível exportar o saldo.") }),
  })

  const movementsMutation = useMutation({
    mutationFn: () => exportMovements(movementFilters),
    onSuccess: (result) => {
      const meta: Array<[string, string]> = [
        ["Relatório", "ALMOX — Movimentações de estoque"],
        ["Gerado em (servidor)", formatDateTime(result.generated_at)],
        ["Filtro: período", `${movementFilters.dateFrom || "início"} a ${movementFilters.dateTo || "hoje"}`],
        ["Filtro: produto", productName(movementFilters.productId)],
        ["Filtro: tipo", kinds.find((k) => k.value === (movementFilters.kind ?? ""))?.label ?? "Todos"],
        ["Filtro: responsável", actorName(movementFilters.actorId)],
        ["Filtro: setor", departmentName(movementFilters.departmentId)],
        ["Linhas", String(result.row_count)],
      ]
      downloadCsv(csvFileName("movimentacoes", result.generated_at), toCsv(movementColumns, result.rows, meta))
      setFeedback({ type: "success", text: `Movimentações exportadas: ${result.row_count} linha(s), consulta de ${formatDateTime(result.generated_at)}. A exportação foi registrada na auditoria.` })
    },
    onError: (error) => setFeedback({ type: "danger", text: getErrorMessage(error, "Não foi possível exportar as movimentações.") }),
  })

  const busy = balancesMutation.isPending || movementsMutation.isPending

  return (
    <section className="space-y-6">
      <PageHeader
        title="Relatórios CSV"
        description="Exporte saldo e movimentações filtradas. Cada arquivo traz os filtros aplicados e o momento da geração no servidor; a exportação é restrita a administradores e fica registrada na auditoria."
      />
      {feedback ? <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert> : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-lg bg-signal/10 text-signal" aria-hidden="true"><FileSpreadsheet className="size-5" /></div>
            <CardTitle className="font-heading text-base">Saldo de estoque</CardTitle>
            <CardDescription>Fotografia do saldo atual por produto, com mínimo e situação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="b-category">Categoria</Label>
              <Select id="b-category" value={balanceFilters.categoryId ?? ""} onChange={(e) => setBalanceFilters((f) => ({ ...f, categoryId: e.target.value }))} disabled={busy}>
                <option value="">Todas as categorias</option>
                {(categories.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (inativa)"}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-situation">Situação</Label>
              <Select id="b-situation" value={balanceFilters.situation ?? "all"} onChange={(e) => setBalanceFilters((f) => ({ ...f, situation: e.target.value as BalanceExportSituation }))} disabled={busy}>
                {situations.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button type="button" onClick={() => { setFeedback(null); balancesMutation.mutate() }} disabled={busy}>
              <FileDown />{balancesMutation.isPending ? "Gerando..." : "Exportar saldo (.csv)"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="mb-1 grid size-10 place-items-center rounded-lg bg-success/10 text-success" aria-hidden="true"><ScrollText className="size-5" /></div>
            <CardTitle className="font-heading text-base">Movimentações</CardTitle>
            <CardDescription>Lançamentos com autoria, efeito, saldos e vínculos de estorno (até 50.000 linhas).</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); setFeedback(null); movementsMutation.mutate() }} id="movement-export-form">
              <div className="space-y-1.5">
                <Label htmlFor="m-from">De</Label>
                <Input id="m-from" type="date" value={movementFilters.dateFrom ?? ""} onChange={(e) => setMovementFilters((f) => ({ ...f, dateFrom: e.target.value }))} disabled={busy} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-to">Até</Label>
                <Input id="m-to" type="date" value={movementFilters.dateTo ?? ""} onChange={(e) => setMovementFilters((f) => ({ ...f, dateTo: e.target.value }))} disabled={busy} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-product">Produto</Label>
                <Select id="m-product" value={movementFilters.productId ?? ""} onChange={(e) => setMovementFilters((f) => ({ ...f, productId: e.target.value }))} disabled={busy}>
                  <option value="">Todos os produtos</option>
                  {(products.data?.items ?? []).map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-kind">Tipo</Label>
                <Select id="m-kind" value={movementFilters.kind ?? ""} onChange={(e) => setMovementFilters((f) => ({ ...f, kind: e.target.value as MovementKind | "" }))} disabled={busy}>
                  {kinds.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-actor">Responsável</Label>
                <Select id="m-actor" value={movementFilters.actorId ?? ""} onChange={(e) => setMovementFilters((f) => ({ ...f, actorId: e.target.value }))} disabled={busy}>
                  <option value="">Todos</option>
                  {actorOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="m-dept">Setor</Label>
                <Select id="m-dept" value={movementFilters.departmentId ?? ""} onChange={(e) => setMovementFilters((f) => ({ ...f, departmentId: e.target.value }))} disabled={busy}>
                  <option value="">Todos os setores</option>
                  {(departments.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}{d.active ? "" : " (inativo)"}</option>)}
                </Select>
              </div>
            </form>
          </CardContent>
          <CardFooter className="mt-auto flex flex-wrap gap-2">
            <Button type="submit" form="movement-export-form" disabled={busy}>
              <FileDown />{movementsMutation.isPending ? "Gerando..." : "Exportar movimentações (.csv)"}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setMovementFilters({ dateFrom: "", dateTo: "", productId: "", kind: "", actorId: "", departmentId: "" })}>Limpar filtros</Button>
          </CardFooter>
        </Card>
      </div>

      <p className="text-xs text-muted">Formato: UTF-8 com BOM, separador “;” e decimais com vírgula (abre direto no Excel em português). Campos de texto iniciados por =, +, - ou @ são prefixados com apóstrofo para impedir execução de fórmulas. Exportar CSV não substitui backup (RNF09).</p>
    </section>
  )
}
