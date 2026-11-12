import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { Link, useSearchParams } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { FeedbackAlert, LoadingSkeleton, ErrorState } from "@/modules/shared/components/States"
import { getErrorMessage } from "@/modules/shared/errors"
import { formatQuantity } from "@/modules/shared/formatters"
import { listProducts, registerEntry } from "../services/catalog-api"

const schema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  quantity: z.string().trim().regex(/^\d+(?:[.,]\d{1,3})?$/, "Informe uma quantidade positiva com até três casas decimais."),
  origin: z.string().trim().min(1, "Informe a origem."),
  reason: z.string().trim().min(1, "Informe o motivo."),
  documentRef: z.string().trim().max(240, "Máximo de 240 caracteres."),
})

type Values = z.infer<typeof schema>

export function NewEntryPage() {
  const queryClient = useQueryClient()
  const operationKey = useRef(crypto.randomUUID())
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string; productId?: string } | null>(null)
  const products = useQuery({ queryKey: ["products", "entry-options"], queryFn: () => listProducts({ situation: "active", pageSize: 100, sort: "name" }) })
  const [searchParams] = useSearchParams()
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { productId: searchParams.get("produto") ?? "", quantity: "", origin: "", reason: "", documentRef: "" } })
  const mutation = useMutation({
    mutationFn: (values: Values) => registerEntry({ ...values, quantity: values.quantity.replace(",", "."), operationKey: operationKey.current }),
    onSuccess: async (result) => {
      setFeedback({ type: "success", text: `Entrada registrada com sucesso. Saldo após a operação: ${formatQuantity(result.balance)}.`, productId: result.product_id })
      operationKey.current = crypto.randomUUID()
      form.reset({ productId: "", quantity: "", origin: "", reason: "", documentRef: "" })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      await queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] })
      await queryClient.invalidateQueries({ queryKey: ["movements"] })
    },
    onError: (error) => setFeedback({ type: "danger", text: getErrorMessage(error, "Não foi possível registrar a entrada.") }),
  })

  return (
    <section className="mx-auto mt-16 max-w-xl space-y-4 sm:mt-32">
      <PageHeader
        title="Registrar entrada"
        description=""
      />
      {feedback ? (
        <div className="space-y-2">
          <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert>
          {feedback.type === "success" && feedback.productId ? <Link to={`/produtos/${feedback.productId}`} className="inline-block text-sm text-signal underline underline-offset-2">Ver produto e histórico</Link> : null}
        </div>
      ) : null}
      {products.isLoading ? <LoadingSkeleton lines={4} /> : null}
      {products.error ? <ErrorState message={getErrorMessage(products.error, "Não foi possível carregar os produtos.")} /> : null}
      {!products.isLoading && !products.error ? (
        <Card>
          <CardContent className="p-4 sm:p-5">
            <form className="space-y-3" onChange={() => { if (feedback?.type === "danger") setFeedback(null) }} onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <div className="space-y-1.5">
                <Label htmlFor="entry-product">Produto</Label>
                <Select id="entry-product" aria-invalid={Boolean(form.formState.errors.productId)} aria-describedby={form.formState.errors.productId ? "product-error" : undefined} disabled={mutation.isPending} {...form.register("productId")}>
                  <option value="">Selecione...</option>
                  {(products.data?.items ?? []).map((product) => <option key={product.id} value={product.id}>{product.sku} — {product.name} ({product.unit})</option>)}
                </Select>
                {form.formState.errors.productId ? <p id="product-error" className="text-sm text-danger" role="alert">{form.formState.errors.productId.message}</p> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="entry-quantity">Quantidade</Label>
                  <Input id="entry-quantity" inputMode="decimal" placeholder="Ex.: 10 ou 2,500" aria-invalid={Boolean(form.formState.errors.quantity)} aria-describedby={form.formState.errors.quantity ? "quantity-error" : undefined} disabled={mutation.isPending} {...form.register("quantity")} />
                  {form.formState.errors.quantity ? <p id="quantity-error" className="text-sm text-danger" role="alert">{form.formState.errors.quantity.message}</p> : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="entry-document">Documento de referência (opcional)</Label>
                  <Input id="entry-document" placeholder="NF, protocolo ou referência interna" aria-invalid={Boolean(form.formState.errors.documentRef)} disabled={mutation.isPending} {...form.register("documentRef")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-origin">Origem</Label>
                <Input id="entry-origin" placeholder="Fornecedor, doação ou transferência" aria-invalid={Boolean(form.formState.errors.origin)} aria-describedby={form.formState.errors.origin ? "origin-error" : undefined} disabled={mutation.isPending} {...form.register("origin")} />
                {form.formState.errors.origin ? <p id="origin-error" className="text-sm text-danger" role="alert">{form.formState.errors.origin.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="entry-reason">Motivo</Label>
                <Input id="entry-reason" placeholder="Motivo da entrada" aria-invalid={Boolean(form.formState.errors.reason)} aria-describedby={form.formState.errors.reason ? "reason-error" : undefined} disabled={mutation.isPending} {...form.register("reason")} />
                {form.formState.errors.reason ? <p id="reason-error" className="text-sm text-danger" role="alert">{form.formState.errors.reason.message}</p> : null}
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 pt-1">
                <Button type="submit" disabled={mutation.isPending || products.isLoading}>{mutation.isPending ? "Registrando..." : "Confirmar entrada"}</Button>
                <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => form.reset({ productId: "", quantity: "", origin: "", reason: "", documentRef: "" })}>Limpar formulário</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
