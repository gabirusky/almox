import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getErrorMessage } from "@/modules/shared/errors"
import { formatQuantity } from "@/modules/shared/formatters"
import { reverseMovement } from "../services/catalog-api"
import type { StockMovement } from "../types"

export function ReversalAction({ movement, unit }: { movement: StockMovement; unit: string }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null)
  const [done, setDone] = useState(false)
  const key = useRef(crypto.randomUUID())
  const inFlight = useRef(false)
  const fieldId = useId()
  const titleId = useId()
  const descId = useId()

  const mutation = useMutation({
    mutationFn: () => reverseMovement({ movementId: movement.id, reason, operationKey: key.current }),
    retry: false,
    onSuccess: (result) => {
      setDone(true)
      setOpen(false)
      setReason("")
      setFeedback({ type: "success", text: `Estorno ${result.movement_id} confirmado. Saldo após a operação: ${formatQuantity(result.balance, unit)}.` })
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] }),
      ]).catch(() => setFeedback({ type: "success", text: `Estorno ${result.movement_id} confirmado. Recarregue o histórico para consultar o saldo atual.` }))
    },
    onError: (error) => {
      setFeedback({ type: "danger", text: getErrorMessage(error, "Não foi possível confirmar o resultado. Tente novamente com a mesma justificativa para verificar este estorno.") })
    },
    onSettled: () => { inFlight.current = false },
  })

  function submit() {
    const trimmed = reason.trim()
    if (inFlight.current || !trimmed) return
    if (!window.confirm(`Estornar integralmente o lançamento ${movement.id}?\nVariação original: ${movement.delta} ${unit}. O efeito será invertido.\nJustificativa: ${trimmed}\nO registro original será preservado.`)) return
    inFlight.current = true
    mutation.mutate()
  }

  if (done) return feedback ? <Alert variant={feedback.type}>{feedback.text}</Alert> : null

  return (
    <div className="space-y-2">
      {feedback ? <Alert variant={feedback.type}>{feedback.text}</Alert> : null}
      <Button type="button" size="sm" variant="outline" onClick={() => { setOpen(true); setFeedback(null) }}>Estornar</Button>
      <Dialog open={open} onOpenChange={(v) => { if (!mutation.isPending) setOpen(v) }}>
        <DialogContent labelledBy={titleId} describedBy={descId}>
          <DialogHeader>
            <DialogTitle id={titleId}>Estornar movimentação</DialogTitle>
            <DialogDescription id={descId}>O estorno é integral e gera uma nova movimentação com variação inversa. O registro original será preservado e vinculado.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit() }}>
            <div className="rounded-md border border-line bg-bg p-3 font-mono text-xs text-ink">
              <div><span className="text-muted">Lançamento:</span> {movement.id}</div>
              <div><span className="text-muted">Versão:</span> {movement.product_version}</div>
              <div><span className="text-muted">Variação original:</span> {formatQuantity(movement.delta, unit)}</div>
              <div><span className="text-muted">Efeito:</span> inversão integral da variação</div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={fieldId}>Justificativa</Label>
              <Textarea id={fieldId} required maxLength={500} value={reason} disabled={mutation.isPending} aria-describedby={`${fieldId}-help`} onChange={(e) => { setReason(e.target.value); key.current = crypto.randomUUID(); setFeedback(null) }} placeholder="Descreva o motivo do estorno" />
              <p id={`${fieldId}-help`} className="text-xs text-muted">Se houver falha de conexão, tente novamente com a mesma justificativa. Após o estorno, registre um novo lançamento correto se necessário.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="destructive" disabled={mutation.isPending || !reason.trim()}>{mutation.isPending ? "Registrando..." : "Confirmar estorno"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
