import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Link } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { useAuth } from "../use-auth"
import logo from "@/assets/logo_almox.png"

const schema = z.object({ email: z.string().email("Informe um e-mail válido.") })
type FormValues = z.infer<typeof schema>

export function RecoverPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    const message = await requestPasswordReset(email)
    if (message) return setError("root", { message })
    setSent(true)
  })

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-6 flex justify-center"><img src={logo} alt="ALMOX" className="h-16 w-auto" /></div>
      <Card className="border-line">
        <CardHeader className="space-y-2">
          <p className="font-mono text-xs text-signal">Recuperação</p>
          <CardTitle className="font-heading text-2xl">Recuperar senha</CardTitle>
          <CardDescription>Enviaremos instruções para o e-mail informado, se houver uma conta correspondente.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Alert variant="success">Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha.</Alert>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
                {errors.email ? <p id="email-error" className="text-sm text-danger" role="alert">{errors.email.message}</p> : null}
              </div>
              {errors.root?.message ? <Alert variant="danger">{errors.root.message}</Alert> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar link"}</Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm"><Link className="text-signal underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 rounded" to="/login">Voltar ao login</Link></p>
        </CardContent>
      </Card>
    </div>
  )
}
