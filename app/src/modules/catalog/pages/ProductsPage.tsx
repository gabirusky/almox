import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/modules/access/use-auth";
import { ConfirmAction } from "@/modules/shared/components/ConfirmAction";
import { getErrorMessage } from "@/modules/shared/errors";
import { balanceQuantity, createProduct, listCategories, listProducts, setProductActive, updateProduct } from "../services/catalog-api";
import type { Product, ProductFormValues } from "../types";

const schema = z.object({
  sku: z.string().trim().min(1, "Informe o SKU.").max(64),
  name: z.string().trim().min(1, "Informe o nome.").max(160),
  description: z.string().max(2000).default(""),
  category_id: z.string().min(1, "Selecione uma categoria ativa."),
  unit: z.enum(["UN", "CX", "KG", "L", "M"]),
  minimum_stock: z.coerce.number().min(0, "Estoque mínimo não pode ser negativo."),
  location: z.string().max(120).default(""),
}).superRefine((v, ctx) => {
  if ((v.unit === "UN" || v.unit === "CX") && !Number.isInteger(v.minimum_stock)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["minimum_stock"], message: "UN/CX exigem valor inteiro." });
  }
});

type Values = z.input<typeof schema>;

function toFormValues(product?: Product | null): Values {
  return {
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id ?? "",
    unit: (product?.unit as Values["unit"]) ?? "UN",
    minimum_stock: Number(product?.minimum_stock ?? 0),
    location: product?.location ?? "",
  };
}

export function ProductsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const activeCategories = useMemo(() => (categories.data ?? []).filter((c) => c.active), [categories.data]);
  const products = useQuery({ queryKey: ["products", search], queryFn: () => listProducts(search) });

  const form = useForm<Values>({ resolver: zodResolver(schema), values: toFormValues(editing) });

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const parsed = schema.parse(values) as ProductFormValues;
      if (editing) await updateProduct(editing.id, parsed);
      else await createProduct(parsed);
    },
    onSuccess: async () => {
      setFeedback(editing ? "Produto atualizado." : "Produto criado com saldo inicial zero (aguardando movimentações).");
      setEditing(null); setShowForm(false); form.reset(toFormValues(null));
      await Promise.all([qc.invalidateQueries({ queryKey: ["products"] })]);
    },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível salvar o produto.")),
  });

  const inactivate = useMutation({
    mutationFn: (id: string) => setProductActive(id, false),
    onSuccess: async () => { setFeedback("Produto inativado."); await qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível inativar o produto.")),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => setProductActive(id, true),
    onSuccess: async () => { setFeedback("Produto reativado."); await qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível reativar o produto.")),
  });

  const unitLocked = Boolean(editing?.first_movement_at);

  return (
    <section className="space-y-6" aria-labelledby="products-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="products-title" className="text-2xl font-semibold">Produtos</h1>
          <p className="text-sm text-gray-700">Catálogo (RF03). Novos produtos iniciam com saldo zero; inativação exige saldo zero.</p>
        </div>
        {isAdmin ? <Button type="button" onClick={() => { setEditing(null); form.reset(toFormValues(null)); setShowForm(true); }}>Novo produto</Button> : null}
      </div>

      {feedback ? <p className="rounded border bg-white p-3 text-sm" role="status">{feedback}</p> : null}

      {isAdmin && showForm ? (
        <Card>
          <CardHeader><CardTitle>{editing ? "Editar produto" : "Novo produto"}</CardTitle></CardHeader>
          <CardContent>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input id="sku" aria-invalid={Boolean(form.formState.errors.sku)} {...form.register("sku")} />
                {form.formState.errors.sku ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.sku.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register("name")} />
                {form.formState.errors.name ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.name.message}</p> : null}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input id="description" {...form.register("description")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category_id">Categoria ativa</Label>
                <select id="category_id" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" aria-invalid={Boolean(form.formState.errors.category_id)} {...form.register("category_id")}>
                  <option value="">Selecione...</option>
                  {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  {editing?.category_id && !activeCategories.some((c) => c.id === editing.category_id) ? <option value={editing.category_id}>{editing.categories?.name ?? "Categoria atual (inativa)"} (atual)</option> : null}
                </select>
                {form.formState.errors.category_id ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.category_id.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidade</Label>
                <select id="unit" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" disabled={unitLocked} {...form.register("unit")}>
                  {(["UN", "CX", "KG", "L", "M"] as const).map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                {unitLocked ? <p className="text-xs text-amber-800">Unidade bloqueada após primeira movimentação (RN14).</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimum_stock">Estoque mínimo</Label>
                <Input id="minimum_stock" type="number" step="0.001" min="0" aria-invalid={Boolean(form.formState.errors.minimum_stock)} {...form.register("minimum_stock")} />
                {form.formState.errors.minimum_stock ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.minimum_stock.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localização (opcional)</Label>
                <Input id="location" {...form.register("location")} />
              </div>
              {!editing ? <p className="text-sm text-gray-600 sm:col-span-2">Ao criar, o produto recebe saldo inicial <strong>0</strong> automaticamente (RN05/RNF02).</p> : null}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Label htmlFor="search" className="sr-only">Buscar por nome ou SKU</Label>
        <Input id="search" placeholder="Buscar por nome ou SKU" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        {products.isLoading ? <p className="p-4 text-sm">Carregando...</p> : null}
        {products.error ? <p className="p-4 text-sm text-red-600" role="alert">{getErrorMessage(products.error, "Falha ao carregar produtos.")}</p> : null}
        {!products.isLoading && !products.error ? (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50"><tr><th className="px-4 py-2 font-medium">SKU</th><th className="px-4 py-2 font-medium">Nome</th><th className="px-4 py-2 font-medium">Categoria</th><th className="px-4 py-2 font-medium">Saldo</th><th className="px-4 py-2 font-medium">Situação</th>{isAdmin ? <th className="px-4 py-2 font-medium">Ações</th> : null}</tr></thead>
            <tbody>
              {(products.data ?? []).map((item) => {
                const qty = balanceQuantity(item);
                return (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.categories?.name ?? "—"}</td>
                    <td className="px-4 py-2">{qty} {item.unit}</td>
                    <td className="px-4 py-2">
                      {!item.active ? <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">Inativo</span> : qty <= 0 ? <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-900">Sem saldo</span> : <span className="rounded bg-green-50 px-2 py-0.5 text-green-800">Ativo</span>}
                    </td>
                    {isAdmin ? (
                      <td className="flex flex-wrap gap-2 px-4 py-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(item); setShowForm(true); }}>Editar</Button>
                        {item.active ? <ConfirmAction title="Inativar produto" description={qty === 0 ? "O produto será inativado e não aceitará novas operações." : `Saldo atual: ${qty} ${item.unit}. A inativação será recusada até o saldo ser zero.`} confirmLabel="Inativar" triggerLabel="Inativar" onConfirm={() => inactivate.mutateAsync(item.id)} /> : <Button type="button" size="sm" variant="secondary" onClick={() => reactivate.mutate(item.id)} disabled={reactivate.isPending}>Reativar</Button>}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {(products.data ?? []).length === 0 ? <tr><td className="px-4 py-4 text-gray-600" colSpan={isAdmin ? 6 : 5}>Nenhum produto encontrado.</td></tr> : null}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
