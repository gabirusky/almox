import { useState, type ReactNode } from "react"
import { NavLink, useLocation } from "react-router"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  ScrollText,
  Tags,
  Users,
  X,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Toaster } from "@/components/ui/sonner"
import { Button } from "@/components/ui/button"
import { isOfflineMode } from "@/lib/mock-mode"
import { cn } from "@/lib/utils"
import { useAuth } from "@/modules/access/use-auth"
import logo from "@/assets/logo_almox.png"

type NavEntry = { to: string; label: string; icon: LucideIcon; end?: boolean; admin?: boolean }

const groups: Array<{ title: string; items: NavEntry[] }> = [
  { title: "Visão geral", items: [{ to: "/", label: "Painel", icon: LayoutDashboard, end: true }] },
  {
    title: "Estoque",
    items: [
      { to: "/produtos", label: "Produtos", icon: Boxes },
      { to: "/movimentacoes", label: "Operações", icon: ScrollText, end: true },
      { to: "/movimentacoes/nova", label: "Entrada", icon: ArrowDownToLine },
      { to: "/movimentacoes/saida", label: "Saída", icon: ArrowUpFromLine },
      { to: "/movimentacoes/ajuste", label: "Contagem física", icon: ClipboardCheck, admin: true },
    ],
  },
  {
    title: "Cadastros",
    items: [
      { to: "/categorias", label: "Categorias", icon: Tags },
      { to: "/setores", label: "Setores", icon: Building2 },
    ],
  },
  {
    title: "Administração",
    items: [
      { to: "/relatorios", label: "Relatórios CSV", icon: FileSpreadsheet, admin: true },
      { to: "/usuarios", label: "Usuários", icon: Users, admin: true },
    ],
  },
]

function SideNavItem({ item }: { item: NavEntry }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      {...(item.end ? { end: true } : {})}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2",
        isActive ? "bg-ink text-surface shadow-sm" : "text-ink/80 hover:bg-line/40 hover:text-ink",
      )}
    >
      {({ isActive }) => (
        <>
          <Icon className={cn("size-4 shrink-0", isActive ? "text-surface" : "text-muted group-hover:text-signal")} aria-hidden="true" />
          <span>{item.label}</span>
          {isActive ? <span className="absolute inset-y-1.5 -left-3 w-1 rounded-r bg-signal" aria-hidden="true" /> : null}
        </>
      )}
    </NavLink>
  )
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2">
      <img src={logo} alt="" className="h-9 w-auto" />
      <span className="leading-tight">
        <span className="block font-heading text-lg font-semibold tracking-tight text-ink">ALMOX</span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">almoxarifado</span>
      </span>
    </NavLink>
  )
}

function ModeBadge() {
  if (!isOfflineMode()) return null
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/30 bg-warn/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-warn"><span className="size-1.5 rounded-full bg-warn" aria-hidden="true" />demo offline</span>
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, profile, signOut } = useAuth()
  const location = useLocation()
  // O menu fica aberto apenas na rota em que foi aberto: navegar o fecha sem efeito colateral.
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const menuOpen = menuPath === location.pathname
  const setMenuOpen = (open: boolean | ((v: boolean) => boolean)) => {
    const next = typeof open === "function" ? open(menuOpen) : open
    setMenuPath(next ? location.pathname : null)
  }
  const isAdmin = profile?.role === "admin"
  const authed = status === "authenticated"

  const skipLink = <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow">Ir para o conteúdo</a>

  if (!authed) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        {skipLink}
        <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Brand />
            <div className="flex items-center gap-3">
              <ModeBadge />
              {location.pathname !== "/login" ? <Button asChild size="sm"><NavLink to="/login"><LogIn />Entrar</NavLink></Button> : null}
            </div>
          </div>
        </header>
        <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12" tabIndex={-1}>{children}</main>
        <Toaster />
      </div>
    )
  }

  const nav = (
    <nav aria-label="Principal" className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((group) => {
        const items = group.items.filter((i) => !i.admin || isAdmin)
        if (items.length === 0) return null
        return (
          <div key={group.title} className="space-y-1 pl-3">
            <p className="px-3 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{group.title}</p>
            {items.map((item) => <SideNavItem key={item.to} item={item} />)}
          </div>
        )
      })}
    </nav>
  )

  const userCard = (
    <div className="border-t border-line p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-signal font-heading text-xs font-semibold text-white" aria-hidden="true">
          {(profile?.display_name ?? "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{profile?.display_name}</p>
          <p className="text-xs text-muted">{isAdmin ? "Administrador" : "Funcionário"}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => void signOut()} aria-label="Sair" title="Sair"><LogOut /></Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg text-ink lg:grid lg:grid-cols-[16rem_1fr]">
      {skipLink}
      {/* Barra lateral (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface lg:flex" aria-label="Navegação">
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4"><Brand /></div>
        <div className="px-5 pt-3"><ModeBadge /></div>
        {nav}
        {userCard}
      </aside>

      {/* Barra superior (mobile/tablet) */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Brand />
        <div className="flex items-center gap-2">
          <ModeBadge />
          <Button type="button" variant="outline" size="icon-sm" aria-expanded={menuOpen} aria-controls="menu-mobile" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div id="menu-mobile" className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface pt-14 shadow-xl">
            {nav}
            {userCard}
          </div>
        </div>
      ) : null}

      <main id="conteudo" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8" tabIndex={-1}>
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      <Toaster />
    </div>
  )
}
