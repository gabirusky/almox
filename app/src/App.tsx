import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, NavLink, Route, Routes } from "react-router";
import { Toaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <a
            href="/"
            className="text-lg font-semibold tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
          >
            ALMOX
          </a>
          <nav aria-label="Principal" className="flex items-center gap-3 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`
              }
              end
            >
              Início
            </NavLink>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `rounded px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 ${isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`
              }
            >
              Entrar
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      <Toaster />
    </div>
  );
}

function HomePage() {
  return (
    <section aria-labelledby="home-title" className="space-y-4">
      <h1 id="home-title" className="text-2xl font-semibold">
        Controle de estoque de almoxarifado
      </h1>
      <p className="max-w-2xl text-sm text-gray-700">
        Base do aplicativo (RF01–RF04): autenticação, perfis, catálogo de
        produtos, categorias e setores. Configure as variáveis do Supabase em{" "}
        <code className="rounded bg-gray-100 px-1 py-0.5">.env.local</code>{" "}
        a partir de <code className="rounded bg-gray-100 px-1 py-0.5">.env.example</code>.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-medium">RF01 — Acesso</h2>
          <p className="mt-1 text-sm text-gray-600">Login, sessão e recuperação.</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-medium">RF02 — Permissões</h2>
          <p className="mt-1 text-sm text-gray-600">Perfis admin e funcionário.</p>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="font-medium">RF03/RF04 — Catálogo</h2>
          <p className="mt-1 text-sm text-gray-600">Produtos, categorias e setores.</p>
        </div>
      </div>
    </section>
  );
}

function LoginPlaceholder() {
  return (
    <section aria-labelledby="login-title" className="max-w-md space-y-3">
      <h1 id="login-title" className="text-2xl font-semibold">
        Entrar
      </h1>
      <p className="text-sm text-gray-700">
        Tela de autenticação será implementada nas tarefas RF01 (módulo de
        acesso).
      </p>
    </section>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPlaceholder />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
