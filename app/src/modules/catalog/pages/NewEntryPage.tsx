import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/modules/shared/errors";
import { listProducts, registerEntry } from "../services/catalog-api";

const schema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  quantity: z.string().trim().regex(/^\d+(?:[.,]\d{1,3})?$/, "Informe uma quantidade positiva com até três casas decimais."),
  origin: z.string().trim().min(1, "Informe a origem."),
  reason: z.string().trim().min(1, "Informe o motivo."),
  documentRef: z.string().trim().max(240, "Máximo de 240 caracteres."),
});

type Values = z.infer<typeof schema>;

export function NewEntryPage() {
  const queryClient = useQueryClient();
  const operationKey = useRef(crypto.randomUUID());
  const [feedback, setFeedback] = useState<string | null>(null);
  const products = useQuery({ queryKey: ["products", "entry-options"], queryFn: () => listProducts({ situation: "active", pageSize: 100, sort: "name" }) });
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { productId: "", quantity: "", origin: "", reason: "", documentRef: "" } });
  const mutation = useMutation({
    mutationFn: (values: Values) => registerEntry({ ...values, quantity: values.quantity.replace(",", "."), operationKey: operationKey.current }),
    onSuccess: async (result) => {
      setFeedback(`Entrada registrada. Saldo após a operação: ${result.balance}.`);
      operationKey.current = crypto.randomUUID();
      form.reset({ productId: "", quantity: "", origin: "", reason: "", documentRef: "" });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] });
    },
    onError: (error) => setFeedback(getErrorMessage(error, "Não foi possível registrar a entrada.")),
  });

  return (
    <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="new-entry-title">
      <div><Link to="/produtos" className="text-sm underline">← Voltar para produtos</Link><h1 id="new-entry-title" className="mt-2 text-2xl font-semibold">Registrar entrada</h1><p className="text-sm text-gray-600">A operação atualiza o saldo e o histórico atomicamente.</p></div>
      {feedback ? <p className="rounded border bg-white p-3 text-sm" role="status">{feedback}</p> : null}
      {products.error ? <p className="text-red-700" role="alert">{getErrorMessage(products.error, "Não foi possível carregar os produtos.")}</p> : null}
      <form className="space-y-4 rounded-lg border bg-white p-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <div className="space-y-2"><Label htmlFor="entry-product">Produto</Label><select id="entry-product" className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" aria-invalid={Boolean(form.formState.errors.productId)} {...form.register("productId")}><option value="">Selecione...</option>{(products.data?.items ?? []).map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name} ({product.unit})</option>)}</select>{form.formState.errors.productId ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.productId.message}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="entry-quantity">Quantidade</Label><Input id="entry-quantity" inputMode="decimal" placeholder="Ex.: 10 ou 2,500" aria-invalid={Boolean(form.formState.errors.quantity)} {...form.register("quantity")} />{form.formState.errors.quantity ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.quantity.message}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="entry-origin">Origem</Label><Input id="entry-origin" placeholder="Fornecedor, doação ou transferência" aria-invalid={Boolean(form.formState.errors.origin)} {...form.register("origin")} />{form.formState.errors.origin ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.origin.message}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="entry-reason">Motivo</Label><Input id="entry-reason" placeholder="Motivo da entrada" aria-invalid={Boolean(form.formState.errors.reason)} {...form.register("reason")} />{form.formState.errors.reason ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.reason.message}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="entry-document">Documento de referência (opcional)</Label><Input id="entry-document" placeholder="NF, protocolo ou referência interna" aria-invalid={Boolean(form.formState.errors.documentRef)} {...form.register("documentRef")} />{form.formState.errors.documentRef ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.documentRef.message}</p> : null}</div>
        <Button type="submit" disabled={mutation.isPending || products.isLoading}>{mutation.isPending ? "Registrando..." : "Confirmar entrada"}</Button>
      </form>
    </section>
  );
}
