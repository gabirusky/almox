export interface Category {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductUnit = "UN" | "CX" | "KG" | "L" | "M";

export interface StockBalance {
  product_id: string;
  quantity: number | string;
  version: number;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string;
  unit: ProductUnit;
  minimum_stock: number | string;
  location: string | null;
  active: boolean;
  first_movement_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: Pick<Category, "id" | "name" | "active"> | null;
  stock_balances?: StockBalance | StockBalance[] | null;
}

export interface ProductFormValues {
  sku: string;
  name: string;
  description: string;
  category_id: string;
  unit: ProductUnit;
  minimum_stock: number;
  location: string;
}

export type ProductSituation = "all" | "active" | "inactive" | "zero_balance";
export type ProductSort = "name" | "sku" | "updated_at" | "active";

export interface ProductListFilters {
  search?: string;
  categoryId?: string;
  situation?: ProductSituation;
  page?: number;
  pageSize?: number;
  sort?: ProductSort;
  direction?: "asc" | "desc";
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export type MovementKind = "ENTRADA" | "SAIDA" | "ABERTURA" | "AJUSTE" | "ESTORNO";

export interface StockMovement {
  id: string;
  product_id: string;
  actor_id: string | null;
  kind: MovementKind;
  delta: number | string;
  balance_before: number | string;
  balance_after: number | string;
  product_version: number;
  reason: string;
  origin: string | null;
  department_id: string | null;
  recipient_ref: string | null;
  document_ref: string | null;
  reversal_of: string | null;
  recorded_at: string;
  snapshots: {
    sku?: string;
    name?: string;
    unit?: ProductUnit;
    actor_name?: string;
    department_name?: string;
  };
}

export interface ProductHistory {
  reversedBy: Record<string, string>;
  product: Product;
  movements: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ReversalResult {
  movement_id: string;
  reversal_of: string;
  product_id: string;
  delta: string;
  balance: string;
  version: number;
  kind: "ESTORNO";
}

export interface MovementLogFilters {
  page?: number;
  pageSize?: number;
  productId?: string;
  kind?: MovementKind | "all";
  actorId?: string;
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface MovementLogItem extends StockMovement {
  products?: Pick<Product, "id" | "sku" | "name" | "unit" | "active"> | null;
}

export interface PaginatedMovements {
  items: MovementLogItem[];
  total: number;
  page: number;
  pageSize: number;
  reversedBy: Record<string, string>;
}

export interface StockAdjustmentResult {
  movement_id: string;
  product_id: string;
  delta: string;
  balance: string;
  version: number;
  kind: "AJUSTE";
}

export interface MovementSearchFilters {
  from: string | null;
  toExclusive: string | null;
  product: string;
  kind: MovementKind | "";
  actor: string;
  department: string;
  page: number;
  pageSize: number;
}

export interface SearchableStockMovement extends StockMovement {
  product_sku: string;
  product_name: string;
  product_unit: ProductUnit;
  reversed_by: string | null;
}

export interface MovementSearchResult {
  items: SearchableStockMovement[];
  total: number;
  page: number;
  page_size: number;
}
