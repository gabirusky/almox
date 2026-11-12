import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/modules/access/use-auth"
import { ConfirmAction } from "@/modules/shared/components/ConfirmAction"
import { getErrorMessage } from "@/modules/shared/errors"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { PaginationBar } from "@/modules/shared/components/PaginationBar"
import { FeedbackAlert, LoadingSkeleton, ErrorState, EmptyState } from "@/modules/shared/components/States"
import { ProductStatusBadge } from "@/modules/shared/components/StatusBadge"
import { formatQuantity } from "@/modules/shared/formatters"
import { balanceQuantity, createProduct, listCategories, listProducts, setProductActive, updateProduct } from "../services/catalog-api"
import type { Product, ProductFormValues, ProductSituation, ProductSort } from "../types"

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
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["minimum_stock"], message: "UN/CX exigem valor inteiro." })
  }
})

type Values = z.input<typeof schema>

function toFormValues(product?: Product | null): Values {
  return {
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id ?? "",
    unit: (product?.unit as Values["unit"]) ?? "UN",
    minimum_stock: Number(product?.minimum_stock ?? 0),
    location: product?.location ?? "",
  }
}

export function ProductsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === "admin"
  const qc = useQueryClient()
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [searchParams] = useSearchParams()
  const [situation, setSituation] = useState<ProductSituation>(() => {
    const value = searchParams.get("situacao")
    return value === "active" || value === "inactive" || value === "zero_balance" ? value : "all"
  })
  const [sort, setSort] = useState<ProductSort>("name")
  const [direction, setDirection] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [editing, setEditing] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null)

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories })
  const activeCategories = useMemo(() => (categories.data ?? []).filter((c) => c.active), [categories.data])
  const products = useQuery({
    queryKey: ["products", { search, categoryId, situation, sort, direction, page, pageSize }],
    queryFn: () => listProducts({ search, categoryId, situation, sort, direction, page, pageSize }),
  })

  const form = useForm<Values>({ resolver: zodResolver(schema), values: toFormValues(editing) })

  const save = useMutation({
    mutationFn: async (values: Values) => {
      const parsed = schema.parse(values) as ProductFormValues
      if (editing) await updateProduct(editing.id, parsed)
      else await createProduct(parsed)
    },
    onSuccess: async () => {
      setFeedback({ type: "success", text: editing ? "Produto atualizado." : "Produto criado com saldo inicial zero." })
      setEditing(null); setShowForm(false); form.reset(toFormValues(null))
      await qc.invalidateQueries({ queryKey: ["products"] })
    },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível salvar o produto.") }),
  })

  const inactivate = useMutation({
    mutationFn: (id: string) => setProductActive(id, false),
    onSuccess: async () => { setFeedback({ type: "success", text: "Produto inativado." }); await qc.invalidateQueries({ queryKey: ["products"] }) },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível inativar o produto.") }),
  })
  const reactivate = useMutation({
    mutationFn: (id: string) => setProductActive(id, true),
    onSuccess: async () => { setFeedback({ type: "success", text: "Produto reativado." }); await qc.invalidateQueries({ queryKey: ["products"] }) },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível reativar o produto.") }),
  })

  const unitLocked = Boolean(editing?.first_movement_at)
  const items = products.data?.items ?? []
  const hasFilters = Boolean(search || categoryId || situation !== "all")

  function openCreate() { setEditing(null); form.reset(toFormValues(null)); setShowForm(true); setFeedback(null) }
  function openEdit(item: Product) { setEditing(item); form.reset(toFormValues(item)); setShowForm(true); setFeedback(null) }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Consulte o catálogo, saldo e situação dos itens. Novos produtos iniciam com saldo zero; inativação exige saldo zero."
        actions={isAdmin ? <Button type="button" onClick={openCreate}>Novo produto</Button> : undefined}
      />

      {feedback ? <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert> : null}

      <Dialog open={isAdmin && showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null) } }}>
        <DialogContent className="max-w-2xl" labelledBy="product-form-title">
          <DialogHeader>
            <DialogTitle id="product-form-title">{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>{editing ? "Atualize os dados do produto. Campos sujeitos a regras do banco serão validados no salvamento." : "Ao criar, o produto recebe saldo inicial zero automaticamente."}</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" aria-invalid={Boolean(form.formState.errors.sku)} aria-describedby={form.formState.errors.sku ? "sku-error" : undefined} {...form.register("sku")} />
              {form.formState.errors.sku ? <p id="sku-error" className="text-sm text-danger" role="alert">{form.formState.errors.sku.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? "name-error" : undefined} {...form.register("name")} />
              {form.formState.errors.name ? <p id="name-error" className="text-sm text-danger" role="alert">{form.formState.errors.name.message}</p> : null}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Input id="description" {...form.register("description")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category_id">Categoria ativa</Label>
              <Select id="category_id" aria-invalid={Boolean(form.formState.errors.category_id)} aria-describedby={form.formState.errors.category_id ? "category-error" : undefined} {...form.register("category_id")}>
                <option value="">Selecione...</option>
                {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {editing?.category_id && !activeCategories.some((c) => c.id === editing.category_id) ? <option value={editing.category_id}>{editing.categories?.name ?? "Categoria atual"} (atual)</option> : null}
              </Select>
              {form.formState.errors.category_id ? <p id="category-error" className="text-sm text-danger" role="alert">{form.formState.errors.category_id.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unidade</Label>
              <Select id="unit" disabled={unitLocked} {...form.register("unit")}>
                {(["UN", "CX", "KG", "L", "M"] as const).map((u) => <option key={u} value={u}>{u}</option>)}
              </Select>
              {unitLocked ? <p className="text-xs text-warn">Unidade bloqueada após a primeira movimentação.</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minimum_stock">Estoque mínimo</Label>
              <Input id="minimum_stock" type="number" step="0.001" min="0" aria-invalid={Boolean(form.formState.errors.minimum_stock)} aria-describedby={form.formState.errors.minimum_stock ? "min-error" : undefined} {...form.register("minimum_stock")} />
              {form.formState.errors.minimum_stock ? <p id="min-error" className="text-sm text-danger" role="alert">{form.formState.errors.minimum_stock.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Localização (opcional)</Label>
              <Input id="location" {...form.register("location")} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null) }}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 lg:flex-row lg:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="search">Buscar</Label>
          <Input id="search" placeholder="Nome ou SKU" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="w-full space-y-1.5 lg:w-48">
          <Label htmlFor="category-filter">Categoria</Label>
          <Select id="category-filter" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1) }}>
            <option value="">Todas</option>
            {activeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
        </div>
        <div className="w-full space-y-1.5 lg:w-44">
          <Label htmlFor="situation-filter">Situação</Label>
          <Select id="situation-filter" value={situation} onChange={(e) => { setSituation(e.target.value as ProductSituation); setPage(1) }}>
            <option value="all">Todas</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="zero_balance">Sem saldo</option>
          </Select>
        </div>
        <div className="w-full space-y-1.5 lg:w-52">
          <Label htmlFor="sort-filter">Ordenação</Label>
          <Select id="sort-filter" value={`${sort}:${direction}`} onChange={(e) => { const [nextSort, nextDirection] = e.target.value.split(":") as [ProductSort, "asc" | "desc"]; setSort(nextSort); setDirection(nextDirection); setPage(1) }}>
            <option value="name:asc">Nome (A–Z)</option>
            <option value="name:desc">Nome (Z–A)</option>
            <option value="sku:asc">SKU (crescente)</option>
            <option value="updated_at:desc">Atualizados recentemente</option>
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={() => { setSearch(""); setCategoryId(""); setSituation("all"); setSort("name"); setDirection("asc"); setPage(1) }}>Limpar</Button>
      </div>

      <div className="rounded-lg border border-line bg-surface">
        {products.isLoading ? <LoadingSkeleton className="border-0" lines={6} /> : null}
        {products.error ? <div className="p-4"><ErrorState message={getErrorMessage(products.error, "Falha ao carregar produtos.")} /></div> : null}
        {!products.isLoading && !products.error ? (
          items.length === 0 ? <div className="p-4"><EmptyState title={hasFilters ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"} description={hasFilters ? "Ajuste ou limpe os filtros para ver outros resultados." : (isAdmin ? "Cadastre o primeiro produto para iniciar o controle." : "Ainda não há produtos disponíveis.")} action={hasFilters ? <Button variant="outline" onClick={() => { setSearch(""); setCategoryId(""); setSituation("all"); setPage(1) }}>Limpar filtros</Button> : undefined} /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Saldo</TableHead><TableHead>Situação</TableHead>{isAdmin ? <TableHead className="w-[220px]">Ações</TableHead> : null}</TableRow></TableHeader>
              <TableBody>
                {items.map((item) => {
                  const qty = balanceQuantity(item)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-ink">{item.sku}</TableCell>
                      <TableCell><Link to={`/produtos/${item.id}`} className="font-medium text-signal underline decoration-signal/30 underline-offset-2 hover:decoration-signal">{item.name}</Link></TableCell>
                      <TableCell className="text-muted">{item.categories?.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{formatQuantity(qty, item.unit)}</TableCell>
                      <TableCell><ProductStatusBadge active={item.active} balance={qty} /></TableCell>
                      {isAdmin ? (
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => openEdit(item)}>Editar</Button>
                            {item.active ? (
                              <ConfirmAction title="Inativar produto" description={qty === 0 ? "O produto será inativado e não aceitará novas operações." : `Saldo atual: ${formatQuantity(qty, item.unit)}. A inativação será recusada até o saldo ser zero.`} confirmLabel="Inativar" triggerLabel="Inativar" variant="outline" onConfirm={() => inactivate.mutateAsync(item.id)} />
                            ) : (
                              <Button type="button" size="sm" variant="secondary" onClick={() => reactivate.mutate(item.id)} disabled={reactivate.isPending}>Reativar</Button>
                            )}
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )
        ) : null}
      </div>
      {!products.isLoading && !products.error && products.data ? (
        <PaginationBar page={page} pageSize={pageSize} total={products.data.total} onPageChange={setPage} loading={products.isFetching} label="Paginação de produtos" />
      ) : null}
    </section>
  )
}
