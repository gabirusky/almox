import { useEffect, useRef, useState } from "react"
import { Link } from "react-router"
import { ClipboardCheck, FileSpreadsheet, History, LayoutDashboard, ShieldCheck, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import logo from "@/assets/logo_almox.png"
import { LoginForm } from "./LoginForm"
import "@/modules/access/auth-experience.css"

export type AuthView = "landing" | "login"

const features: Array<{ code: string; title: string; text: string; icon: LucideIcon }> = [
  { code: "RF01–RF02", title: "Acesso individual", text: "Cada operação fica atrelada a uma pessoa e a um perfil validado no banco.", icon: ShieldCheck },
  { code: "RF07–RF10", title: "Movimentos íntegros", text: "Entradas, saídas, estornos e contagens atômicas, sem saldo negativo nem duplicidade.", icon: ClipboardCheck },
  { code: "RF06 · RF11", title: "Histórico verificável", text: "Saldo reconstruível pela soma dos lançamentos, com vínculos de estorno.", icon: History },
  { code: "RF14", title: "Painel de reposição", text: "Itens zerados e no limite mínimo destacados para planejar compras.", icon: LayoutDashboard },
  { code: "RF15", title: "Relatórios CSV", text: "Saldo e movimentações filtradas, com filtros e momento da geração.", icon: FileSpreadsheet },
  { code: "RF16", title: "Gestão de acessos", text: "Convites, perfis e desativação imediata, sem cadastro público.", icon: Users },
]

/**
 * Experiência única de acesso público: landing e login são dois estados
 * visuais do mesmo card (mesmo logo, mesma marca, mesma moldura).
 *
 * A URL define o estado; a animação é feita por CSS (`auth-experience.css`),
 * sem remontar a interface e sem duplicar o logo.
 */
export function AuthExperience({ view }: { view: AuthView }) {
  const [mostrarRecursos, setMostrarRecursos] = useState(false)
  const raizRef = useRef<HTMLDivElement>(null)
  const entrarRef = useRef<HTMLAnchorElement>(null)
  const viewAnterior = useRef<AuthView>(view)

  // Ao revelar, rola até os recursos; ao ocultar, volta para o topo da landing.
  useEffect(() => {
    const alvo = mostrarRecursos ? "recursos" : "hero"
    document.getElementById(alvo)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [mostrarRecursos])

  // Foco e rolagem acompanham a troca de estado (ida: campo de e-mail; volta: botão).
  useEffect(() => {
    if (viewAnterior.current === view) return
    viewAnterior.current = view

    if (view === "login") {
      window.scrollTo({ top: 0, behavior: "auto" })
      const timer = window.setTimeout(() => {
        const campo = raizRef.current?.querySelector<HTMLInputElement>("#email")
        if (campo && !raizRef.current?.contains(document.activeElement)) campo.focus({ preventScroll: true })
      }, 900)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      entrarRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: "auto" })
    }, 520)
    return () => window.clearTimeout(timer)
  }, [view])

  const toggleRecursos = () => setMostrarRecursos((v) => !v)

  return (
    <div className="authx" data-view={view} ref={raizRef}>
      <div className="mx-auto w-full max-w-6xl">
        <section id="hero" className="grid items-center gap-10">
          <div className="authx__hero">
            <div className="authx__glow absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-signal/15 via-transparent to-success/15 blur-2xl" aria-hidden="true" />
            <div className="authx__card">
              <div className="authx__brand">
                <div className="authx__brandBg" aria-hidden="true" />

                {/* único logo da tela: viaja do centro do card para o painel de marca */}
                <div className="authx__chip">
                  <img src={logo} alt="ALMOX — Controle, organização, resultados" />
                </div>

                <div className="authx__actions" aria-hidden={view === "login"} inert={view === "login"}>
                  <Button asChild size="lg" className="h-11 px-4 text-sm active:scale-[0.98]">
                    <Link ref={entrarRef} to="/login">Entrar no sistema</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-11 px-4 text-sm" onClick={toggleRecursos}>
                    {mostrarRecursos ? "Ocultar recursos" : "Conhecer recursos"}
                  </Button>
                </div>
              </div>

              <div className="authx__form" aria-hidden={view !== "login"} inert={view !== "login"}>
                <div className="authx__formInner">
                  <LoginForm />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div id="recursos" className="authx__resources" data-open={mostrarRecursos ? "true" : "false"}>
        <section aria-labelledby="recursos-titulo" className="mx-auto max-w-3xl space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="recursos-titulo" className="font-heading text-xl font-semibold tracking-tight">Recursos do MVP</h2>
            <Button size="sm" variant="ghost" onClick={toggleRecursos}>Ocultar recursos</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.code} className="rounded-xl border border-line bg-surface p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-signal/10 text-signal" aria-hidden="true"><f.icon className="size-5" /></span>
                  <span className="font-mono text-xs text-muted">{f.code}</span>
                </div>
                <h3 className="mt-4 font-heading font-semibold text-ink">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
