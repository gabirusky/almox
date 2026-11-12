import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Link, useLocation, useNavigate } from "react-router"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { isOfflineMode } from "@/lib/mock-mode"
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
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-10 text-surface lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-signal/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 size-64 rounded-full bg-success/30 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:28px_28px]" aria-hidden="true" />
        <div className="relative inline-flex w-fit rounded-xl bg-surface p-3"><img src={logo} alt="ALMOX" className="h-16 w-auto" /></div>
        <div className="relative space-y-3">
          <p className="font-heading text-3xl font-semibold leading-tight tracking-tight">Quem, quando, quanto e por quê — em cada movimento.</p>
          <p className="text-sm text-surface/75">Autorização e consistência validadas no banco. A interface nunca decide sozinha o seu saldo.</p>
        </div>
        <p className="relative font-mono text-xs text-surface/60">Controle · Organização · Resultados</p>
      </div>
      <div className="p-6 sm:p-10">
        <div className="mb-6 flex justify-center lg:hidden"><img src={logo} alt="ALMOX" className="h-16 w-auto" /></div>
        <p className="font-mono text-xs text-signal">Acesso protegido</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight text-ink">Entrar</h1>
        <p className="mt-1 text-sm text-muted">Use seu e-mail e senha corporativos. Não há cadastro público: o acesso é concedido por um administrador.</p>
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
        {isOfflineMode() ? (
          <div className="mt-6 rounded-lg border border-dashed border-warn/40 bg-warn/5 p-3 text-xs text-ink">
            <p className="font-medium text-warn">Modo demonstração (sem Supabase)</p>
            <p className="mt-1 text-muted">admin@almox.test · operador@almox.test — senha <span className="font-mono">Test1234!</span></p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
