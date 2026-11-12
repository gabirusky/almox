import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { z } from "zod"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isOfflineMode } from "@/lib/mock-mode"
import { supabase } from "@/lib/supabase"
import { LoadingSkeleton } from "@/modules/shared/components/States"
import { useAuth } from "../use-auth"

const schema = z.object({
  password: z.string().min(8, "Use ao menos 8 caracteres.").max(72, "Máximo de 72 caracteres."),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não coincidem." })

type Values = z.infer<typeof schema>

// Destino dos links de convite (RF16) e de recuperação de senha (RF01).
// O Supabase cria a sessão a partir do link; aqui a pessoa define a senha.
// A rota não exige perfil ativo: um convidado ainda não habilitado também define a senha.
export function SetPasswordPage() {
  const { status, session, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [done, setDone] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } })

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) { setError("root", { message: "Não foi possível definir a senha. O link pode ter expirado; solicite um novo." }); return }
    setDone(true)
    await refreshProfile()
  })

  if (status === "loading") return <LoadingSkeleton lines={3} className="mx-auto max-w-md" />

  return (
    <div className="mx-auto max-w-md py-6">
      <Card>
        <CardHeader className="space-y-2">
          <p className="font-mono text-xs text-signal">Convite ou recuperação</p>
          <CardTitle className="font-heading text-2xl">Definir senha</CardTitle>
          <CardDescription>Crie a senha de acesso ao ALMOX.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOfflineMode() ? (
            <Alert variant="warning">No modo demonstração as contas usam a senha de teste; não há link de e-mail.</Alert>
          ) : !session ? (
            <>
              <Alert variant="warning">Link inválido ou expirado. Solicite um novo convite ao administrador ou uma nova recuperação de senha.</Alert>
              <Button asChild variant="outline" className="w-full"><Link to="/recuperar-senha">Recuperar senha</Link></Button>
            </>
          ) : done ? (
            <>
              <Alert variant="success">Senha definida.{status === "inactive" ? " Seu acesso ainda aguarda habilitação por um administrador." : ""}</Alert>
              <Button className="w-full" onClick={() => navigate(status === "inactive" ? "/acesso-inativo" : "/", { replace: true })}>Continuar</Button>
            </>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input id="new-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "new-password-error" : undefined} {...register("password")} />
                {errors.password ? <p id="new-password-error" className="text-sm text-danger" role="alert">{errors.password.message}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password">Confirmar senha</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? "confirm-password-error" : undefined} {...register("confirm")} />
                {errors.confirm ? <p id="confirm-password-error" className="text-sm text-danger" role="alert">{errors.confirm.message}</p> : null}
              </div>
              {errors.root?.message ? <Alert variant="danger">{errors.root.message}</Alert> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Definir senha"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
