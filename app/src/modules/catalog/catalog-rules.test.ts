import { describe, expect, it } from "vitest";
import { balanceQuantity } from "./services/catalog-api";
import type { Product } from "./types";

const base = {
  id: "1", sku: "S", name: "N", description: null, category_id: "c", unit: "UN", minimum_stock: 0,
  location: null, active: true, first_movement_at: null, created_at: "", updated_at: "",
} satisfies Product;

describe("catalog balance helpers (RF03)", () => {
  it("reads numeric/string/object/array balance shapes", () => {
    expect(balanceQuantity({ ...base, stock_balances: { product_id: "1", quantity: 2, version: 0, updated_at: "" } })).toBe(2);
    expect(balanceQuantity({ ...base, stock_balances: [{ product_id: "1", quantity: "3.000", version: 0, updated_at: "" }] })).toBe(3);
    expect(balanceQuantity({ ...base, stock_balances: null })).toBe(0);
  });
});
