import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function FormField({ id, label, hint, error, children, className }: { id?: string; label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  const hintId = id && hint ? `${id}-hint` : undefined
  const errorId = id && error ? `${id}-error` : undefined
  return (
    <div className={cn("space-y-1.5", className)}>
      {id ? <Label htmlFor={id}>{label}</Label> : <Label>{label}</Label>}
      {children}
      {hint && !error ? <p id={hintId} className="text-xs text-muted">{hint}</p> : null}
      {error ? <p id={errorId} className="text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  )
}
