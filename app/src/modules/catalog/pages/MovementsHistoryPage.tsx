import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/modules/shared/errors";
import { searchStockMovements } from "../services/catalog-api";
import type { MovementKind, MovementSearchFilters } from "../types";

const kinds: Array<[MovementKind | "", string]> = [["", "Todos os tipos"], ["ENTRADA", "Entrada"], ["SAIDA", "Saída"], ["ABERTURA", "Abertura"], ["AJUSTE", "Ajuste"], ["ESTORNO", "Estorno"]];
const labels: Record<MovementKind, string> = { ENTRADA: "Entrada", SAIDA: "Saída", ABERTURA: "Abertura", AJUSTE: "Ajuste", ESTORNO: "Estorno" };
const emptyFilters = { fromDate: "", toDate: "", product: "", kind: "" as MovementKind | "", actor: "", department: "" };
type FormFilters = typeof emptyFilters;

function localDayStart(value: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day!).toISOString();
}

function localDayAfter(value: string): string | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year!, month! - 1, day! + 1).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

export function MovementsHistoryPage() {
  const [formFilters, setFormFilters] = useState<FormFilters>(emptyFilters);
  const [filters, setFilters] = useState<MovementSearchFilters>({ from: null, toExclusive: null, product: "", kind: "", actor: "", department: "", page: 1, pageSize: 25 });
  const movements = useQuery({ queryKey: ["stock-movements", filters], queryFn: () => searchStockMovements(filters) });
  const totalPages = Math.max(1, Math.ceil((movements.data?.total ?? 0) / (movements.data?.page_size ?? filters.pageSize)));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ from: localDayStart(formFilters.fromDate), toExclusive: localDayAfter(formFilters.toDate), product: formFilters.product.trim(), kind: formFilters.kind, actor: formFilters.actor.trim(), department: formFilters.department.trim(), page: 1, pageSize: 25 });
  }

  return <section className="space-y-6" aria-labelledby="movement-history-title">
    <div><h1 id="movement-history-title" className="text-2xl font-semibold">Histórico de movimentações</h1><p className="mt-1 text-sm text-gray-600">Consulte entradas, saídas, ajustes e estornos. Períodos usam as datas locais do navegador; os resultados são paginados no banco.</p></div>
    <form className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={applyFilters}>
      <div className="space-y-2"><Label htmlFor="history-from">Data inicial</Label><Input id="history-from" type="date" value={formFilters.fromDate} onChange={(event) => setFormFilters((value) => ({ ...value, fromDate: event.target.value }))} /></div>
      <div className="space-y-2"><Label htmlFor="history-to">Data final</Label><Input id="history-to" type="date" value={formFilters.toDate} onChange={(event) => setFormFilters((value) => ({ ...value, toDate: event.target.value }))} /></div>
      <div className="space-y-2"><Label htmlFor="history-kind">Tipo</Label><select id="history-kind" className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={formFilters.kind} onChange={(event) => setFormFilters((value) => ({ ...value, kind: event.target.value as MovementKind | "" }))}>{kinds.map(([kind, label]) => <option key={kind || "all"} value={kind}>{label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor="history-product">Produto (nome ou SKU)</Label><Input id="history-product" value={formFilters.product} onChange={(event) => setFormFilters((value) => ({ ...value, product: event.target.value }))} maxLength={160} /></div>
      <div className="space-y-2"><Label htmlFor="history-actor">Responsável</Label><Input id="history-actor" value={formFilters.actor} onChange={(event) => setFormFilters((value) => ({ ...value, actor: event.target.value }))} maxLength={120} /></div>
      <div className="space-y-2"><Label htmlFor="history-department">Setor</Label><Input id="history-department" value={formFilters.department} onChange={(event) => setFormFilters((value) => ({ ...value, department: event.target.value }))} maxLength={120} /></div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3"><Button type="submit">Aplicar filtros</Button><Button type="button" variant="outline" onClick={() => { setFormFilters(emptyFilters); setFilters({ from: null, toExclusive: null, product: "", kind: "", actor: "", department: "", page: 1, pageSize: 25 }); }}>Limpar</Button></div>
    </form>
    {movements.isLoading ? <p role="status">Carregando movimentações...</p> : null}
    {movements.error ? <p className="text-sm text-red-700" role="alert">{getErrorMessage(movements.error, "Não foi possível consultar o histórico.")}</p> : null}
    {movements.data ? <>
      <p className="text-sm text-gray-600" role="status">{movements.data.total === 0 ? "Nenhuma movimentação encontrada." : `${movements.data.total} movimentação(ões) · página ${filters.page} de ${totalPages}`}</p>
      {movements.data.items.length > 0 ? <div className="overflow-x-auto rounded-lg border bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Produto</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Variação</th><th className="px-3 py-2">Saldo após</th><th className="px-3 py-2">Responsável</th><th className="px-3 py-2">Setor</th><th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Vínculo</th></tr></thead><tbody>{movements.data.items.map((movement) => <tr key={movement.id} className="border-b last:border-0"><td className="whitespace-nowrap px-3 py-2">{formatDate(movement.recorded_at)}</td><td className="px-3 py-2"><Link className="underline" to={`/produtos/${movement.product_id}`}>{movement.snapshots.sku ?? movement.product_sku} — {movement.snapshots.name ?? movement.product_name}</Link></td><td className="px-3 py-2">{labels[movement.kind]}</td><td className="whitespace-nowrap px-3 py-2">{movement.delta} {movement.snapshots.unit ?? movement.product_unit}</td><td className="whitespace-nowrap px-3 py-2">{movement.balance_after} {movement.snapshots.unit ?? movement.product_unit}</td><td className="px-3 py-2">{movement.snapshots.actor_name ?? "—"}</td><td className="px-3 py-2">{movement.snapshots.department_name ?? "—"}</td><td className="px-3 py-2">{movement.reason}</td><td className="break-all px-3 py-2">{movement.reversal_of ? `Estorno de ${movement.reversal_of}` : movement.reversed_by ? `Estornado por ${movement.reversed_by}` : "—"}</td></tr>)}</tbody></table></div> : null}
      <div className="flex items-center justify-between text-sm"><Button type="button" variant="outline" onClick={() => setFilters((value) => ({ ...value, page: Math.max(1, value.page - 1) }))} disabled={filters.page <= 1 || movements.isFetching}>Anterior</Button><span>Página {filters.page} de {totalPages}</span><Button type="button" variant="outline" onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))} disabled={filters.page >= totalPages || movements.isFetching}>Próxima</Button></div>
    </> : null}
  </section>;
}
