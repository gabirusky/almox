import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/modules/shared/components/ConfirmDialog";
import { PageHeader } from "@/modules/shared/components/PageHeader";
import { FeedbackAlert } from "@/modules/shared/components/States";
import { getErrorMessage } from "@/modules/shared/errors";
import { formatQuantity } from "@/modules/shared/formatters";
import { balanceQuantity, adjustStockByCount, getProduct, listProducts } from "../services/catalog-api";

const schema = z.object({ countedQuantity: z.string().trim().regex(/^\d+(?:[.,]\d{1,3})?$/, "Informe uma contagem não negativa com até três casas decimais."), reason: z.string().trim().min(1, "Informe o motivo da divergência.").max(500, "Máximo de 500 caracteres.") });

type Feedback = { type: "success" | "danger" | "warning"; text: string; productId?: string };

export function InventoryCountPage() {
  const queryClient = useQueryClient();
  const operationKey = useRef(crypto.randomUUID());
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [countedQuantity, setCountedQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [review, setReview] = useState<{ counted: number; delta: number } | null>(null);
  const products = useQuery({ queryKey: ["products", "inventory-count", search], queryFn: () => listProducts({ situation: "active", search, pageSize: 20 }) });
  const product = useQuery({ queryKey: ["products", "inventory-count-selected", productId], queryFn: () => getProduct(productId), enabled: Boolean(productId) });
  const stock = product.data?.stock_balances;
  const balance = product.data ? balanceQuantity(product.data) : 0;
  const version = Array.isArray(stock) ? stock[0]?.version ?? 0 : stock?.version ?? 0;
  const mutation = useMutation({
    mutationFn: () => adjustStockByCount({ productId, countedQuantity: countedQuantity.replace(",", "."), expectedVersion: version, reason, operationKey: operationKey.current }),
    onSuccess: async (result) => {
      setReview(null);
      setFeedback({ type: "success", text: `Ajuste registrado (${Number(result.delta) > 0 ? "+" : ""}${result.delta}). Saldo: ${result.balance}; versão ${result.version}.`, productId: result.product_id });
      operationKey.current = crypto.randomUUID();
      setCountedQuantity(""); setReason("");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] });
      await queryClient.invalidateQueries({ queryKey: ["movements"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
    onError: async (error) => {
      setReview(null);
      const versionChanged = typeof error === "object" && error && "message" in error && String(error.message).includes("STOCK_VERSION_CHANGED");
      setFeedback({ type: versionChanged ? "warning" : "danger", text: getErrorMessage(error, "Não foi possível registrar o ajuste.") });
      if (versionChanged) {
        setCountedQuantity("");
        operationKey.current = crypto.randomUUID();
      }
      await queryClient.invalidateQueries({ queryKey: ["products", "inventory-count-selected", productId] });
    },
  });

  function resetSelection() { setCountedQuantity(""); setReason(""); operationKey.current = crypto.randomUUID(); setFeedback(null); }
  function changeCount(value: string) { setCountedQuantity(value); operationKey.current = crypto.randomUUID(); setFeedback(null); }
  function changeReason(value: string) { setReason(value); operationKey.current = crypto.randomUUID(); setFeedback(null); }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({ countedQuantity, reason });
    if (!parsed.success || !product.data?.active) { setFeedback({ type: "danger", text: parsed.success ? "Produto inativo não aceita ajustes." : parsed.error.issues[0]?.message ?? "Revise os campos." }); return; }
    const counted = Number(countedQuantity.replace(",", "."));
    if ((product.data.unit === "UN" || product.data.unit === "CX") && !Number.isInteger(counted)) { setFeedback({ type: "danger", text: `A unidade ${product.data.unit} exige uma contagem inteira.` }); return; }
    if (counted === balance) { setFeedback({ type: "warning", text: "A contagem coincide com o saldo atual; nenhum ajuste é necessário." }); return; }
    setReview({ counted, delta: Math.round((counted - balance) * 1000) / 1000 });
  }

  const busy = mutation.isPending;

  return (
    <section className="space-y-6" aria-labelledby="inventory-count-title">
      <PageHeader
        back={<Link to="/produtos" className="text-sm text-signal underline underline-offset-2">← Voltar para produtos</Link>}
        title={<span id="inventory-count-title">Ajuste por contagem física</span>}
        description="Informe a contagem observada. O ajuste é a diferença entre a contagem e o saldo lido; se o saldo mudar após a leitura, o banco recusa a operação para reconferência."
      />
      {feedback ? (
        <div className="space-y-2">
          <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert>
          {feedback.type === "success" && feedback.productId ? <Link to={`/produtos/${feedback.productId}`} className="inline-block text-sm text-signal underline underline-offset-2">Ver produto e histórico</Link> : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardContent className="pt-0">
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="count-product-search">Buscar produto por nome ou SKU</Label>
                <Input id="count-product-search" value={search} onChange={(event) => { setSearch(event.target.value); setProductId(""); resetSelection(); }} placeholder="Digite para localizar" disabled={busy} />
              </div>
              {products.error ? <p className="text-sm text-danger" role="alert">{getErrorMessage(products.error, "Não foi possível buscar produtos.")}</p> : null}
              <div className="space-y-1.5">
                <Label htmlFor="count-product">Produto</Label>
                <Select id="count-product" value={productId} onChange={(event) => { setProductId(event.target.value); resetSelection(); }} disabled={products.isLoading || busy}>
                  <option value="">Selecione...</option>
                  {product.data && !products.data?.items.some((item) => item.id === product.data?.id) ? <option value={product.data.id}>{product.data.sku} — {product.data.name} ({product.data.unit})</option> : null}
                  {(products.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name} ({item.unit})</option>)}
                </Select>
              </div>
              {product.data ? <Alert>Saldo consultado: <strong className="font-mono">{formatQuantity(balance, product.data.unit)}</strong> · versão <strong className="font-mono">{version}</strong></Alert> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="count-quantity">Contagem física</Label>
                  <Input id="count-quantity" inputMode="decimal" value={countedQuantity} onChange={(event) => changeCount(event.target.value)} placeholder="Ex.: 8 ou 2,500" disabled={!product.data?.active || busy} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="count-reason">Motivo da divergência</Label>
                  <Input id="count-reason" maxLength={500} value={reason} onChange={(event) => changeReason(event.target.value)} placeholder="Ex.: inventário mensal" disabled={!product.data?.active || busy} />
                </div>
              </div>
              <Button type="submit" disabled={!product.data?.active || busy}>{busy ? "Registrando ajuste..." : "Revisar e confirmar"}</Button>
            </form>
          </CardContent>
        </Card>
        <aside className="space-y-3 rounded-xl border border-line bg-surface p-5 text-sm">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-signal">Como funciona</p>
          <ol className="list-decimal space-y-2 pl-4 text-muted">
            <li>Selecione o produto: o saldo e sua <strong className="text-ink">versão</strong> são lidos.</li>
            <li>Conte fisicamente e informe a quantidade e o motivo.</li>
            <li>Ao confirmar, o banco compara a versão. Se houve movimento no meio, a contagem é recusada.</li>
          </ol>
          <p className="text-xs text-muted">Exemplo: saldo 10 e contagem 8 geram ajuste de −2 (RF10).</p>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(review && product.data)}
        onOpenChange={(open) => { if (!open && !busy) setReview(null); }}
        title="Confirmar ajuste por contagem"
        description="Se o estoque mudar antes da confirmação, o banco recusará o ajuste para nova contagem."
        confirmLabel="Registrar ajuste"
        pending={busy}
        onConfirm={() => mutation.mutate()}
      >
        {review && product.data ? (
          <div className="rounded-md border border-line bg-bg p-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-muted">Produto</dt><dd className="font-medium">{product.data.sku} — {product.data.name}</dd>
              <dt className="text-muted">Saldo lido</dt><dd className="font-mono">{formatQuantity(balance, product.data.unit)} (versão {version})</dd>
              <dt className="text-muted">Contagem física</dt><dd className="font-mono">{formatQuantity(review.counted, product.data.unit)}</dd>
              <dt className="text-muted">Ajuste</dt><dd className={review.delta < 0 ? "font-mono font-semibold text-warn" : "font-mono font-semibold text-success"}>{review.delta > 0 ? "+" : ""}{formatQuantity(review.delta, product.data.unit)}</dd>
              <dt className="text-muted">Motivo</dt><dd>{reason.trim()}</dd>
            </dl>
          </div>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}
