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
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-signal"><span className="size-1.5 rounded-full bg-success" aria-hidden="true" />Controle · Organização · Resultados</p>
          <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            Saldo confiável.<br />
            <span className="text-signal">Cada movimento</span> com autor, motivo e efeito.
          </h1>
          <p className="max-w-xl text-base text-muted">O ALMOX centraliza o almoxarifado corporativo: consulte materiais, registre entradas e saídas e corrija divergências sem apagar o histórico.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/login">Entrar no sistema</Link></Button>
            <Button asChild size="lg" variant="outline"><a href="#recursos">Conhecer recursos</a></Button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-signal/15 via-transparent to-success/15 blur-2xl" aria-hidden="true" />
          <div className="relative rounded-2xl border border-line bg-surface p-8 shadow-sm">
            <img src={logo} alt="ALMOX — Controle, organização, resultados" className="mx-auto h-56 w-auto sm:h-64" />
            <dl className="mt-6 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-bg text-center">
              <div className="p-3"><dt className="text-[11px] text-muted">Saldo negativo</dt><dd className="font-mono text-lg font-semibold text-ink">0</dd></div>
              <div className="p-3"><dt className="text-[11px] text-muted">Lançamentos editáveis</dt><dd className="font-mono text-lg font-semibold text-ink">0</dd></div>
              <div className="p-3"><dt className="text-[11px] text-muted">Rastreabilidade</dt><dd className="font-mono text-lg font-semibold text-signal">100%</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section id="recursos" aria-labelledby="recursos-titulo" className="space-y-5">
        <h2 id="recursos-titulo" className="font-heading text-xl font-semibold tracking-tight">Recursos do MVP</h2>
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
