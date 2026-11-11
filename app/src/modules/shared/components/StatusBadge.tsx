import { Badge } from "@/components/ui/badge"

export function ProductStatusBadge({ active, balance }: { active: boolean; balance: number }) {
  if (!active) return <Badge variant="muted">Inativo</Badge>
  if (balance <= 0) return <Badge variant="warning">Sem saldo</Badge>
  return <Badge variant="success">Ativo</Badge>
}

export function ActiveBadge({ active, inactiveLabel = "Inativo", activeLabel = "Ativo" }: { active: boolean; inactiveLabel?: string; activeLabel?: string }) {
  return active ? <Badge variant="success">{activeLabel}</Badge> : <Badge variant="muted">{inactiveLabel}</Badge>
}

export function MovementKindBadge({ kind }: { kind: string }) {
  const labels: Record<string, string> = { ENTRADA: "Entrada", SAIDA: "Saída", ABERTURA: "Abertura", AJUSTE: "Ajuste", ESTORNO: "Estorno" }
  const variant = kind === "ENTRADA" ? "success" : kind === "SAIDA" ? "warning" : kind === "ESTORNO" ? "signal" : "default"
  return <Badge variant={variant as any}>{labels[kind] ?? kind}</Badge>
}
