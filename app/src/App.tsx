import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Link, Route, Routes } from "react-router"
import { AuthProvider } from "@/modules/access/auth-context"
import { useAuth } from "@/modules/access/use-auth"
import { PublicOnly, RequireAuth } from "@/modules/access/guards"
import { InactiveAccessPage, MisconfiguredPage } from "@/modules/access/pages/AccessStatusPages"
import { LoginPage } from "@/modules/access/pages/LoginPage"
import { RecoverPasswordPage } from "@/modules/access/pages/RecoverPasswordPage"
import { CategoriesPage } from "@/modules/catalog/pages/CategoriesPage"
import { DepartmentsPage } from "@/modules/catalog/pages/DepartmentsPage"
import { ProductsPage } from "@/modules/catalog/pages/ProductsPage"
import { ProductDetailsPage } from "@/modules/catalog/pages/ProductDetailsPage"
import { NewEntryPage } from "@/modules/catalog/pages/NewEntryPage"
import { NewExitPage } from "@/modules/catalog/pages/NewExitPage"
import { OperationsLogPage } from "@/modules/catalog/pages/OperationsLogPage"
import { AppShell } from "@/modules/shared/components/AppShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import logo from "@/assets/logo_almox.png"

const queryClient = new QueryClient()

function HomePage() {
  const { status, profile } = useAuth()
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4">
        <img src={logo} alt="ALMOX" className="h-14 w-auto sm:h-16" />
        <div>
          <p className="font-mono text-xs text-signal">ALMOX</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">Controle de estoque de almoxarifado</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{status === "authenticated"
            ? `Sessão ativa: ${profile?.display_name} (${profile?.role === "admin" ? "administrador" : "funcionário"}). Regras críticas e autorização são validadas no Supabase.`
            : "Acesso protegido. Entre para consultar produtos, registrar movimentações e operar conforme seu perfil."}</p>
        </div>
      </div>
      {status === "authenticated" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card><CardHeader><CardTitle>Produtos</CardTitle><CardDescription>Consulte saldo, situação e histórico.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to="/produtos">Abrir catálogo</Link></Button></CardContent></Card>
          <Card><CardHeader><CardTitle>Entrada de estoque</CardTitle><CardDescription>Registre reposição com rastreabilidade.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to="/movimentacoes/nova">Registrar entrada</Link></Button></CardContent></Card>
          <Card><CardHeader><CardTitle>Saída de estoque</CardTitle><CardDescription>Registre retirada para setor e recebedor.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to="/movimentacoes/saida">Registrar saída</Link></Button></CardContent></Card>
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-6">
          <p className="text-sm text-muted">Use suas credenciais corporativas para acessar o sistema.</p>
          <div className="mt-4"><Button asChild><Link to="/login">Entrar</Link></Button></div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-4"><p className="font-mono text-xs text-signal">RF01/RF02</p><h2 className="mt-1 font-heading font-semibold">Acesso e permissões</h2><p className="mt-1 text-sm text-muted">Sessão autenticada, perfis e restrições por papel.</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><p className="font-mono text-xs text-signal">RF03–RF06</p><h2 className="mt-1 font-heading font-semibold">Catálogo e histórico</h2><p className="mt-1 text-sm text-muted">Produtos, saldo atual e movimentações auditáveis.</p></div>
        <div className="rounded-lg border border-line bg-surface p-4"><p className="font-mono text-xs text-signal">RF07–RF09</p><h2 className="mt-1 font-heading font-semibold">Operações</h2><p className="mt-1 text-sm text-muted">Entradas, saídas e estornos com integridade no banco.</p></div>
      </div>
    </section>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/configuracao" element={<MisconfiguredPage />} />
              <Route path="/acesso-inativo" element={<InactiveAccessPage />} />
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/recuperar-senha" element={<PublicOnly><RecoverPasswordPage /></PublicOnly>} />
              <Route path="/produtos" element={<RequireAuth><ProductsPage /></RequireAuth>} />
              <Route path="/produtos/:id" element={<RequireAuth><ProductDetailsPage /></RequireAuth>} />
              <Route path="/movimentacoes" element={<RequireAuth><OperationsLogPage /></RequireAuth>} />
              <Route path="/movimentacoes/nova" element={<RequireAuth><NewEntryPage /></RequireAuth>} />
              <Route path="/movimentacoes/saida" element={<RequireAuth><NewExitPage /></RequireAuth>} />
              <Route path="/categorias" element={<RequireAuth><CategoriesPage /></RequireAuth>} />
              <Route path="/setores" element={<RequireAuth><DepartmentsPage /></RequireAuth>} />
              <Route path="/app" element={<RequireAuth><HomePage /></RequireAuth>} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

