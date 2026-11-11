import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"
import { LoadingSkeleton } from "@/modules/shared/components/States"
import { useAuth } from "./use-auth"
import type { AlmoxRole } from "./types"

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === "loading") return <LoadingSkeleton lines={3} className="mx-auto max-w-lg" />
  if (status === "misconfigured") return <Navigate to="/configuracao" replace />
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location }} />
  if (status === "inactive") return <Navigate to="/acesso-inativo" replace />
  return <>{children}</>
}

export function RequireRole({ role, children }: { role: AlmoxRole; children: ReactNode }) {
  const { profile } = useAuth()
  if (!profile || profile.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === "loading") return <LoadingSkeleton lines={2} className="mx-auto max-w-md" />
  if (status === "authenticated") return <Navigate to="/" replace />
  return <>{children}</>
}

