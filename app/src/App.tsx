import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router"
import { AuthProvider } from "@/modules/access/auth-context"
import { useAuth } from "@/modules/access/use-auth"
import { PublicOnly, RequireAuth, RequireRole } from "@/modules/access/guards"
import { InactiveAccessPage, MisconfiguredPage } from "@/modules/access/pages/AccessStatusPages"
import { AuthExperience } from "@/modules/access/components/AuthExperience"
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
import { AuditPage } from "@/modules/audit/AuditPage"

const queryClient = new QueryClient()

/**
 * Layout das rotas públicas de acesso. Mantém a experiência compartilhada
 * (landing ⇄ login) montada nas duas URLs, para que a transição anime o
 * mesmo card e o mesmo logo — sem remontar a interface e sem reload.
 */
function AuthLayout() {
  const { status } = useAuth()
  const location = useLocation()
  // Landing pública (anônimo/misconfigured); demais casos seguem o Outlet.
  const naLanding = location.pathname === "/" && (status === "anonymous" || status === "misconfigured")
  // Tela de login para qualquer visitante sem sessão ativa (inclusive inativo).
  const noLogin = location.pathname === "/login" && status !== "loading" && status !== "authenticated"

  if (naLanding || noLogin) {
    return <AuthExperience view={location.pathname === "/login" ? "login" : "landing"} />
  }
  return <Outlet />
}

function HomeRoute() {
  const { status } = useAuth()
  if (status === "loading") return <LoadingSkeleton lines={3} />
  if (status === "authenticated") return <DashboardPage />
  if (status === "inactive") return <Navigate to="/acesso-inativo" replace />
  // Landing público: renderizado pela AuthLayout (experiência compartilhada).
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppShell>
            <Routes>
              {/* Landing e login compartilham a mesma experiência animada. */}
              <Route element={<AuthLayout />}>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/login" element={<PublicOnly><LoadingSkeleton lines={2} className="mx-auto max-w-md" /></PublicOnly>} />
              </Route>
              <Route path="/painel" element={<Navigate to="/" replace />} />
              <Route path="/app" element={<Navigate to="/" replace />} />
              <Route path="/configuracao" element={<MisconfiguredPage />} />
              <Route path="/acesso-inativo" element={<InactiveAccessPage />} />
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
