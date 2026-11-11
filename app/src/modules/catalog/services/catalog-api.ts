import { supabase } from "@/lib/supabase";
import { isOfflineMode } from "@/lib/mock-mode";
import { mockApi } from "@/lib/mock-store";
import type { Category, Department, MovementLogFilters, MovementSearchFilters, MovementSearchResult, PaginatedMovements, PaginatedProducts, Product, ProductFormValues, ProductHistory, ProductListFilters, ReversalResult, StockAdjustmentResult, StockMovement } from "../types";

async function fetchReversedBy(ids: string[]) {
  if (ids.length === 0) return {} as Record<string, string>;
  const { data, error } = await supabase.from("stock_movements").select("id,reversal_of").in("reversal_of", ids);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.reversal_of as string] = row.id as string;
  return map;
}

export async function listCategories() {
  if (isOfflineMode()) return mockApi.listCategories();
  const { data, error } = await supabase.from("categories").select("*").order("active", { ascending: false }).order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function saveCategory(input: { id?: string; name: string; active?: boolean }) {
  if (isOfflineMode()) { mockApi.saveCategory(input); return; }
  if (input.id) {
    const payload: { name: string; active?: boolean } = { name: input.name };
    if (input.active !== undefined) payload.active = input.active;
    const { error } = await supabase.from("categories").update(payload).eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("categories").insert({ name: input.name, active: true });
  if (error) throw error;
}

export async function setCategoryActive(id: string, active: boolean) {
  if (isOfflineMode()) { mockApi.setCategoryActive(id, active); return; }
  const { error } = await supabase.from("categories").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function listDepartments() {
  if (isOfflineMode()) return mockApi.listDepartments();
  const { data, error } = await supabase.from("departments").select("*").order("active", { ascending: false }).order("name");
  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function saveDepartment(input: { id?: string; name: string; active?: boolean }) {
  if (isOfflineMode()) { mockApi.saveDepartment(input); return; }
  if (input.id) {
    const payload: { name: string; active?: boolean } = { name: input.name };
    if (input.active !== undefined) payload.active = input.active;
    const { error } = await supabase.from("departments").update(payload).eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("departments").insert({ name: input.name, active: true });
  if (error) throw error;
}

export async function setDepartmentActive(id: string, active: boolean) {
  if (isOfflineMode()) { mockApi.setDepartmentActive(id, active); return; }
  const { error } = await supabase.from("departments").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function listProducts(filters: ProductListFilters = {}): Promise<PaginatedProducts> {
  if (isOfflineMode()) return mockApi.listProducts(filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));
  const sort = filters.sort ?? "name";
  const direction = filters.direction ?? "asc";
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*, categories(id,name,active), stock_balances(product_id,quantity,version,updated_at)", { count: "exact" })
    .order(sort, { ascending: direction === "asc" })
    .order("id", { ascending: true })
    .range(from, to);
  const term = filters.search?.trim();
  if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.situation === "active") query = query.eq("active", true);
  if (filters.situation === "inactive") query = query.eq("active", false);
  if (filters.situation === "zero_balance") query = query.lte("stock_balances.quantity", 0);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    items: (data ?? []) as Product[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

const productSelect = "*, categories(id,name,active), stock_balances(product_id,quantity,version,updated_at)";

export async function getProduct(productId: string): Promise<Product> {
  if (isOfflineMode()) return mockApi.getProduct(productId);
  const { data, error } = await supabase.from("products").select(productSelect).eq("id", productId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("PRODUCT_NOT_FOUND");
  return data as Product;
}

export async function getProductHistory(productId: string, page = 1, pageSize = 10): Promise<ProductHistory> {
  if (isOfflineMode()) return mockApi.getProductHistory(productId, page, pageSize);
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const [product, movements] = await Promise.all([
    getProduct(productId),
    supabase
      .from("stock_movements")
      .select("*", { count: "exact" })
      .eq("product_id", productId)
      .order("product_version", { ascending: true })
      .order("recorded_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  ]);
  if (movements.error) throw movements.error;
  const ids = (movements.data ?? []).map((movement) => movement.id as string);
  const reversedBy = await fetchReversedBy(ids);
  return {
    reversedBy,
    product,
    movements: (movements.data ?? []) as StockMovement[],
    total: movements.count ?? 0,
    page: safePage,
    pageSize: safePageSize,
  };
}

function movementDateBound(value: string | undefined, endOfDay: boolean) {
  if (!value) return undefined;
  if (value.includes("T")) return value;
  return `${value}${endOfDay ? "T23:59:59.999" : "T00:00:00.000"}`;
}

export async function listMovements(filters: MovementLogFilters = {}): Promise<PaginatedMovements> {
  if (isOfflineMode()) return mockApi.listMovements(filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("stock_movements")
    .select("*, products(id,sku,name,unit,active)", { count: "exact" })
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (filters.productId) query = query.eq("product_id", filters.productId);
  if (filters.kind && filters.kind !== "all") query = query.eq("kind", filters.kind);
  if (filters.actorId) query = query.eq("actor_id", filters.actorId);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  const dateFrom = movementDateBound(filters.dateFrom, false);
  const dateTo = movementDateBound(filters.dateTo, true);
  if (dateFrom) query = query.gte("recorded_at", dateFrom);
  if (dateTo) query = query.lte("recorded_at", dateTo);

  const { data, error, count } = await query;
  if (error) throw error;
  const items = (data ?? []) as unknown as PaginatedMovements["items"];
  const ids = items.map((movement) => movement.id);
  const reversedBy = await fetchReversedBy(ids);
  return { items, total: count ?? 0, page, pageSize, reversedBy };
}

export async function registerEntry(input: {
  productId: string;
  quantity: string;
  origin: string;
  reason: string;
  documentRef?: string;
  operationKey: string;
}) {
  if (isOfflineMode()) return mockApi.registerEntry(input);
  const { data, error } = await supabase.rpc("almox_register_entry", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_origin: input.origin,
    p_reason: input.reason,
    p_document_ref: input.documentRef || null,
    p_operation_key: input.operationKey,
  });
  if (error) throw error;
  return data as { product_id: string; quantity: number | string; balance: number | string; version: number; kind: "ENTRADA" };
}

export async function reverseMovement(input: { movementId: string; reason: string; operationKey: string }): Promise<ReversalResult> {
  if (isOfflineMode()) return mockApi.reverseMovement(input);
  const { data, error } = await supabase.rpc("almox_reverse_movement", {
    p_movement_id: input.movementId,
    p_reason: input.reason.trim(),
    p_operation_key: input.operationKey,
  });
  if (error) throw error;
  return data as ReversalResult;
}

export async function adjustStockByCount(input: {
  productId: string;
  countedQuantity: string;
  expectedVersion: number;
  reason: string;
  operationKey: string;
}): Promise<StockAdjustmentResult> {
  const { data, error } = await supabase.rpc("almox_adjust_stock_by_count", {
    p_product_id: input.productId,
    p_counted_quantity: input.countedQuantity,
    p_expected_version: input.expectedVersion,
    p_reason: input.reason.trim(),
    p_operation_key: input.operationKey,
  });
  if (error) throw error;
  return data as StockAdjustmentResult;
}

export async function searchStockMovements(filters: MovementSearchFilters): Promise<MovementSearchResult> {
  const { data, error } = await supabase.rpc("almox_search_stock_movements", {
    p_from: filters.from ?? null,
    p_to_exclusive: filters.toExclusive ?? null,
    p_product: filters.product || null,
    p_kind: filters.kind || null,
    p_actor: filters.actor || null,
    p_department: filters.department || null,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  });
  if (error) throw error;
  return data as MovementSearchResult;
}

export async function registerExit(input: {
  productId: string;
  quantity: string;
  departmentId: string;
  recipientRef: string;
  reason: string;
  operationKey: string;
}) {
  if (isOfflineMode()) return mockApi.registerExit(input);
  const { data, error } = await supabase.rpc("almox_register_exit", {
    p_product_id: input.productId,
    p_quantity: input.quantity,
    p_department_id: input.departmentId,
    p_recipient_ref: input.recipientRef,
    p_reason: input.reason,
    p_operation_key: input.operationKey,
  });
  if (error) throw error;
  return data as { movement_id: string; product_id: string; quantity: number | string; balance: number | string; version: number; kind: "SAIDA" };
}

export async function createProduct(values: ProductFormValues) {
  if (isOfflineMode()) { mockApi.createProduct(values); return; }
  const { error } = await supabase.rpc("almox_create_product", {
    p_sku: values.sku,
    p_name: values.name,
    p_description: values.description || null,
    p_category_id: values.category_id,
    p_unit: values.unit,
    p_minimum_stock: values.minimum_stock,
    p_location: values.location || null,
  });
  if (error) throw error;
}

export async function updateProduct(id: string, values: ProductFormValues) {
  if (isOfflineMode()) { mockApi.updateProduct(id, values); return; }
  const { error } = await supabase
    .from("products")
    .update({
      sku: values.sku,
      name: values.name,
      description: values.description || null,
      category_id: values.category_id,
      unit: values.unit,
      minimum_stock: values.minimum_stock,
      location: values.location || null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function setProductActive(id: string, active: boolean) {
  if (isOfflineMode()) { mockApi.setProductActive(id, active); return; }
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

export function balanceQuantity(product: Product): number {
  const sb = Array.isArray(product.stock_balances) ? product.stock_balances[0] : product.stock_balances;
  if (!sb) return 0;
  const n = typeof sb.quantity === "string" ? Number(sb.quantity) : sb.quantity;
  return Number.isFinite(n) ? n : 0;
}
