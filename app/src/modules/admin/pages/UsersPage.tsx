import { useId, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { MailPlus, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { isOfflineMode } from "@/lib/mock-mode"
import { useAuth } from "@/modules/access/use-auth"
import type { AlmoxRole } from "@/modules/access/types"
import { ConfirmDialog } from "@/modules/shared/components/ConfirmDialog"
import { PageHeader } from "@/modules/shared/components/PageHeader"
import { EmptyState, ErrorState, FeedbackAlert, LoadingSkeleton } from "@/modules/shared/components/States"
import { getErrorMessage } from "@/modules/shared/errors"
import { formatDateTime } from "@/modules/shared/formatters"
import { inviteUser, listAccessRequests, listUsers, setUserActive, setUserRole } from "../services/admin-api"
import type { AccessRequest, ManagedUser } from "../types"

const inviteSchema = z.object({
  displayName: z.string().trim().min(1, "Informe o nome de exibição.").max(120, "Máximo de 120 caracteres."),
  email: z.string().trim().max(254, "E-mail muito longo.").email("Informe um e-mail válido."),
  role: z.enum(["employee", "admin"]),
})
type InviteValues = z.infer<typeof inviteSchema>

type PendingChange =
  | { kind: "role"; user: ManagedUser; role: AlmoxRole }
  | { kind: "active"; user: ManagedUser; active: boolean }

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?"
}

function RequestStatus({ request }: { request: AccessRequest }) {
  if (request.status === "completed") return <Badge variant="success">Convite enviado</Badge>
  if (request.status === "failed") return <Badge variant="danger">Falhou{request.error_code ? ` · ${request.error_code}` : ""}</Badge>
  return <Badge variant="warning">Pendente</Badge>
}

export function UsersPage() {
  const { profile, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const users = useQuery({ queryKey: ["users"], queryFn: listUsers })
  const requests = useQuery({ queryKey: ["access-requests"], queryFn: listAccessRequests })
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null)
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const inviteKey = useRef(crypto.randomUUID())
  const titleId = useId()
  const descId = useId()

  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { displayName: "", email: "", role: "employee" } })

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["users"] })
    await queryClient.invalidateQueries({ queryKey: ["access-requests"] })
  }

  const change = useMutation({
    mutationFn: async (c: PendingChange) => (c.kind === "role" ? setUserRole(c.user.id, c.role) : setUserActive(c.user.id, c.active)),
    onSuccess: async (_res, c) => {
      setFeedback({ type: "success", text: c.kind === "role"
        ? `Perfil de ${c.user.display_name} alterado para ${c.role === "admin" ? "administrador" : "funcionário"}.`
        : c.active ? `Acesso de ${c.user.display_name} habilitado.` : `Acesso de ${c.user.display_name} desativado. A próxima requisição protegida será negada.` })
      setPending(null)
      await refresh()
      if (c.user.id === profile?.id) await refreshProfile()
    },
    onError: (error) => { setFeedback({ type: "danger", text: getErrorMessage(error, "Não foi possível alterar o usuário.") }); setPending(null) },
  })

  const invite = useMutation({
    mutationFn: (values: InviteValues) => inviteUser({ ...values, operationKey: inviteKey.current }),
    onSuccess: async (request) => {
      setFeedback({ type: "success", text: `Convite registrado para ${request.target_email}. O perfil nasce inativo: habilite o acesso quando a pessoa estiver autorizada.${isOfflineMode() ? " (Modo demonstração: senha Test1234!)" : ""}` })
      inviteKey.current = crypto.randomUUID()
      form.reset({ displayName: "", email: "", role: "employee" })
      setInviteOpen(false)
      await refresh()
    },
    onError: async (error) => {
      setFeedback({ type: "danger", text: getErrorMessage(error, "Não foi possível enviar o convite.") })
      await refresh()
    },
  })

  const list = users.data ?? []
  const activeAdmins = list.filter((u) => u.role === "admin" && u.active).length
  const stats = [
    { label: "Usuários", value: list.length },
    { label: "Ativos", value: list.filter((u) => u.active).length },
    { label: "Administradores ativos", value: activeAdmins },
    { label: "Aguardando habilitação", value: list.filter((u) => !u.active && !u.last_sign_in_at).length },
  ]

  return (
    <section className="space-y-6">
      <PageHeader
        title="Usuários e acessos"
        description="Convide pessoas, defina o perfil e habilite ou desative o acesso. Não há cadastro público; deve existir sempre ao menos um administrador ativo."
        actions={<Button type="button" onClick={() => { setFeedback(null); setInviteOpen(true) }}><MailPlus />Convidar usuário</Button>}
      />
      {feedback ? <FeedbackAlert variant={feedback.type}>{feedback.text}</FeedbackAlert> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-medium text-muted">{s.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">{users.isLoading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {users.isLoading ? <LoadingSkeleton lines={5} /> : null}
      {users.error ? <ErrorState message={getErrorMessage(users.error, "Não foi possível carregar os usuários.")} /> : null}
      {users.data ? (
        list.length === 0 ? <EmptyState title="Nenhum usuário" /> : (
          <Card className="gap-0 py-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Pessoa</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="hidden xl:table-cell">Último acesso</TableHead>
                    <TableHead className="pr-6 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((u) => {
                    const isSelf = u.id === profile?.id
                    const isLastAdmin = u.role === "admin" && u.active && activeAdmins <= 1
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <span className={u.active ? "grid size-9 shrink-0 place-items-center rounded-full bg-ink font-heading text-xs font-semibold text-surface" : "grid size-9 shrink-0 place-items-center rounded-full bg-line font-heading text-xs font-semibold text-muted"} aria-hidden="true">{initials(u.display_name)}</span>
                            <div className="min-w-0">
                              <p className="whitespace-nowrap font-medium text-ink">{u.display_name}{isSelf ? <span className="ml-1.5 text-xs font-normal text-muted">(você)</span> : null}</p>
                              <p className="truncate text-xs text-muted">{u.email ?? "—"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <label className="sr-only" htmlFor={`role-${u.id}`}>Perfil de {u.display_name}</label>
                          <Select id={`role-${u.id}`} className="h-8 w-40" value={u.role} disabled={change.isPending || isLastAdmin}
                            title={isLastAdmin ? "Último administrador ativo: promova outra pessoa antes." : undefined}
                            onChange={(e) => setPending({ kind: "role", user: u, role: e.target.value as AlmoxRole })}>
                            <option value="employee">Funcionário</option>
                            <option value="admin">Administrador</option>
                          </Select>
                        </TableCell>
                        <TableCell>{u.active ? <Badge variant="success">Ativo</Badge> : u.last_sign_in_at ? <Badge variant="muted">Desativado</Badge> : <Badge variant="warning">Aguardando habilitação</Badge>}</TableCell>
                        <TableCell className="hidden text-sm text-muted xl:table-cell">{u.last_sign_in_at ? formatDateTime(u.last_sign_in_at) : "Nunca acessou"}</TableCell>
                        <TableCell className="pr-6 text-right">
                          {u.active ? (
                            <Button type="button" size="sm" variant="outline" disabled={change.isPending || isLastAdmin} title={isLastAdmin ? "Último administrador ativo" : undefined} onClick={() => setPending({ kind: "active", user: u, active: false })}>Desativar</Button>
                          ) : (
                            <Button type="button" size="sm" disabled={change.isPending} onClick={() => setPending({ kind: "active", user: u, active: true })}>Habilitar</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      ) : null}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-base"><Users className="size-4 text-signal" aria-hidden="true" />Convites recentes</CardTitle>
          <CardDescription>Estado de cada pedido de acesso. Repetir um convite com a mesma chave não cria contas duplicadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.error ? <p className="text-sm text-danger" role="alert">{getErrorMessage(requests.error, "Não foi possível carregar os convites.")}</p> : null}
          {(requests.data ?? []).length === 0 && !requests.isLoading ? <p className="text-sm text-muted">Nenhum convite registrado.</p> : null}
          <ul className="divide-y divide-line">
            {(requests.data ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{r.display_name} <span className="font-normal text-muted">· {r.target_email}</span></p>
                  <p className="text-xs text-muted">{formatDateTime(r.created_at)} · {r.role === "admin" ? "administrador" : "funcionário"}</p>
                </div>
                <RequestStatus request={r} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => { if (!open && !change.isPending) setPending(null) }}
        title={pending?.kind === "role" ? "Alterar perfil" : pending?.kind === "active" && pending.active ? "Habilitar acesso" : "Desativar acesso"}
        description={pending?.kind === "role"
          ? `${pending.user.display_name} passará a ser ${pending.role === "admin" ? "administrador(a), com acesso a ajustes, estornos, relatórios e usuários" : "funcionário(a), sem acesso às funções administrativas"}.`
          : pending?.kind === "active"
            ? pending.active ? `${pending.user.display_name} poderá entrar e operar conforme o perfil.` : `${pending.user.display_name} será bloqueado(a) na próxima requisição protegida, mesmo com sessão aberta. O histórico é preservado.`
            : ""}
        confirmLabel={pending?.kind === "active" && !pending.active ? "Desativar" : "Confirmar"}
        variant={pending?.kind === "active" && !pending.active ? "destructive" : "default"}
        pending={change.isPending}
        onConfirm={() => { if (pending) change.mutate(pending) }}
      >
        {pending?.user.id === profile?.id ? <FeedbackAlert variant="warning">Esta alteração afeta a sua própria conta.</FeedbackAlert> : null}
      </ConfirmDialog>

      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!invite.isPending) setInviteOpen(v) }}>
        <DialogContent labelledBy={titleId} describedBy={descId}>
          <DialogHeader>
            <DialogTitle id={titleId}>Convidar usuário</DialogTitle>
            <DialogDescription id={descId}>A pessoa recebe um e-mail para definir a senha. O perfil é criado inativo e só opera após você habilitar o acesso.</DialogDescription>
          </DialogHeader>
          <form className="mt-4 space-y-4" onSubmit={form.handleSubmit((values) => invite.mutate(values))} onChange={() => { inviteKey.current = crypto.randomUUID() }} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="inv-name">Nome de exibição</Label>
              <Input id="inv-name" autoComplete="off" maxLength={120} aria-invalid={Boolean(form.formState.errors.displayName)} aria-describedby={form.formState.errors.displayName ? "inv-name-error" : undefined} disabled={invite.isPending} {...form.register("displayName")} />
              {form.formState.errors.displayName ? <p id="inv-name-error" className="text-sm text-danger" role="alert">{form.formState.errors.displayName.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-email">E-mail corporativo</Label>
              <Input id="inv-email" type="email" autoComplete="off" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? "inv-email-error" : undefined} disabled={invite.isPending} {...form.register("email")} />
              {form.formState.errors.email ? <p id="inv-email-error" className="text-sm text-danger" role="alert">{form.formState.errors.email.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-role">Perfil</Label>
              <Select id="inv-role" disabled={invite.isPending} {...form.register("role")}>
                <option value="employee">Funcionário operador</option>
                <option value="admin">Administrador</option>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={invite.isPending}>Cancelar</Button>
              <Button type="submit" disabled={invite.isPending}><MailPlus />{invite.isPending ? "Enviando..." : "Enviar convite"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
