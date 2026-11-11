import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/modules/shared/errors";
import { reverseMovement } from "../services/catalog-api";
import type { StockMovement } from "../types";

export function ReversalAction({ movement, unit }: { movement: StockMovement; unit: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState(false);
  const key = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const mutation = useMutation({
    mutationFn: () => reverseMovement({ movementId: movement.id, reason, operationKey: key.current }),
    retry: false,
    onSuccess: (result) => {
      setDone(true);
      setOpen(false);
      setFeedback(`Estorno ${result.movement_id} confirmado. Saldo após a operação: ${result.balance} ${unit}.`);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["product-history", result.product_id] }),
      ]).catch(() => setFeedback(`Estorno ${result.movement_id} confirmado. Recarregue o histórico para consultar o saldo atual.`));
    },
    onError: (error) => {
      setFeedback(getErrorMessage(error, "Não foi possível confirmar o resultado. Tente novamente com a mesma justificativa para verificar este estorno."));
    },
    onSettled: () => { inFlight.current = false; },
  });
  const fieldId = `reversal-reason-${movement.id}`;
  return <div className="min-w-56 space-y-2">
    {feedback ? <p className="text-sm" role="status">{feedback}</p> : null}
    {!done && !open ? <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>Estornar</Button> : null}
    {open ? <form className="space-y-2 rounded border p-3" onSubmit={(event) => {
      event.preventDefault();
      if (inFlight.current || !reason.trim()) return;
      if (!window.confirm(`Estornar integralmente o lançamento ${movement.id}?\nVariação original: ${movement.delta} ${unit}. O efeito será invertido.\nJustificativa: ${reason.trim()}\nO registro original será preservado.`)) return;
      inFlight.current = true;
      mutation.mutate();
    }}>
      <p className="text-sm">Estorno integral da versão {movement.product_version}. Depois, se necessário, registre um novo lançamento correto.</p>
      <Label htmlFor={fieldId}>Justificativa</Label>
      <Input id={fieldId} required maxLength={500} value={reason} disabled={mutation.isPending} autoFocus aria-describedby={`${fieldId}-help`} onChange={(event) => {
        setReason(event.target.value); key.current = crypto.randomUUID(); setFeedback("");
      }} />
      <p id={`${fieldId}-help`} className="text-xs text-gray-600">Em caso de falha de conexão, tente novamente sem alterar os dados para verificar a mesma operação.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={mutation.isPending || !reason.trim()}>{mutation.isPending ? "Registrando..." : "Confirmar estorno"}</Button>
        <Button type="button" size="sm" variant="outline" disabled={mutation.isPending} onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
    </form> : null}
  </div>;
}
