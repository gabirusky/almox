import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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
    <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-[1fr_2fr]">
      <div className="relative hidden overflow-hidden bg-ink p-6 text-surface lg:flex lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-signal/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 size-64 rounded-full bg-success/30 blur-3xl" aria-hidden="true" />
        <div className="relative flex w-full max-w-[16rem] items-center justify-center rounded-2xl bg-surface p-5 shadow-2xl">
          <img src={logo} alt="ALMOX" className="h-auto w-full" />
        </div>
      </div>
      <div className="p-6 sm:p-10 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden"><img src={logo} alt="ALMOX" className="h-16 w-auto" /></div>
          <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-ink">Entrar</h1>
          <p className="mt-1 text-sm text-muted">Use seu e-mail e senha concedidos pelo administrador.</p>
          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
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
            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Entrando..." : "Entrar"}</Button>
            <p className="text-center text-sm">
              <Link className="rounded text-signal underline underline-offset-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2" to="/recuperar-senha">Esqueci minha senha</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
