import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { useAuth } from "../use-auth"
import logo from "@/assets/logo_almox.png"

const schema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { signInWithPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/"

  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = handleSubmit(async (values) => {
    const message = await signInWithPassword(values.email, values.password)
    if (message) { setError("root", { message }); return }
    navigate(from, { replace: true })
  })

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-6 flex justify-center"><img src={logo} alt="ALMOX" className="h-16 w-auto" /></div>
      <Card className="border-line">
        <CardHeader className="space-y-2">
          <p className="font-mono text-xs text-signal">Acesso protegido</p>
          <CardTitle className="font-heading text-2xl">Entrar</CardTitle>
          <CardDescription>Use seu e-mail e senha para acessar o almoxarifado.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
              {errors.email ? <p id="email-error" className="text-sm text-danger" role="alert">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
              {errors.password ? <p id="password-error" className="text-sm text-danger" role="alert">{errors.password.message}</p> : null}
            </div>
            {errors.root?.message ? <Alert variant="danger">{errors.root.message}</Alert> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar"}</Button>
            <p className="text-center text-sm">
              <Link className="text-signal underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 rounded" to="/recuperar-senha">Esqueci minha senha</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
