import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/modules/shared/errors";
import { balanceQuantity, getProduct, listDepartments, listProducts, registerExit } from "../services/catalog-api";

const schema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  quantity: z.string().trim()
    .regex(/^\d+(?:[.,]\d{1,3})?$/, "Informe uma quantidade com até três casas decimais.")
    .refine((value) => Number(value.replace(",", ".")) > 0, "Informe uma quantidade positiva."),
  departmentId: z.string().min(1, "Selecione um setor."),
  recipientRef: z.string().trim().min(1, "Informe o recebedor.").max(240, "Máximo de 240 caracteres."),
  reason: z.string().trim().min(1, "Informe o motivo.").max(500, "Máximo de 500 caracteres."),
});

type Values = z.infer<typeof schema>;

export function NewExitPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const operationKey = useRef(crypto.randomUUID());
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { productId: searchParams.get("produto") ?? "", quantity: "", departmentId: "", recipientRef: "", reason: "" },
  });
  const productId = useWatch({ control: form.control, name: "productId" });
  const departmentId = useWatch({ control: form.control, name: "departmentId" });
  const products = useQuery({
    queryKey: ["products", "exit-options", search],
    queryFn: () => listProducts({ situation: "active", search, pageSize: 20, sort: "name" }),
  });
  const product = useQuery({
    queryKey: ["products", "exit-selected", productId],
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
  });
  const departments = useQuery({ queryKey: ["departments", "exit-options"], queryFn: listDepartments });
  const activeDepartments = (departments.data ?? []).filter((department) => department.active);
  const selectedDepartment = activeDepartments.find((department) => department.id === departmentId);
  const mutation = useMutation({
    mutationFn: (values: Values) => registerExit({
      productId: values.productId,
      quantity: values.quantity.replace(",", "."),
      departmentId: values.departmentId,
      recipientRef: values.recipientRef.trim(),
      reason: values.reason.trim(),
      operationKey: operationKey.current,
    }),
    onSuccess: async (result) => {
      setFeedback(`Saída registrada: ${result.movement_id}. Saldo após a operação: ${result.balance}.`);
      operationKey.current = crypto.randomUUID();
      form.reset({ productId: "", quantity: "", departmentId: "", recipientRef: "", reason: "" });
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] });
    },
    onError: async (error) => {
      setFeedback(getErrorMessage(error, "Não foi possível registrar a saída."));
      await queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  function submit(values: Values) {
    if (mutation.isPending || !product.data || !product.data.active || !selectedDepartment) return;
    const normalized = values.quantity.replace(",", ".");
    if ((product.data.unit === "UN" || product.data.unit === "CX") && !/^\d+$/.test(normalized)) {
      form.setError("quantity", { message: `A unidade ${product.data.unit} exige uma quantidade inteira.` });
      return;
    }
    const summary = [
      `Produto: ${product.data.sku} — ${product.data.name}`,
      `Quantidade: ${values.quantity} ${product.data.unit}`,
      `Saldo consultado: ${balanceQuantity(product.data)} ${product.data.unit}`,
      `Setor: ${selectedDepartment.name}`,
      `Recebedor: ${values.recipientRef.trim()}`,
      `Motivo: ${values.reason.trim()}`,
      "O saldo será conferido novamente no banco. Confirmar saída?",
    ].join("\n");
    if (window.confirm(summary)) mutation.mutate(values);
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="new-exit-title">
      <div><Link to="/produtos" className="text-sm underline">← Voltar para produtos</Link><h1 id="new-exit-title" className="mt-2 text-2xl font-semibold">Registrar saída</h1><p className="text-sm text-gray-600">O saldo é confirmado pelo banco antes de registrar a saída.</p></div>
      {feedback ? <p className="rounded border bg-white p-3 text-sm" role="status">{feedback}</p> : null}
      <form className="space-y-4 rounded-lg border bg-white p-5" onChange={() => { operationKey.current = crypto.randomUUID(); setFeedback(null); }} onSubmit={form.handleSubmit(submit)}>
        <div className="space-y-2">
          <Label htmlFor="exit-search">Buscar produto por nome ou SKU</Label>
          <Input id="exit-search" value={search} onChange={(event) => { setSearch(event.target.value); form.setValue("productId", ""); }} placeholder="Digite para localizar o produto" disabled={mutation.isPending} />
          {products.isLoading ? <p className="text-sm text-gray-600">Buscando produtos...</p> : null}
          {products.error ? <p role="alert" className="text-sm text-red-700">{getErrorMessage(products.error, "Não foi possível buscar os produtos.")}</p> : null}
          {!products.isLoading && !products.error && products.data?.total === 0 ? <p className="text-sm text-gray-600">Nenhum produto ativo encontrado.</p> : null}
          {products.data && products.data.total > 20 ? <p className="text-sm text-gray-600">Mostrando 20 de {products.data.total}. Refine a busca para encontrar outro produto.</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="exit-product">Produto</Label>
          <select id="exit-product" className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" aria-invalid={Boolean(form.formState.errors.productId)} aria-describedby={form.formState.errors.productId ? "exit-product-error" : undefined} disabled={mutation.isPending || products.isLoading} {...form.register("productId")}>
            <option value="">Selecione...</option>
            {product.data && !products.data?.items.some((item) => item.id === product.data?.id) ? <option value={product.data.id}>{product.data.sku} — {product.data.name} ({product.data.unit})</option> : null}
            {(products.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name} ({item.unit})</option>)}
          </select>
          {form.formState.errors.productId ? <p id="exit-product-error" className="text-sm text-red-700" role="alert">{form.formState.errors.productId.message}</p> : null}
          {product.isLoading ? <p className="text-sm text-gray-600">Consultando saldo...</p> : null}
          {product.error ? <p className="text-sm text-red-700" role="alert">{getErrorMessage(product.error, "Não foi possível consultar o saldo.")}</p> : null}
          {product.data ? <p className="text-sm text-gray-700">Saldo consultado: <strong>{balanceQuantity(product.data)} {product.data.unit}</strong>. O banco verificará o saldo novamente ao confirmar.</p> : null}
          {product.data && !product.data.active ? <p className="text-sm text-red-700" role="alert">Produto inativo não aceita saídas.</p> : null}
        </div>
        <div className="space-y-2"><Label htmlFor="exit-quantity">Quantidade</Label><Input id="exit-quantity" inputMode="decimal" placeholder="Ex.: 4 ou 2,500" aria-invalid={Boolean(form.formState.errors.quantity)} aria-describedby={form.formState.errors.quantity ? "exit-quantity-error" : undefined} disabled={mutation.isPending} {...form.register("quantity")} />{form.formState.errors.quantity ? <p id="exit-quantity-error" className="text-sm text-red-700" role="alert">{form.formState.errors.quantity.message}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="exit-department">Setor destinatário</Label><select id="exit-department" className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm" aria-invalid={Boolean(form.formState.errors.departmentId)} aria-describedby={form.formState.errors.departmentId ? "exit-department-error" : undefined} disabled={mutation.isPending || departments.isLoading} {...form.register("departmentId")}><option value="">Selecione...</option>{activeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>{form.formState.errors.departmentId ? <p id="exit-department-error" className="text-sm text-red-700" role="alert">{form.formState.errors.departmentId.message}</p> : null}{departments.error ? <p className="text-sm text-red-700" role="alert">{getErrorMessage(departments.error, "Não foi possível carregar os setores.")}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="exit-recipient">Identificação do recebedor</Label><Input id="exit-recipient" maxLength={240} aria-invalid={Boolean(form.formState.errors.recipientRef)} aria-describedby={form.formState.errors.recipientRef ? "exit-recipient-error" : undefined} disabled={mutation.isPending} {...form.register("recipientRef")} />{form.formState.errors.recipientRef ? <p id="exit-recipient-error" className="text-sm text-red-700" role="alert">{form.formState.errors.recipientRef.message}</p> : null}</div>
        <div className="space-y-2"><Label htmlFor="exit-reason">Motivo</Label><Input id="exit-reason" maxLength={500} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? "exit-reason-error" : undefined} disabled={mutation.isPending} {...form.register("reason")} />{form.formState.errors.reason ? <p id="exit-reason-error" className="text-sm text-red-700" role="alert">{form.formState.errors.reason.message}</p> : null}</div>
        <Button type="submit" disabled={mutation.isPending || product.isLoading || !product.data || departments.isLoading}>{mutation.isPending ? "Registrando..." : "Revisar e confirmar saída"}</Button>
      </form>
    </section>
  );
}
