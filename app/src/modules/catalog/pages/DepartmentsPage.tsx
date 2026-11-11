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
import { listDepartments, saveDepartment, setDepartmentActive } from "../services/catalog-api"
import type { Department } from "../types"

const schema = z.object({ name: z.string().trim().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres.") })
type Values = z.infer<typeof schema>

export function DepartmentsPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === "admin"
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Department | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null)
  const { data = [], isLoading, error } = useQuery({ queryKey: ["departments"], queryFn: listDepartments })
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { name: editing?.name ?? "" } })

  const save = useMutation({
    mutationFn: async (values: Values) => saveDepartment(editing?.id ? { id: editing.id, name: values.name } : { name: values.name }),
    onSuccess: async () => {
      setFeedback({ type: "success", text: editing ? "Setor atualizado." : "Setor criado." })
      setEditing(null)
      form.reset({ name: "" })
      await qc.invalidateQueries({ queryKey: ["departments"] })
    },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível salvar o setor.") }),
  })
  const inactivate = useMutation({
    mutationFn: (id: string) => setDepartmentActive(id, false),
    onSuccess: async () => { setFeedback({ type: "success", text: "Setor inativado." }); await qc.invalidateQueries({ queryKey: ["departments"] }) },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível inativar o setor.") }),
  })
  const reactivate = useMutation({
    mutationFn: (id: string) => setDepartmentActive(id, true),
    onSuccess: async () => { setFeedback({ type: "success", text: "Setor reativado." }); await qc.invalidateQueries({ queryKey: ["departments"] }) },
    onError: (err) => setFeedback({ type: "danger", text: getErrorMessage(err, "Não foi possível reativar o setor.") }),
  })

  return (
    <section className="space-y-6">
      <PageHeader title="Setores destinatários" description="Cadastro administrativo de setores. Setores inativos não podem ser usados em novas saídas." />
      {feedback ? <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert> : null}
      {isAdmin ? (
        <Card>
          <CardHeader><CardTitle className="font-heading text-lg">{editing ? "Editar setor" : "Novo setor"}</CardTitle></CardHeader>
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
        {error ? <div className="p-4"><ErrorState message={getErrorMessage(error, "Falha ao carregar setores.")} /></div> : null}
        {!isLoading && !error ? (
          data.length === 0 ? <div className="p-4"><EmptyState title="Nenhum setor cadastrado" description={isAdmin ? "Crie o primeiro setor para registrar saídas." : "Ainda não há setores disponíveis."} /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Situação</TableHead>{isAdmin ? <TableHead className="w-[260px]">Ações</TableHead> : null}</TableRow></TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell><ActiveBadge active={item.active} activeLabel="Ativo" inactiveLabel="Inativo" /></TableCell>
                    {isAdmin ? (
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(item); setFeedback(null) }}>Editar</Button>
                          {item.active ? (
                            <ConfirmAction title="Inativar setor" description="O setor não poderá ser selecionado em novas operações de saída." confirmLabel="Inativar" triggerLabel="Inativar" variant="outline" onConfirm={() => inactivate.mutateAsync(item.id)} />
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
