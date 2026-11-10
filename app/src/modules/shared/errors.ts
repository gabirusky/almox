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
  if (message.includes("ENTRY_QUANTITY_MUST_BE_POSITIVE")) return "Informe uma quantidade positiva.";
  if (message.includes("ENTRY_QUANTITY_PRECISION_EXCEEDED")) return "A quantidade pode ter no máximo três casas decimais.";
  if (message.includes("ENTRY_QUANTITY_MUST_BE_INTEGER")) return "A unidade deste produto exige uma quantidade inteira.";
  if (message.includes("ENTRY_ORIGIN_REQUIRED")) return "Informe a origem da entrada.";
  if (message.includes("ENTRY_REASON_REQUIRED")) return "Informe o motivo da entrada.";
  if (message.includes("PRODUCT_INACTIVE")) return "Produto inativo não aceita movimentações.";
  if (message.includes("PRODUCT_NOT_FOUND")) return "Produto não encontrado.";
  if (message.includes("OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT")) return "A chave da operação já foi usada com outros dados.";
  if (message.includes("ACTIVE_PROFILE_REQUIRED")) return "Sua sessão não está ativa para realizar esta operação.";
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) return "Falha de conexão. Verifique sua rede e tente novamente.";
  return fallback;
}
