import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  pending,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  pending?: boolean
  onConfirm: () => void | Promise<void>
  children?: React.ReactNode
}) {
  const titleId = React.useId()
  const descId = React.useId()
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!pending) onOpenChange(v) }}>
      <DialogContent labelledBy={titleId} {...(description ? { describedBy: descId } : {})}>
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
          {description ? <DialogDescription id={descId}>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{cancelLabel}</Button>
          <Button type="button" variant={variant === "destructive" ? "destructive" : "default"} disabled={pending} onClick={() => void onConfirm()}>
            {pending ? "Processando..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmAction({
  title,
  description,
  confirmLabel,
  onConfirm,
  triggerLabel,
  variant = "secondary",
  disabled,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<void> | void
  triggerLabel: string
  variant?: "secondary" | "destructive" | "outline"
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  return (
    <>
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)} disabled={disabled}>{triggerLabel}</Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        pending={pending}
        variant={variant === "destructive" ? "destructive" : "default"}
        onConfirm={async () => {
          setPending(true)
          try { await onConfirm(); setOpen(false) } finally { setPending(false) }
        }}
      />
    </>
  )
}
