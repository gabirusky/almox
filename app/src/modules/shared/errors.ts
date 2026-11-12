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
  if (message.includes("ACTIVE_PROFILE_REQUIRED")) return "Sua sessão não está ativa para realizar esta operação.";
  if (message.includes("REVERSAL_ADMIN_REQUIRED")) return "Somente administradores ativos podem estornar movimentações.";
  if (message.includes("REVERSAL_REASON_INVALID")) return "Informe a justificativa do estorno (até 500 caracteres).";
  if (message.includes("MOVEMENT_ALREADY_REVERSED")) return "Esta movimentação já foi estornada. Atualize o histórico.";
  if (message.includes("REVERSAL_OF_REVERSAL_FORBIDDEN")) return "Não é permitido estornar um estorno.";
  if (message.includes("REVERSAL_INSUFFICIENT_STOCK")) return "O estorno deixaria o saldo negativo. Confira o estoque e as movimentações antes de corrigir.";
  if (message.includes("STOCK_LIMIT_EXCEEDED")) return "O resultado ultrapassa o limite de saldo permitido.";
  if (message.includes("MOVEMENT_NOT_FOUND")) return "Movimentação não encontrada.";
  if (message.includes("STOCK_ADJUSTMENT_ADMIN_REQUIRED")) return "Somente administradores ativos podem ajustar o estoque.";
  if (message.includes("COUNTED_QUANTITY_INVALID")) return "Informe uma contagem não negativa com até três casas decimais e dentro do limite permitido.";
  if (message.includes("COUNTED_QUANTITY_MUST_BE_INTEGER")) return "A unidade deste produto exige uma contagem inteira.";
  if (message.includes("ADJUSTMENT_REASON_INVALID")) return "Informe o motivo do ajuste (até 500 caracteres).";
  if (message.includes("STOCK_VERSION_CHANGED")) return "O saldo mudou desde a leitura. Faça uma nova contagem antes de ajustar.";
  if (message.includes("COUNT_MATCHES_CURRENT_STOCK")) return "A contagem coincide com o saldo atual; nenhum ajuste é necessário.";
  if (message.includes("STOCK_VERSION_INVALID")) return "Não foi possível validar a versão do saldo. Atualize o produto e tente novamente.";
  if (message.includes("MOVEMENT_DATE_RANGE_INVALID")) return "A data final deve ser igual ou posterior à data inicial.";
  if (message.includes("MOVEMENT_PAGE_INVALID")) return "A página solicitada não é válida.";
  if (message.includes("MOVEMENT_KIND_INVALID")) return "O tipo de movimentação selecionado não é válido.";
  if (message.includes("EXPORT_ADMIN_REQUIRED")) return "Somente administradores ativos podem exportar relatórios.";
  if (message.includes("EXPORT_FILTER_INVALID")) return "Os filtros da exportação não são válidos.";
  if (message.includes("EXPORT_TOO_LARGE")) return "A consulta excede 50.000 linhas. Reduza o período ou aplique mais filtros.";
  if (message.includes("USER_ADMIN_REQUIRED")) return "Somente administradores ativos podem gerenciar usuários.";
  if (message.includes("LAST_ADMIN_REQUIRED")) return "Deve existir ao menos um administrador ativo. Promova outro usuário antes desta alteração.";
  if (message.includes("USER_NOT_FOUND")) return "Usuário não encontrado.";
  if (message.includes("USER_ALREADY_EXISTS")) return "Já existe uma conta com este e-mail.";
  if (message.includes("INVITE_EMAIL_INVALID")) return "Informe um e-mail válido.";
  if (message.includes("INVITE_NAME_INVALID")) return "Informe o nome de exibição (até 120 caracteres).";
  if (message.includes("INVITE_FAILED") || message.includes("INVITE_AUTH_USER_MISMATCH")) return "Não foi possível enviar o convite. Tente novamente em instantes.";
  if (message.includes("FUNCTION_MISCONFIGURED")) return "A função de convite não está configurada no servidor.";
  if (message.includes("AUTH_REQUIRED")) return "Sua sessão expirou. Entre novamente.";
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
  if (message.includes("EXIT_QUANTITY_MUST_BE_POSITIVE")) return "Informe uma quantidade positiva.";
  if (message.includes("EXIT_QUANTITY_INVALID_PRECISION")) return "A quantidade deve ter até três casas decimais e caber no limite do estoque.";
  if (message.includes("EXIT_QUANTITY_MUST_BE_INTEGER")) return "A unidade deste produto exige uma quantidade inteira.";
  if (message.includes("INSUFFICIENT_STOCK")) return "Saldo insuficiente. Confira o saldo atual e ajuste a quantidade.";
  if (message.includes("EXIT_DEPARTMENT_REQUIRED") || message.includes("DEPARTMENT_INACTIVE_OR_NOT_FOUND")) return "Selecione um setor ativo.";
  if (message.includes("EXIT_RECIPIENT_INVALID")) return "Informe o recebedor (até 240 caracteres).";
  if (message.includes("EXIT_REASON_INVALID")) return "Informe o motivo da saída (até 500 caracteres).";
  if (message.includes("OPERATION_KEY_INVALID")) return "Não foi possível identificar a operação. Recarregue a página e tente novamente.";
  if (message.includes("PRODUCT_INACTIVE")) return "Produto inativo não aceita movimentações.";
  if (message.includes("PRODUCT_NOT_FOUND")) return "Produto não encontrado.";
  if (message.includes("OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT")) return "A chave da operação já foi usada com outros dados.";
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) return "Falha de conexão. Verifique sua rede e tente novamente.";
  return fallback;
}
