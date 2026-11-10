import { supabase } from "@/lib/supabase";
import type { Category, Department, PaginatedProducts, Product, ProductFormValues, ProductListFilters } from "../types";

export async function listCategories() {
  const { data, error } = await supabase.from("categories").select("*").order("active", { ascending: false }).order("name");
  if (error) throw error;
  return (data ?? []) as Category[];
}

export async function saveCategory(input: { id?: string; name: string; active?: boolean }) {
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
  const { error } = await supabase.from("categories").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function listDepartments() {
  const { data, error } = await supabase.from("departments").select("*").order("active", { ascending: false }).order("name");
  if (error) throw error;
  return (data ?? []) as Department[];
}

export async function saveDepartment(input: { id?: string; name: string; active?: boolean }) {
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
  const { error } = await supabase.from("departments").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function listProducts(filters: ProductListFilters = {}): Promise<PaginatedProducts> {
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

export async function createProduct(values: ProductFormValues) {
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
  const { error } = await supabase.from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

export function balanceQuantity(product: Product): number {
  const sb = Array.isArray(product.stock_balances) ? product.stock_balances[0] : product.stock_balances;
  if (!sb) return 0;
  const n = typeof sb.quantity === "string" ? Number(sb.quantity) : sb.quantity;
  return Number.isFinite(n) ? n : 0;
}
