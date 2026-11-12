import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { Link, useSearchParams } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { ConfirmDialog } from "@/modules/shared/components/ConfirmDialog"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { FeedbackAlert, ErrorState } from "@/modules/shared/components/States"
import { getErrorMessage } from "@/modules/shared/errors"
import { formatQuantity } from "@/modules/shared/formatters"
import { balanceQuantity, getProduct, listDepartments, listProducts, registerExit } from "../services/catalog-api"

const schema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  quantity: z.string().trim()
    .regex(/^\d+(?:[.,]\d{1,3})?$/, "Informe uma quantidade com até três casas decimais.")
    .refine((value) => Number(value.replace(",", ".")) > 0, "Informe uma quantidade positiva."),
  departmentId: z.string().min(1, "Selecione um setor."),
  recipientRef: z.string().trim().min(1, "Informe o recebedor.").max(240, "Máximo de 240 caracteres."),
  reason: z.string().trim().min(1, "Informe o motivo.").max(500, "Máximo de 500 caracteres."),
})

type Values = z.infer<typeof schema>

export function NewExitPage() {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const operationKey = useRef(crypto.randomUUID())
  const [search, setSearch] = useState("")
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string; productId?: string } | null>(null)
  const [review, setReview] = useState<Values | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { productId: searchParams.get("produto") ?? "", quantity: "", departmentId: "", recipientRef: "", reason: "" },
  })
  const productId = useWatch({ control: form.control, name: "productId" })
  const departmentId = useWatch({ control: form.control, name: "departmentId" })
  const products = useQuery({
    queryKey: ["products", "exit-options", search],
    queryFn: () => listProducts({ situation: "active", search, pageSize: 20, sort: "name" }),
  })
  const product = useQuery({
    queryKey: ["products", "exit-selected", productId],
    queryFn: () => getProduct(productId),
    enabled: Boolean(productId),
  })
  const departments = useQuery({ queryKey: ["departments", "exit-options"], queryFn: listDepartments })
  const activeDepartments = (departments.data ?? []).filter((department) => department.active)
  const selectedDepartment = activeDepartments.find((department) => department.id === departmentId)

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
      setFeedback({ type: "success", text: `Saída registrada (${result.movement_id}). Saldo após a operação: ${formatQuantity(result.balance)}.`, productId: result.product_id })
      setReview(null)
      operationKey.current = crypto.randomUUID()
      form.reset({ productId: "", quantity: "", departmentId: "", recipientRef: "", reason: "" })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] })
      await queryClient.invalidateQueries({ queryKey: ["movements"] })
    },
    onError: async (error) => {
      setFeedback({ type: "danger", text: getErrorMessage(error, "Não foi possível registrar a saída.") })
      setReview(null)
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      if (productId) await queryClient.invalidateQueries({ queryKey: ["products", "exit-selected", productId] })
    },
  })

  function requestReview(values: Values) {
    if (mutation.isPending || !product.data || !product.data.active || !selectedDepartment) return
    const normalized = values.quantity.replace(",", ".")
    if ((product.data.unit === "UN" || product.data.unit === "CX") && !/^\d+$/.test(normalized)) {
      form.setError("quantity", { message: `A unidade ${product.data.unit} exige uma quantidade inteira.` })
      return
    }
    setFeedback(null)
    setReview(values)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        back={<Link to="/produtos" className="text-sm text-signal underline underline-offset-2">← Voltar para produtos</Link>}
        title="Registrar saída"
        description="Selecione produto e setor ativo, informe recebedor e motivo. O saldo consultado é informativo; o banco confirma novamente ao registrar."
      />
      {feedback ? (
        <div className="space-y-2">
          <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert>
          {feedback.type === "success" && feedback.productId ? <Link to={`/produtos/${feedback.productId}`} className="inline-block text-sm text-signal underline underline-offset-2">Ver produto e histórico</Link> : null}
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <form className="space-y-4" onChange={() => { operationKey.current = crypto.randomUUID(); if (feedback?.type === "danger") setFeedback(null) }} onSubmit={form.handleSubmit(requestReview)}>
            <div className="space-y-1.5">
              <Label htmlFor="exit-search">Buscar produto por nome ou SKU</Label>
              <Input id="exit-search" value={search} onChange={(event) => { setSearch(event.target.value); form.setValue("productId", "") }} placeholder="Digite para localizar o produto" disabled={mutation.isPending} />
              {products.isLoading ? <p className="text-sm text-muted">Buscando produtos...</p> : null}
              {products.error ? <p role="alert" className="text-sm text-danger">{getErrorMessage(products.error, "Não foi possível buscar os produtos.")}</p> : null}
              {!products.isLoading && !products.error && products.data?.total === 0 ? <p className="text-sm text-muted">Nenhum produto ativo encontrado.</p> : null}
              {products.data && products.data.total > 20 ? <p className="text-sm text-muted">Mostrando 20 de {products.data.total}. Refine a busca para encontrar outro produto.</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-product">Produto</Label>
              <Select id="exit-product" aria-invalid={Boolean(form.formState.errors.productId)} aria-describedby={form.formState.errors.productId ? "exit-product-error" : undefined} disabled={mutation.isPending || products.isLoading} {...form.register("productId")}>
                <option value="">Selecione...</option>
                {product.data && !products.data?.items.some((item) => item.id === product.data?.id) ? <option value={product.data.id}>{product.data.sku} — {product.data.name} ({product.data.unit})</option> : null}
                {(products.data?.items ?? []).map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name} ({item.unit})</option>)}
              </Select>
              {form.formState.errors.productId ? <p id="exit-product-error" className="text-sm text-danger" role="alert">{form.formState.errors.productId.message}</p> : null}
              {product.isLoading ? <p className="text-sm text-muted">Consultando saldo...</p> : null}
              {product.error ? <ErrorState message={getErrorMessage(product.error, "Não foi possível consultar o saldo.")} /> : null}
              {product.data ? <Alert>Saldo consultado: <strong className="font-mono">{formatQuantity(balanceQuantity(product.data), product.data.unit)}</strong>. O banco verificará o saldo novamente ao confirmar.</Alert> : null}
              {product.data && !product.data.active ? <Alert variant="danger">Produto inativo não aceita saídas.</Alert> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="exit-quantity">Quantidade</Label>
                <Input id="exit-quantity" inputMode="decimal" placeholder="Ex.: 4 ou 2,500" aria-invalid={Boolean(form.formState.errors.quantity)} aria-describedby={form.formState.errors.quantity ? "exit-quantity-error" : undefined} disabled={mutation.isPending} {...form.register("quantity")} />
                {form.formState.errors.quantity ? <p id="exit-quantity-error" className="text-sm text-danger" role="alert">{form.formState.errors.quantity.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exit-department">Setor destinatário</Label>
                <Select id="exit-department" aria-invalid={Boolean(form.formState.errors.departmentId)} aria-describedby={form.formState.errors.departmentId ? "exit-department-error" : undefined} disabled={mutation.isPending || departments.isLoading} {...form.register("departmentId")}>
                  <option value="">Selecione...</option>
                  {activeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </Select>
                {form.formState.errors.departmentId ? <p id="exit-department-error" className="text-sm text-danger" role="alert">{form.formState.errors.departmentId.message}</p> : null}
                {departments.error ? <p className="text-sm text-danger" role="alert">{getErrorMessage(departments.error, "Não foi possível carregar os setores.")}</p> : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-recipient">Identificação do recebedor</Label>
              <Input id="exit-recipient" maxLength={240} aria-invalid={Boolean(form.formState.errors.recipientRef)} aria-describedby={form.formState.errors.recipientRef ? "exit-recipient-error" : undefined} disabled={mutation.isPending} {...form.register("recipientRef")} />
              {form.formState.errors.recipientRef ? <p id="exit-recipient-error" className="text-sm text-danger" role="alert">{form.formState.errors.recipientRef.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exit-reason">Motivo</Label>
              <Input id="exit-reason" maxLength={500} aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? "exit-reason-error" : undefined} disabled={mutation.isPending} {...form.register("reason")} />
              {form.formState.errors.reason ? <p id="exit-reason-error" className="text-sm text-danger" role="alert">{form.formState.errors.reason.message}</p> : null}
            </div>
            <Button type="submit" disabled={mutation.isPending || product.isLoading || !product.data || departments.isLoading}>{mutation.isPending ? "Registrando..." : "Revisar e confirmar saída"}</Button>
          </form>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(review && product.data && selectedDepartment)}
        onOpenChange={(open) => { if (!open && !mutation.isPending) setReview(null) }}
        title="Confirmar saída de estoque"
        description="Revise os dados antes de registrar. O saldo será conferido novamente no banco."
        confirmLabel="Registrar saída"
        pending={mutation.isPending}
        onConfirm={() => { if (review) mutation.mutate(review) }}
      >
        {review && product.data && selectedDepartment ? (
          <div className="rounded-md border border-line bg-bg p-3 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-muted">Produto</dt><dd className="font-medium">{product.data.sku} — {product.data.name}</dd>
              <dt className="text-muted">Quantidade</dt><dd className="font-mono">{review.quantity} {product.data.unit}</dd>
              <dt className="text-muted">Saldo consultado</dt><dd className="font-mono">{formatQuantity(balanceQuantity(product.data), product.data.unit)}</dd>
              <dt className="text-muted">Setor</dt><dd>{selectedDepartment.name}</dd>
              <dt className="text-muted">Recebedor</dt><dd>{review.recipientRef.trim()}</dd>
              <dt className="text-muted">Motivo</dt><dd>{review.reason.trim()}</dd>
            </dl>
          </div>
        ) : null}
      </ConfirmDialog>
    </section>
  )
}
