import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ReversalAction } from "./ReversalAction";
import { useAuth } from "@/modules/access/use-auth";
import { getErrorMessage } from "@/modules/shared/errors";
import { balanceQuantity, getProductHistory } from "../services/catalog-api";
import type { MovementKind } from "../types";

const movementLabels: Record<MovementKind, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  ABERTURA: "Abertura",
  AJUSTE: "Ajuste",
  ESTORNO: "Estorno",
};

function formatQuantity(value: number | string, unit: string) {
  const quantity = typeof value === "string" ? Number(value) : value;
  return `${Number.isFinite(quantity) ? quantity : value} ${unit}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

export function ProductDetailsPage() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [page, setPage] = useState(1);
  const history = useQuery({
    queryKey: ["product-history", id, page],
    queryFn: () => getProductHistory(id ?? "", page, 10),
    enabled: Boolean(id),
  });

  if (!id) return <p role="alert">Produto inválido.</p>;
  if (history.isLoading) return <p>Carregando produto e histórico...</p>;
  if (history.error) return <section className="space-y-4" aria-labelledby="product-error-title"><h1 id="product-error-title" className="text-2xl font-semibold">Não foi possível consultar o produto</h1><p className="text-red-700" role="alert">{getErrorMessage(history.error, "Verifique seu acesso e tente novamente.")}</p><Link to="/produtos" className="underline">Voltar para produtos</Link></section>;
  if (!history.data) return null;

  const { product, movements, reversedBy, total, pageSize } = history.data;
  const quantity = balanceQuantity(product);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="space-y-6" aria-labelledby="product-details-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/produtos" className="text-sm underline">← Voltar para produtos</Link>
          <h1 id="product-details-title" className="mt-2 text-2xl font-semibold">{product.name}</h1>
          <p className="text-sm text-gray-600">SKU {product.sku} · {product.categories?.name ?? "Sem categoria"}</p>
        </div>
        <span className={`rounded px-2 py-1 text-sm ${!product.active ? "bg-gray-100 text-gray-700" : quantity <= 0 ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800"}`}>
          {!product.active ? "Inativo" : quantity <= 0 ? "Sem saldo" : "Ativo"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-gray-600">Saldo atual</p><p className="mt-1 text-xl font-semibold">{formatQuantity(quantity, product.unit)}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-gray-600">Unidade</p><p className="mt-1 text-xl font-semibold">{product.unit}</p></div>
        <div className="rounded-lg border bg-white p-4"><p className="text-sm text-gray-600">Última atualização</p><p className="mt-1 text-sm font-semibold">{product.stock_balances && !Array.isArray(product.stock_balances) ? formatDate(product.stock_balances.updated_at) : "Ainda não atualizado"}</p></div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="border-b p-4"><h2 className="font-semibold">Histórico de movimentações</h2><p className="text-sm text-gray-600">Ordenado por versão do estoque, horário do servidor e identificador.</p>{product.active ? <Link to={`/movimentacoes/saida?produto=${product.id}`} className="mt-2 inline-block text-sm underline">Registrar saída</Link> : null}</div>
        {movements.length === 0 ? <p className="p-4 text-sm text-gray-600">Nenhuma movimentação registrada para este produto.</p> : (
          <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b bg-gray-50"><tr><th className="px-4 py-2">Data</th><th className="px-4 py-2">Tipo</th><th className="px-4 py-2">Variação</th><th className="px-4 py-2">Saldo</th><th className="px-4 py-2">Versão</th><th className="px-4 py-2">Responsável</th><th className="px-4 py-2">Destino</th><th className="px-4 py-2">Motivo</th><th className="px-4 py-2">Correção</th></tr></thead><tbody>
            {movements.map((movement) => <tr key={movement.id} className="border-b last:border-0"><td className="whitespace-nowrap px-4 py-2">{formatDate(movement.recorded_at)}</td><td className="px-4 py-2">{movementLabels[movement.kind]}</td><td className="px-4 py-2">{formatQuantity(movement.delta, product.unit)}</td><td className="px-4 py-2">{formatQuantity(movement.balance_after, product.unit)}</td><td className="px-4 py-2">{movement.product_version}</td><td className="px-4 py-2">{movement.snapshots.actor_name ?? "—"}</td><td className="px-4 py-2">{movement.department_id ? <>{movement.snapshots.department_name ?? "Setor não informado"}<br /><span className="text-gray-600">Recebedor: {movement.recipient_ref ?? "—"}</span></> : "—"}</td><td className="px-4 py-2">{movement.reason}</td><td className="px-4 py-2"><p className="break-all text-xs text-gray-600">ID: {movement.id}</p>{movement.reversal_of ? <p className="break-all text-sm">Estorno de: {movement.reversal_of}</p> : reversedBy[movement.id] ? <p className="break-all text-sm">Estornado por: {reversedBy[movement.id]}</p> : movement.kind !== "ESTORNO" && profile?.role === "admin" ? product.active ? <ReversalAction movement={movement} unit={movement.snapshots.unit ?? product.unit} /> : <p className="text-sm">Reative o produto antes de estornar.</p> : null}</td></tr>)}
          </tbody></table></div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm" aria-label="Paginação do histórico"><p className="text-gray-600">{total === 0 ? "Nenhum lançamento" : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}</p><div className="flex items-center gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Anterior</Button><span>Página {page} de {totalPages}</span><Button type="button" size="sm" variant="outline" onClick={() => setPage((current) => current + 1)} disabled={page >= totalPages}>Próxima</Button></div></div>
    </section>
  );
}
