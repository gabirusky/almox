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
import { listCategories, saveCategory, setCategoryActive } from "../services/catalog-api";
import type { Category } from "../types";

const schema = z.object({ name: z.string().trim().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres.") });
type Values = z.infer<typeof schema>;

export function CategoriesPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { data = [], isLoading, error } = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { name: editing?.name ?? "" } });

  const save = useMutation({
    mutationFn: async (values: Values) => saveCategory(editing?.id ? { id: editing.id, name: values.name } : { name: values.name }),
    onSuccess: async () => {
      setFeedback(editing ? "Categoria atualizada." : "Categoria criada.");
      setEditing(null);
      form.reset({ name: "" });
      await qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível salvar a categoria.")),
  });

  const inactivate = useMutation({
    mutationFn: (id: string) => setCategoryActive(id, false),
    onSuccess: async () => { setFeedback("Categoria inativada."); await qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível inativar a categoria.")),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) => setCategoryActive(id, true),
    onSuccess: async () => { setFeedback("Categoria reativada."); await qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (err) => setFeedback(getErrorMessage(err, "Não foi possível reativar a categoria.")),
  });

  return (
    <section className="space-y-6" aria-labelledby="categories-title">
      <div>
        <h1 id="categories-title" className="text-2xl font-semibold">Categorias</h1>
        <p className="text-sm text-gray-700">Cadastro administrativo (RF04). Inativas não devem ser usadas em novas operações.</p>
      </div>
      {feedback ? <p className="rounded border bg-white p-3 text-sm" role="status">{feedback}</p> : null}
      {isAdmin ? (
        <Card>
          <CardHeader><CardTitle>{editing ? "Editar categoria" : "Nova categoria"}</CardTitle></CardHeader>
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
        {error ? <p className="p-4 text-sm text-red-600" role="alert">{getErrorMessage(error, "Falha ao carregar categorias.")}</p> : null}
        {!isLoading && !error ? (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50"><tr><th className="px-4 py-2 font-medium">Nome</th><th className="px-4 py-2 font-medium">Situação</th>{isAdmin ? <th className="px-4 py-2 font-medium">Ações</th> : null}</tr></thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{item.name}</td>
                  <td className="px-4 py-2">{item.active ? <span className="rounded bg-green-50 px-2 py-0.5 text-green-800">Ativa</span> : <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">Inativa</span>}</td>
                  {isAdmin ? (
                    <td className="flex flex-wrap gap-2 px-4 py-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditing(item)}>Editar</Button>
                      {item.active ? (
                        <ConfirmAction title="Inativar categoria" description="A categoria não poderá ser selecionada em novas operações. Se houver produtos ativos vinculados, a inativação será recusada." confirmLabel="Inativar" triggerLabel="Inativar" onConfirm={() => inactivate.mutateAsync(item.id)} />
                      ) : (
                        <Button type="button" size="sm" variant="secondary" onClick={() => reactivate.mutate(item.id)} disabled={reactivate.isPending}>Reativar</Button>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
              {data.length === 0 ? <tr><td className="px-4 py-4 text-gray-600" colSpan={isAdmin ? 3 : 2}>Nenhuma categoria cadastrada.</td></tr> : null}
            </tbody>
          </table>
        ) : null}
      </div>
    </section>
  );
}
