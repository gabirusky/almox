import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/modules/shared/errors";
import { balanceQuantity, adjustStockByCount, getProduct, listProducts } from "../services/catalog-api";

const schema = z.object({ countedQuantity: z.string().trim().regex(/^\d+(?:[.,]\d{1,3})?$/, "Informe uma contagem não negativa com até três casas decimais."), reason: z.string().trim().min(1, "Informe o motivo da divergência.").max(500, "Máximo de 500 caracteres.") });

export function InventoryCountPage() {
  const queryClient = useQueryClient();
  const operationKey = useRef(crypto.randomUUID());
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [countedQuantity, setCountedQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const products = useQuery({ queryKey: ["products", "inventory-count", search], queryFn: () => listProducts({ situation: "active", search, pageSize: 20 }) });
  const product = useQuery({ queryKey: ["products", "inventory-count-selected", productId], queryFn: () => getProduct(productId), enabled: Boolean(productId) });
  const stock = product.data?.stock_balances;
  const balance = product.data ? balanceQuantity(product.data) : 0;
  const version = Array.isArray(stock) ? stock[0]?.version ?? 0 : stock?.version ?? 0;
  const mutation = useMutation({
    mutationFn: () => adjustStockByCount({ productId, countedQuantity: countedQuantity.replace(",", "."), expectedVersion: version, reason, operationKey: operationKey.current }),
    onSuccess: async (result) => {
      setFeedback(`Ajuste registrado. Saldo: ${result.balance}; versão: ${result.version}; lançamento: ${result.movement_id}.`);
      operationKey.current = crypto.randomUUID();
      setCountedQuantity(""); setReason("");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] });
      await queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    },
    onError: async (error) => {
      const message = getErrorMessage(error, "Não foi possível registrar o ajuste.");
      setFeedback(message);
      if (typeof error === "object" && error && "message" in error && String(error.message).includes("STOCK_VERSION_CHANGED")) {
        setCountedQuantity("");
        operationKey.current = crypto.randomUUID();
      }
      await queryClient.invalidateQueries({ queryKey: ["products", "inventory-count-selected", productId] });
    },
  });

  function changeCount(value: string) { setCountedQuantity(value); operationKey.current = crypto.randomUUID(); setFeedback(null); }
  function changeReason(value: string) { setReason(value); operationKey.current = crypto.randomUUID(); setFeedback(null); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({ countedQuantity, reason });
    if (!parsed.success || !product.data?.active) { setFeedback(parsed.success ? "Produto inativo não aceita ajustes." : parsed.error.issues[0]?.message ?? "Revise os campos."); return; }
    const counted = Number(countedQuantity.replace(",", "."));
    if ((product.data.unit === "UN" || product.data.unit === "CX") && !Number.isInteger(counted)) { setFeedback(`A unidade ${product.data.unit} exige uma contagem inteira.`); return; }
    if (counted === balance) { setFeedback("A contagem coincide com o saldo atual; nenhum ajuste é necessário."); return; }
    const delta = counted - balance;
    if (!window.confirm(`Produto: ${product.data.sku} — ${product.data.name}\nSaldo lido: ${balance} ${product.data.unit} (versão ${version})\nContagem física: ${counted} ${product.data.unit}\nAjuste: ${delta > 0 ? "+" : ""}${delta} ${product.data.unit}\nMotivo: ${reason.trim()}\n\nSe o estoque mudar antes da confirmação, o banco recusará o ajuste para nova contagem. Confirmar?`)) return;
    mutation.mutate();
  }

  return <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="inventory-count-title">
    <div><Link to="/produtos" className="text-sm underline">← Voltar para produtos</Link><h1 id="inventory-count-title" className="mt-2 text-2xl font-semibold">Ajuste por contagem física</h1><p className="text-sm text-gray-600">Informe a contagem observada. Se o saldo mudar após a leitura, a operação será recusada para reconferência.</p></div>
    {feedback ? <p className="rounded border bg-white p-3 text-sm" role="status">{feedback}</p> : null}
    <form className="space-y-4 rounded-lg border bg-white p-5" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor="count-product-search">Buscar produto por nome ou SKU</Label><Input id="count-product-search" value={search} onChange={(event) => { setSearch(event.target.value); setProductId(""); setCountedQuantity(""); setReason(""); operationKey.current = crypto.randomUUID(); setFeedback(null); }} placeholder="Digite para localizar" disabled={mutation.isPending} /></div>
      {products.error ? <p className="text-sm text-red-700" role="alert">{getErrorMessage(products.error, "Não foi possível buscar produtos.")}</p> : null}
      <div className="space-y-2"><Label htmlFor="count-product">Produto</Label><select id="count-product" className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" value={productId} onChange={(event) => { setProductId(event.target.value); setCountedQuantity(""); setReason(""); operationKey.current = crypto.randomUUID(); setFeedback(null); }} disabled={products.isLoading || mutation.isPending}><option value="">Selecione...</option>{product.data && !products.data?.items.some((item) => item.id === product.data?.id) ? <option value={product.data.id}>{product.data.sku} — {product.data.name} ({product.data.unit})</option> : null}{(products.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name} ({item.unit})</option>)}</select></div>
      {product.data ? <p className="rounded bg-gray-50 p-3 text-sm">Saldo consultado: <strong>{balance} {product.data.unit}</strong> · versão <strong>{version}</strong></p> : null}
      <div className="space-y-2"><Label htmlFor="count-quantity">Contagem física</Label><Input id="count-quantity" inputMode="decimal" value={countedQuantity} onChange={(event) => changeCount(event.target.value)} placeholder="Ex.: 8 ou 2,500" disabled={!product.data?.active || mutation.isPending} /></div>
      <div className="space-y-2"><Label htmlFor="count-reason">Motivo da divergência</Label><Input id="count-reason" maxLength={500} value={reason} onChange={(event) => changeReason(event.target.value)} placeholder="Descreva a conferência e a divergência" disabled={!product.data?.active || mutation.isPending} /></div>
      <Button type="submit" disabled={!product.data?.active || mutation.isPending}>{mutation.isPending ? "Registrando ajuste..." : "Revisar e confirmar"}</Button>
    </form>
  </section>;
}
