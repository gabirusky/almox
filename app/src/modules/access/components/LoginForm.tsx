import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { useAuth } from "../use-auth"

const schema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
})

type FormValues = z.infer<typeof schema>

/**
 * Formulário de acesso extraído de `pages/LoginPage.tsx`.
 * A lógica de autenticação, validação e recuperação de senha é idêntica:
 * aqui mora apenas o markup, que o AuthExperience anima na entrada/saída.
 */
export function LoginForm() {
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
    <div className="mx-auto w-full max-w-md">
      <h1 className="authx__step mt-1 font-heading text-2xl font-semibold tracking-tight text-ink" data-step="1">Entrar</h1>
      <p className="authx__step mt-1 text-sm text-muted" data-step="2">Use seu e-mail e senha concedidos pelo administrador.</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <div className="authx__step space-y-1.5" data-step="3">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} {...register("email")} />
          {errors.email ? <p id="email-error" className="text-sm text-danger" role="alert">{errors.email.message}</p> : null}
        </div>
        <div className="authx__step space-y-1.5" data-step="4">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} {...register("password")} />
          {errors.password ? <p id="password-error" className="text-sm text-danger" role="alert">{errors.password.message}</p> : null}
        </div>
        {errors.root?.message ? <Alert variant="danger">{errors.root.message}</Alert> : null}
        <div className="authx__step" data-step="5">
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar"}</Button>
        </div>
        <p className="authx__step text-center text-sm" data-step="6">
          <Link className="rounded text-signal underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2" to="/recuperar-senha">Esqueci minha senha</Link>
        </p>
      </form>
    </div>
  )
}
