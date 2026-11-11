import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/modules/access/use-auth"
import { ConfirmAction } from "@/modules/shared/components/ConfirmAction"
import { FeedbackAlert, LoadingSkeleton, ErrorState, EmptyState } from "@/modules/shared/components/States"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { ActiveBadge } from "@/modules/shared/components/StatusBadge"
import { getErrorMessage } from "@/modules/shared/errors"
import { listCategories, saveCategory, setCategoryActive } from "../services/catalog-api"
import type { Category } from "../types"

const schema = z.object({ name: z.string().trim().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres.") })
type Values = z.infer<typeof schema>

export function CategoriesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === "admin"
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Category | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null)
  const { data = [], isLoading, error } = useQuery({ queryKey: ["categories"], queryFn: listCategories })
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { name: editing?.name ?? "" } })

  const save = useMutation({
    mutationFn: async (values: Values) => saveCategory(editing?.id ? { id: editing.id, name: values.name } : { name: values.name }),
    onSuccess: async () => {
      setFeedback({ type: "success", text: editing ? "Categoria atualizada." : "Categoria criada." })
      setEditing(null)
      form.reset({ name: "" })
      await qc.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível salvar a categoria.") }),
  })

  const inactivate = useMutation({
    mutationFn: (id: string) => setCategoryActive(id, false),
    onSuccess: async () => { setFeedback({ type: "success", text: "Categoria inativada." }); await qc.invalidateQueries({ queryKey: ["categories"] }) },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível inativar a categoria.") }),
  })

  const reactivate = useMutation({
    mutationFn: (id: string) => setCategoryActive(id, true),
    onSuccess: async () => { setFeedback({ type: "success", text: "Categoria reativada." }); await qc.invalidateQueries({ queryKey: ["categories"] }) },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível reativar a categoria.") }),
  })

  return (
    <section className="space-y-6">
      <PageHeader title="Categorias" description="Cadastro administrativo de categorias. Categorias inativas não podem ser usadas em novas operações." />
      {feedback ? <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert> : null}
      {isAdmin ? (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{editing ? "Editar categoria" : "Nova categoria"}</CardTitle></CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? "name-error" : undefined} {...form.register("name")} />
                {form.formState.errors.name ? <p id="name-error" className="text-sm text-danger" role="alert">{form.formState.errors.name.message}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
                {editing ? <Button type="button" variant="outline" onClick={() => { setEditing(null); form.reset({ name: "" }) }}>Cancelar</Button> : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
      <div className="rounded-lg border border-line bg-surface">
        {isLoading ? <LoadingSkeleton className="border-0" /> : null}
        {error ? <div className="p-4"><ErrorState message={getErrorMessage(error, "Falha ao carregar categorias.")} /></div> : null}
        {!isLoading && !error ? (
          data.length === 0 ? <div className="p-4"><EmptyState title="Nenhuma categoria cadastrada" description={isAdmin ? "Crie a primeira categoria para organizar os produtos." : "Ainda não há categorias disponíveis."} /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Situação</TableHead>{isAdmin ? <TableHead className="w-[260px]">Ações</TableHead> : null}</TableRow></TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><ActiveBadge active={item.active} activeLabel="Ativa" inactiveLabel="Inativa" /></TableCell>
                    {isAdmin ? (
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(item); setFeedback(null) }}>Editar</Button>
                          {item.active ? (
                            <ConfirmAction title="Inativar categoria" description="A categoria não poderá ser selecionada em novas operações. Se houver produtos ativos vinculados, a inativação será recusada pelo banco." confirmLabel="Inativar" triggerLabel="Inativar" variant="outline" onConfirm={() => inactivate.mutateAsync(item.id)} />
                          ) : (
                            <Button type="button" size="sm" variant="secondary" onClick={() => reactivate.mutate(item.id)} disabled={reactivate.isPending}>Reativar</Button>
                          )}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : null}
      </div>
    </section>
  )
}
