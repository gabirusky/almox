import * as React from "react"
import { cn } from "@/lib/utils"

export function PageHeader({ title, description, actions, back, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; back?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-1">
        {back}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
