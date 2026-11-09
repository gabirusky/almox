export function getErrorMessage(error: unknown, fallback = "Ocorreu um erro inesperado."): string {
  const message =
    typeof error === "object" && error && "message" in error && typeof error.message === "string"
      ? error.message
      : fallback;
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  if (message.includes("CATEGORY_HAS_ACTIVE_PRODUCTS")) return "Não é possível inativar: a categoria possui produtos ativos.";
  if (message.includes("PRODUCT_INACTIVATION_REQUIRES_ZERO_BALANCE")) return "Não é possível inativar: o saldo do produto deve ser zero.";
  if (message.includes("CATEGORY_INACTIVE_OR_NOT_FOUND")) return "Selecione uma categoria ativa.";
  if (message.includes("PRODUCT_UNIT_LOCKED_AFTER_FIRST_MOVEMENT")) return "A unidade não pode ser alterada após a primeira movimentação.";
  if (message.includes("FORBIDDEN") || code === "42501") return "Você não tem permissão para realizar esta operação.";
  if (message.includes("products_sku_normalized_uidx") || message.includes("duplicate key") && message.toLowerCase().includes("sku")) return "SKU já cadastrado (inclusive entre produtos inativos).";
  if (message.includes("categories_name_normalized_uidx") || (message.includes("duplicate key") && message.toLowerCase().includes("categories"))) return "Já existe uma categoria com este nome.";
  if (message.includes("departments_name_normalized_uidx") || (message.includes("duplicate key") && message.toLowerCase().includes("departments"))) return "Já existe um setor com este nome.";
  if (message.includes("violates row-level security")) return "Operação bloqueada pelas regras de acesso.";
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) return "Falha de conexão. Verifique sua rede e tente novamente.";
  return fallback;
}
