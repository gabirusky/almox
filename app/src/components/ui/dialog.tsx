import * as React from "react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false) }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev }
  }, [open, onOpenChange])
  if (!open) return null
  return <>{children}</>
}

function DialogContent({ className, children, labelledBy, describedBy }: { className?: string; children: React.ReactNode; labelledBy?: string; describedBy?: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const prev = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((n) => !n.hasAttribute("disabled"))
    focusables()[0]?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return
      const nodes = focusables()
      if (nodes.length === 0) return
      const first = nodes[0], last = nodes[nodes.length - 1]
      if (!first || !last) return
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", trap)
    return () => { document.removeEventListener("keydown", trap); prev?.focus?.() }
  }, [])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} className={cn("w-full max-w-lg rounded-lg border border-line bg-surface p-5 shadow-lg", className)}>
        {children}
      </div>
    </div>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1.5", className)} {...props} />
}
function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-lg font-semibold leading-none font-heading", className)} {...props} />
}
function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm text-muted", className)} {...props} />
}
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
}

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
