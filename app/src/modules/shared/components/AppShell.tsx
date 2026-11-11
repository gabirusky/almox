import type { ReactNode } from "react"
import { NavLink } from "react-router"
import { Toaster } from "@/components/ui/sonner"
import { useAuth } from "@/modules/access/use-auth"
import { cn } from "@/lib/utils"
import logo from "@/assets/logo_almox.png"

function NavItem({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink to={to} {...(end ? { end: true } : {})} className={({ isActive }) => cn("rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2", isActive ? "bg-ink text-surface" : "text-ink hover:bg-line/40")}>
      {children}
    </NavLink>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, profile, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-bg text-ink">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow">Ir para o conteúdo</a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <NavLink to="/" className="flex items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2">
              <img src={logo} alt="ALMOX" className="h-8 w-auto" />
              <span className="font-heading text-lg font-semibold tracking-tight text-ink">ALMOX</span>
            </NavLink>
            <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
            <span className="hidden font-mono text-xs text-muted sm:block">almoxarifado</span>
          </div>
          <nav aria-label="Principal" className="flex flex-wrap items-center gap-1">
            <NavItem to="/" end>Início</NavItem>
            {status === "authenticated" ? (
              <>
                <NavItem to="/produtos">Produtos</NavItem>
                <NavItem to="/movimentacoes/nova">Entrada</NavItem>
                <NavItem to="/movimentacoes/saida">Saída</NavItem>
                <NavItem to="/categorias">Categorias</NavItem>
                <NavItem to="/setores">Setores</NavItem>
                <span className="hidden px-2 text-xs text-muted lg:inline">{profile?.display_name} · {profile?.role === "admin" ? "admin" : "funcionário"}</span>
                <button type="button" className="rounded-md px-2.5 py-1.5 text-sm font-medium text-ink hover:bg-line/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2" onClick={() => void signOut()}>Sair</button>
              </>
            ) : (
              <NavItem to="/login">Entrar</NavItem>
            )}
          </nav>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8" tabIndex={-1}>{children}</main>
      <Toaster />
    </div>
  )
}
