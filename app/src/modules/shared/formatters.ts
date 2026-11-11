import type { MovementKind } from "@/modules/catalog/types"

const movementLabels: Record<MovementKind, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  ABERTURA: "Abertura",
  AJUSTE: "Ajuste",
  ESTORNO: "Estorno",
}

export function formatMovementKind(kind: MovementKind) {
  return movementLabels[kind] ?? kind
}

export function formatQuantity(value: number | string, unit?: string) {
  const n = typeof value === "string" ? Number(value) : value
  const q = Number.isFinite(n) ? n : value
  return unit ? `${q} ${unit}` : String(q)
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(d)
}

export function shortId(id: string | null | undefined) {
  if (!id) return "—"
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}
