import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router"
import { ClipboardCheck, FileSpreadsheet, History, LayoutDashboard, ShieldCheck, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { AuthProvider } from "@/modules/access/auth-context"
import { useAuth } from "@/modules/access/use-auth"
import { PublicOnly, RequireAuth, RequireRole } from "@/modules/access/guards"
import { InactiveAccessPage, MisconfiguredPage } from "@/modules/access/pages/AccessStatusPages"
import { LoginPage } from "@/modules/access/pages/LoginPage"
import { RecoverPasswordPage } from "@/modules/access/pages/RecoverPasswordPage"
import { SetPasswordPage } from "@/modules/access/pages/SetPasswordPage"
import { DashboardPage } from "@/modules/admin/pages/DashboardPage"
import { ExportPage } from "@/modules/admin/pages/ExportPage"
import { UsersPage } from "@/modules/admin/pages/UsersPage"
import { CategoriesPage } from "@/modules/catalog/pages/CategoriesPage"
import { DepartmentsPage } from "@/modules/catalog/pages/DepartmentsPage"
import { ProductsPage } from "@/modules/catalog/pages/ProductsPage"
import { ProductDetailsPage } from "@/modules/catalog/pages/ProductDetailsPage"
import { NewEntryPage } from "@/modules/catalog/pages/NewEntryPage"
import { NewExitPage } from "@/modules/catalog/pages/NewExitPage"
import { OperationsLogPage } from "@/modules/catalog/pages/OperationsLogPage"
import { InventoryCountPage } from "@/modules/catalog/pages/InventoryCountPage"
import { AppShell } from "@/modules/shared/components/AppShell"
import { LoadingSkeleton } from "@/modules/shared/components/States"
import { Button } from "@/components/ui/button"
import logo from "@/assets/logo_almox.png"
import { AuditPage } from "@/modules/audit/AuditPage"
import { useEffect, useState } from "react"

const queryClient = new QueryClient()

const features: Array<{ code: string; title: string; text: string; icon: LucideIcon }> = [
  { code: "RF01–RF02", title: "Acesso individual", text: "Cada operação fica atrelada a uma pessoa e a um perfil validado no banco.", icon: ShieldCheck },
  { code: "RF07–RF10", title: "Movimentos íntegros", text: "Entradas, saídas, estornos e contagens atômicas, sem saldo negativo nem duplicidade.", icon: ClipboardCheck },
  { code: "RF06 · RF11", title: "Histórico verificável", text: "Saldo reconstruível pela soma dos lançamentos, com vínculos de estorno.", icon: History },
  { code: "RF14", title: "Painel de reposição", text: "Itens zerados e no limite mínimo destacados para planejar compras.", icon: LayoutDashboard },
  { code: "RF15", title: "Relatórios CSV", text: "Saldo e movimentações filtradas, com filtros e momento da geração.", icon: FileSpreadsheet },
  { code: "RF16", title: "Gestão de acessos", text: "Convites, perfis e desativação imediata, sem cadastro público.", icon: Users },
]

function LandingPage() {
  const [mostrarRecursos, setMostrarRecursos] = useState(false)

  // Ao revelar, rola até os recursos; ao ocultar, volta para o topo da landing.
  useEffect(() => {
    const alvo = mostrarRecursos ? "recursos" : "hero"
    document.getElementById(alvo)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [mostrarRecursos])

  const toggleRecursos = () => setMostrarRecursos((v) => !v)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-16 py-12 lg:space-y-20 lg:py-16">
      <section id="hero" className="grid items-center gap-10">
        <div className="relative mx-auto w-full max-w-[26rem]">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-signal/15 via-transparent to-success/15 blur-2xl" aria-hidden="true" />
          <div className="relative flex w-full flex-col items-center justify-center gap-5 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:aspect-square">
            <img src={logo} alt="ALMOX — Controle, organização, resultados" className="h-64 w-auto sm:h-72" />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg"><Link to="/login">Entrar no sistema</Link></Button>
              <Button size="lg" variant="outline" onClick={toggleRecursos}>
                {mostrarRecursos ? "Ocultar recursos" : "Conhecer recursos"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {mostrarRecursos && (
        <section id="recursos" aria-labelledby="recursos-titulo" className="space-y-5">
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
      )}
    </div>
  )
}

function HomeRoute() {
  const { status } = useAuth()
  if (status === "loading") return <LoadingSkeleton lines={3} />
  if (status === "authenticated") return <DashboardPage />
  if (status === "inactive") return <Navigate to="/acesso-inativo" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/painel" element={<Navigate to="/" replace />} />
              <Route path="/app" element={<Navigate to="/" replace />} />
              <Route path="/configuracao" element={<MisconfiguredPage />} />
              <Route path="/acesso-inativo" element={<InactiveAccessPage />} />
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/definir-senha" element={<SetPasswordPage />} />
              <Route path="/recuperar-senha" element={<PublicOnly><RecoverPasswordPage /></PublicOnly>} />
              <Route path="/produtos" element={<RequireAuth><ProductsPage /></RequireAuth>} />
              <Route path="/produtos/:id" element={<RequireAuth><ProductDetailsPage /></RequireAuth>} />
              <Route path="/movimentacoes" element={<RequireAuth><OperationsLogPage /></RequireAuth>} />
              <Route path="/movimentacoes/nova" element={<RequireAuth><NewEntryPage /></RequireAuth>} />
              <Route path="/movimentacoes/saida" element={<RequireAuth><NewExitPage /></RequireAuth>} />
              <Route path="/movimentacoes/ajuste" element={<RequireAuth><RequireRole role="admin"><InventoryCountPage /></RequireRole></RequireAuth>} />
              <Route path="/categorias" element={<RequireAuth><CategoriesPage /></RequireAuth>} />
              <Route path="/setores" element={<RequireAuth><DepartmentsPage /></RequireAuth>} />
              <Route path="/relatorios" element={<RequireAuth><RequireRole role="admin"><ExportPage /></RequireRole></RequireAuth>} />
              <Route path="/usuarios" element={<RequireAuth><RequireRole role="admin"><UsersPage /></RequireRole></RequireAuth>} />
              <Route path="/auditoria" element={<RequireAuth><RequireRole role="admin"><AuditPage /></RequireRole></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
