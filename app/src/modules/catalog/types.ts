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
