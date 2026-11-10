import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/modules/access/auth-context";
import { useAuth } from "@/modules/access/use-auth";
import { PublicOnly, RequireAuth } from "@/modules/access/guards";
import { InactiveAccessPage, MisconfiguredPage } from "@/modules/access/pages/AccessStatusPages";
import { LoginPage } from "@/modules/access/pages/LoginPage";
import { RecoverPasswordPage } from "@/modules/access/pages/RecoverPasswordPage";
import { CategoriesPage } from "@/modules/catalog/pages/CategoriesPage";
import { DepartmentsPage } from "@/modules/catalog/pages/DepartmentsPage";
import { ProductsPage } from "@/modules/catalog/pages/ProductsPage";
import { ProductDetailsPage } from "@/modules/catalog/pages/ProductDetailsPage";
import { NewEntryPage } from "@/modules/catalog/pages/NewEntryPage";

const queryClient = new QueryClient();

function Nav() {
  const { status, profile, signOut } = useAuth();
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="/" className="text-lg font-semibold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2">
          ALMOX
        </a>
        <nav aria-label="Principal" className="flex flex-wrap items-center gap-2 text-sm">
          <NavLink to="/" end className={({ isActive }) => `rounded px-2 py-1 ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>Início</NavLink>
          {status === "authenticated" ? (
            <>
              <NavLink to="/produtos" className={({ isActive }) => `rounded px-2 py-1 ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>Produtos</NavLink>
              <NavLink to="/movimentacoes/nova" className={({ isActive }) => `rounded px-2 py-1 ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>Nova entrada</NavLink>
              <NavLink to="/categorias" className={({ isActive }) => `rounded px-2 py-1 ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>Categorias</NavLink>
              <NavLink to="/setores" className={({ isActive }) => `rounded px-2 py-1 ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>Setores</NavLink>
              <span className="hidden px-2 text-gray-600 lg:inline">{profile?.display_name} ({profile?.role})</span>
              <button type="button" className="rounded px-2 py-1 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900" onClick={() => void signOut()}>Sair</button>
            </>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `rounded px-2 py-1 ${isActive ? "bg-gray-900 text-white" : "hover:bg-gray-100"}`}>Entrar</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-white focus:p-2">Ir para o conteúdo</a>
      <Nav />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-6" tabIndex={-1}>{children}</main>
      <Toaster />
    </div>
  );
}

function HomePage() {
  const { status, profile } = useAuth();
  return (
    <section aria-labelledby="home-title" className="space-y-4">
      <h1 id="home-title" className="text-2xl font-semibold">Controle de estoque de almoxarifado</h1>
      {status === "authenticated" ? (
        <p className="text-sm text-gray-700">Sessão ativa: <strong>{profile?.display_name}</strong> ({profile?.role}). Regras críticas são validadas no Supabase (RLS/funções).</p>
      ) : (
        <p className="max-w-2xl text-sm text-gray-700">Acesso protegido (RF01/RF02). Entre para operar conforme seu perfil. Cadastros de catálogo (RF03/RF04) serão habilitados nas próximas tarefas.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm"><h2 className="font-medium">RF01 — Acesso</h2><p className="mt-1 text-sm text-gray-600">Autenticação e sessão.</p></div>
        <div className="rounded-lg border bg-white p-4 shadow-sm"><h2 className="font-medium">RF02 — Permissões</h2><p className="mt-1 text-sm text-gray-600">Perfis admin/funcionário (UI + DB).</p></div>
        <div className="rounded-lg border bg-white p-4 shadow-sm"><h2 className="font-medium">RF03/RF04 — Catálogo</h2><p className="mt-1 text-sm text-gray-600">Produtos, categorias e setores.</p></div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Shell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/configuracao" element={<MisconfiguredPage />} />
              <Route path="/acesso-inativo" element={<InactiveAccessPage />} />
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/recuperar-senha" element={<PublicOnly><RecoverPasswordPage /></PublicOnly>} />
              <Route path="/produtos" element={<RequireAuth><ProductsPage /></RequireAuth>} />
              <Route path="/produtos/:id" element={<RequireAuth><ProductDetailsPage /></RequireAuth>} />
              <Route path="/movimentacoes/nova" element={<RequireAuth><NewEntryPage /></RequireAuth>} />
              <Route path="/categorias" element={<RequireAuth><CategoriesPage /></RequireAuth>} />
              <Route path="/setores" element={<RequireAuth><DepartmentsPage /></RequireAuth>} />
              <Route path="/app" element={<RequireAuth><HomePage /></RequireAuth>} />
            </Routes>
          </Shell>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
