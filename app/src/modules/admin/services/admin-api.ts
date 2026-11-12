import { supabase } from "@/lib/supabase"
import { isOfflineMode } from "@/lib/mock-mode"
import { mockApi } from "@/lib/mock-store"
import type { AlmoxRole } from "@/modules/access/types"
import type {
  AccessRequest,
  BalanceExportFilters,
  BalanceExportRow,
  DashboardSummary,
  ExportResult,
  InviteInput,
  ManagedUser,
  MovementExportFilters,
  MovementExportRow,
} from "../types"

// Converte datas locais (yyyy-mm-dd) em limites ISO [início, fim exclusivo).
export function dateRangeToIso(dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
  let toExclusive: Date | null = null
  if (dateTo) {
    toExclusive = new Date(`${dateTo}T00:00:00`)
    toExclusive.setDate(toExclusive.getDate() + 1)
  }
  return {
    from: from && !Number.isNaN(from.getTime()) ? from.toISOString() : null,
    toExclusive: toExclusive && !Number.isNaN(toExclusive.getTime()) ? toExclusive.toISOString() : null,
  }
}

// RF14
export async function getDashboardSummary(alertLimit = 20): Promise<DashboardSummary> {
  if (isOfflineMode()) return mockApi.dashboardSummary(alertLimit)
  const { data, error } = await supabase.rpc("almox_dashboard_summary", { p_alert_limit: alertLimit })
  if (error) throw error
  return data as DashboardSummary
}

// RF15
export async function exportBalances(filters: BalanceExportFilters): Promise<ExportResult<BalanceExportRow>> {
  if (isOfflineMode()) return mockApi.exportBalances(filters)
  const { data, error } = await supabase.rpc("almox_export_stock_balances", {
    p_category_id: filters.categoryId || null,
    p_situation: filters.situation ?? "all",
  })
  if (error) throw error
  return data as ExportResult<BalanceExportRow>
}

export async function exportMovements(filters: MovementExportFilters): Promise<ExportResult<MovementExportRow>> {
  const range = dateRangeToIso(filters.dateFrom, filters.dateTo)
  if (range.from && range.toExclusive && range.toExclusive <= range.from) throw new Error("MOVEMENT_DATE_RANGE_INVALID")
  if (isOfflineMode()) return mockApi.exportMovements({ ...filters, ...range })
  const { data, error } = await supabase.rpc("almox_export_stock_movements", {
    p_from: range.from,
    p_to_exclusive: range.toExclusive,
    p_product_id: filters.productId || null,
    p_kind: filters.kind || null,
    p_actor_id: filters.actorId || null,
    p_department_id: filters.departmentId || null,
  })
  if (error) throw error
  return data as ExportResult<MovementExportRow>
}

// RF16
export async function listUsers(): Promise<ManagedUser[]> {
  if (isOfflineMode()) return mockApi.listUsers()
  const { data, error } = await supabase.rpc("almox_list_users")
  if (error) throw error
  return (data ?? []) as ManagedUser[]
}

export async function setUserRole(userId: string, role: AlmoxRole) {
  if (isOfflineMode()) return mockApi.setUserRole(userId, role)
  const { data, error } = await supabase.rpc("almox_set_user_role", { p_user_id: userId, p_role: role })
  if (error) throw error
  return data as { id: string; role: AlmoxRole; active: boolean; changed: boolean }
}

export async function setUserActive(userId: string, active: boolean) {
  if (isOfflineMode()) return mockApi.setUserActive(userId, active)
  const { data, error } = await supabase.rpc("almox_set_user_active", { p_user_id: userId, p_active: active })
  if (error) throw error
  return data as { id: string; role: AlmoxRole; active: boolean; changed: boolean }
}

export async function listAccessRequests(): Promise<AccessRequest[]> {
  if (isOfflineMode()) return mockApi.listAccessRequests()
  const { data, error } = await supabase
    .from("access_requests")
    .select("id,target_email,display_name,role,status,error_code,auth_user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []) as AccessRequest[]
}

export async function inviteUser(input: InviteInput): Promise<AccessRequest> {
  if (isOfflineMode()) return mockApi.inviteUser(input)
  const { data, error } = await supabase.functions.invoke("admin-invite", {
    body: {
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      role: input.role,
      operationKey: input.operationKey,
      redirectTo: `${window.location.origin}/definir-senha`,
    },
  })
  if (error) {
    let code = error.message
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === "function") {
      const body = (await ctx.json().catch(() => null)) as { code?: string } | null
      if (body?.code) code = body.code
    }
    throw new Error(code)
  }
  const request = (data as { request: AccessRequest }).request
  if (request.status === "failed") throw new Error(request.error_code ?? "INVITE_FAILED")
  return request
}
