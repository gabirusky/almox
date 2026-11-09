import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/modules/access/use-auth";
import { ConfirmAction } from "@/modules/shared/components/ConfirmAction";
import { getErrorMessage } from "@/modules/shared/errors";
import { listDepartments, saveDepartment, setDepartmentActive } from "../services/catalog-api";
import type { Department } from "../types";

const schema = z.object({ name: z.string().trim().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres.") });
type Values = z.infer<typeof schema>;

export function DepartmentsPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Department | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { name: editing?.name ?? "" } });

  const save = useMutation({
    mutationFn: async (values: Values) => saveDepartment(editing?.id ? { id: editing.id, name: values.name } : { name: values.name }),
    onSuccess: async () => { setFeedback(editing ? "Setor atualizado." : "Setor criado."); setEditing(null); form.reset({ name: "" }); await qc.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível salvar o setor.")),
  });
  const inactivate = useMutation({
    mutationFn: (id: string) => setDepartmentActive(id, false),
    onSuccess: async () => { setFeedback("Setor inativado."); await qc.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível inativar o setor.")),
  });
  const reactivate = useMutation({
    mutationFn: (id: string) => setDepartmentActive(id, true),
    onSuccess: async () => { setFeedback("Setor reativado."); await qc.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível reativar o setor.")),
  });

  return (
    <section className="space-y-6" aria-labelledby="departments-title">
      <div>
        <h1 id="departments-title" className="text-2xl font-semibold">Setores destinatários</h1>
        <p className="text-sm text-gray-700">Cadastro administrativo (RF04). Setores inativos não devem ser usados em novas saídas.</p>
      </div>
      {feedback ? <p className="rounded border bg-white p-3 text-sm" role="status">{feedback}</p> : null}
      {isAdmin ? (
        <Card>
          <CardHeader><CardTitle>{editing ? "Editar setor" : "Novo setor"}</CardTitle></CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <div className="flex-1 space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register("name")} />
                {form.formState.errors.name ? <p className="text-sm text-red-600" role="alert">{form.formState.errors.name.message}</p> : null}
              </div>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
              {editing ? <Button type="button" variant="outline" onClick={() => { setEditing(null); form.reset({ name: "" }); }}>Cancelar</Button> : null}
            </form>
          </CardContent>
        </Card>
      ) : null}
      <div className="overflow-x-auto rounded-lg border bg-white">
        {isLoading ? <p className="p-4 text-sm">Carregando...</p> : null}
        {error ? <p className="p-4 text-sm text-red-600" role="alert">{getErrorMessage(error, "Falha ao carregar setores.")}</p> : null}
        {!isLoading && !error ? (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50"><tr><th className="px-4 py-2 font-medium">Nome</th><th className="px-4 py-2 font-medium">Situação</th>{isAdmin ? <th className="px-4 py-2 font-medium">Ações</th> : null}</tr></thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.active ? <span className="rounded bg-green-50 px-2 py-0.5 text-green-800">Ativo</span> : <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">Inativo</span>}</td>
                  {isAdmin ? (
                    <td className="flex flex-wrap gap-2 px-4 py-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(item)}>Editar</Button>
                      {item.active ? <ConfirmAction title="Inativar setor" description="O setor não poderá ser selecionado em novas operações." confirmLabel="Inativar" triggerLabel="Inativar" onConfirm={() => inactivate.mutateAsync(item.id)} /> : <Button type="button" size="sm" variant="secondary" onClick={() => reactivate.mutate(item.id)} disabled={reactivate.isPending}>Reativar</Button>}
                    </td>
                  ) : null}
                </tr>
              ))}
              {data.length === 0 ? <tr><td className="px-4 py-4 text-gray-600" colSpan={isAdmin ? 3 : 2}>Nenhum setor cadastrado.</td></tr> : null}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
