import type { AlmoxRole } from "@/modules/access/types"
import type { MovementKind, ProductUnit } from "@/modules/catalog/types"

// RF14 — painel
export interface StockAlert {
  id: string
  sku: string
  name: string
  unit: ProductUnit
  location: string | null
  category_name: string | null
  quantity: number | string
  minimum_stock: number | string
  updated_at: string
}

export interface DashboardSummary {
  generated_at: string
  counts: {
    active_products: number
    inactive_products: number
    zero_balance: number
    at_or_below_minimum: number
    below_minimum_with_stock: number
  }
  alerts: StockAlert[]
  activity: {
    last_7_days: number
    entries_7_days: number
    exits_7_days: number
    corrections_7_days: number
    last_movement_at: string | null
  }
}

// RF15 — exportação
export type BalanceExportSituation = "all" | "active" | "inactive" | "zero_balance" | "at_or_below_minimum"

export interface BalanceExportFilters {
  categoryId?: string
  situation?: BalanceExportSituation
}

export interface MovementExportFilters {
  dateFrom?: string
  dateTo?: string
  productId?: string
  kind?: MovementKind | ""
  actorId?: string
  departmentId?: string
}

export interface BalanceExportRow {
  sku: string
  name: string
  category_name: string | null
  unit: ProductUnit
  quantity: number | string
  minimum_stock: number | string
  location: string | null
  active: boolean
  at_or_below_minimum: boolean
  version: number
  updated_at: string
}

export interface MovementExportRow {
  id: string
  recorded_at: string
  kind: MovementKind
  sku: string | null
  product_name: string | null
  unit: string | null
  delta: number | string
  balance_before: number | string
  balance_after: number | string
  product_version: number
  actor_name: string | null
  origin: string | null
  department_name: string | null
  recipient_ref: string | null
  document_ref: string | null
  reason: string
  reversal_of: string | null
  reversed_by: string | null
}

export interface ExportResult<Row> {
  generated_at: string
  filters: Record<string, unknown>
  row_count: number
  rows: Row[]
}

// RF16 — usuários
export interface ManagedUser {
  id: string
  display_name: string
  email: string | null
  role: AlmoxRole
  active: boolean
  created_at: string
  updated_at: string
  last_sign_in_at: string | null
  invited_at: string | null
}

export type AccessRequestStatus = "pending" | "completed" | "failed"

export interface AccessRequest {
  id: string
  target_email: string
  display_name: string
  role: AlmoxRole
  status: AccessRequestStatus
  error_code: string | null
  auth_user_id: string | null
  created_at: string
}

export interface InviteInput {
  email: string
  displayName: string
  role: AlmoxRole
  operationKey: string
}
