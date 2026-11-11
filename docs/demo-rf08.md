# Roteiro de validação — RF08 Saída

Aplicar as migrations em um Supabase de desenvolvimento antes de iniciar. Usar os usuários fictícios do `supabase/seed.sql` apenas localmente. O frontend precisa de `app/.env.local` com URL e chave pública do mesmo projeto. Não usar `service_role` no navegador.

1. Entre como administrador e crie um produto `UN` ativo. Registre entrada de 10 pela rota `/movimentacoes/nova`.
2. Entre como operador ativo, abra `/movimentacoes/saida`, localize o produto pelo SKU, selecione um setor ativo e preencha quantidade 4, recebedor e motivo.
3. Revise a confirmação e envie. O retorno deve mostrar ID do lançamento e saldo 6. Em `/produtos/:id`, confira versão 2, movimento `SAIDA` de -4, setor e recebedor. A auditoria deve registrar o movimento com autor e horário do servidor.
4. Tente saída 11. Deve aparecer “Saldo insuficiente”; saldo, versão e número de movimentos continuam iguais.
5. Reenvie a mesma requisição com a mesma chave após simular perda da resposta. O resultado deve ser idêntico e não deve existir segunda baixa. Com a mesma chave e quantidade diferente, deve haver conflito explícito.
6. Tente saída para produto e setor inativos, quantidade zero e fração de unidade `UN`. Cada caso deve ser recusado sem efeito parcial.
7. Pela API, confirme que anônimo e usuário inativo não executam a RPC; funcionário e administrador ativos podem executar. INSERT/UPDATE/DELETE direto em `stock_balances` e `stock_movements` devem ser negados.
8. Em duas sessões simultâneas, com saldo 5, envie saídas de 4 com chaves diferentes. Uma confirma e outra recebe saldo insuficiente; saldo final 1.
9. Em ambiente descartável, force falha no trigger de auditoria. A RPC deve falhar e não deixar movimento, saldo ou comando confirmado.

O script `supabase/tests/rf08_exit_checks.sql` automatiza parte das afirmações em transação que faz rollback. Ele não substitui as sessões concorrentes nem os testes de API com papéis distintos. Registrar medições de RNF05 e restauração de RNF09 antes de uso real.
