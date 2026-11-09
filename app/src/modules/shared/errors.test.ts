import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errors";

describe("getErrorMessage (RF03/RF04 domain feedback)", () => {
  it("maps RN15 category/product inactivation errors to PT-BR", () => {
    expect(getErrorMessage({ message: "CATEGORY_HAS_ACTIVE_PRODUCTS" }, "x")).toContain("produtos ativos");
    expect(getErrorMessage({ message: "PRODUCT_INACTIVATION_REQUIRES_ZERO_BALANCE" }, "x")).toContain("saldo");
  });

  it("maps SKU uniqueness and permission errors", () => {
    expect(getErrorMessage({ message: 'duplicate key value violates unique constraint "products_sku_normalized_uidx"' }, "x")).toContain("SKU");
    expect(getErrorMessage({ message: "FORBIDDEN", code: "42501" }, "x")).toContain("permissão");
  });

  it("falls back safely", () => {
    expect(getErrorMessage({}, "fallback")).toBe("fallback");
  });
});
