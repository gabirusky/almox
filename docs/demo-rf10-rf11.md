# RF10/RF11 — contagem física e consulta operacional

As migrations adicionam `almox_adjust_stock_by_count` (RF10) e `almox_search_stock_movements` (RF11). Aplicar em ambiente Supabase local descartável ou homologação antes de uso. A aplicação não altera automaticamente o projeto Supabase hospedado.

## Preparação

1. Em um clone atualizado, instale `app/` com `npm ci`.
2. Inicie o Docker e execute `npx supabase start` na raiz. Em banco local descartável, `npx supabase db reset` aplica as migrations e o seed; o reset apaga os dados locais existentes.
3. Configure `app/.env.local` com URL e chave pública local e inicie `npm run dev` em `app/`.
4. Use o administrador fictício indicado no README. Execute as verificações abaixo em conjunto com os roteiros de RF08/RF09.

## RF10 — ajuste por contagem

- Saldo 10, versão 1; contagem 8: registra `AJUSTE` delta -2, novo saldo 8 e versão 2.
- Saldo 10; contagem 12: registra `AJUSTE` delta +2.
- Contagem zero é válida; quantidade negativa, precisão acima de três casas e fração para unidade `UN`/`CX` são recusadas.
- Contagem igual ao saldo não gera movimento.
- Reenvio da mesma chave e conteúdo retorna o mesmo resultado; reutilizar a chave com conteúdo diferente é recusado.
- Após a leitura, registrar outra entrada/saída e submeter a contagem com a versão anterior: deve retornar `STOCK_VERSION_CHANGED`, sem sobrescrever a movimentação concorrente. Atualizar e reconferir antes de tentar novamente.
- Funcionário, usuário inativo e anônimo não ajustam estoque. Falha de auditoria precisa reverter movimento, saldo e comando na mesma transação.
- Verificar no histórico os snapshots de contagem, autor, motivo, saldos antes/depois e versão.

## RF11 — histórico filtrado

- Consultar todas as movimentações e combinar datas, produto (nome/SKU), tipo, responsável e setor.
- Confirmar que datas inicial/final incluem todo o dia local escolhido, que a ordenação é estável e que a paginação não duplica nem omite linhas.
- Verificar busca histórica após renomear/inativar produto, pessoa ou setor: nomes exibidos usam snapshots do momento da operação.
- Filtrar estorno e original separadamente, inclusive quando aparecem em páginas diferentes; cada linha deve preservar seu vínculo.
- Funcionário ativo e administrador ativo consultam; anônimo e usuário inativo são recusados.

Registre o commit avaliado, ambiente, resultados e erros. RF10/RF11 só devem ser considerados homologados após essas verificações no Supabase e revisão visual da interface.
