import { Alert } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function LoadingSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-lg border border-line bg-surface p-4", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando...</span>
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className={cn("h-4", i === 0 ? "w-1/3" : "w-full")} />)}
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center">
      <h3 className="font-heading text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ title = "Não foi possível carregar", message, action }: { title?: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
      <h3 className="font-heading text-sm font-semibold text-danger">{title}</h3>
      <p className="mt-1 text-sm text-ink" role="alert">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function FeedbackAlert({ variant = "default", children }: { variant?: "default" | "success" | "warning" | "danger"; children: React.ReactNode }) {
  return <Alert variant={variant}>{children}</Alert>
}
