# RF09 — Correção por estorno integral

Implementação: migration `20261110193000_rf09_reversals.sql`, RPC `almox_reverse_movement` e ação Estornar no histórico do produto. Aplicar após RF08. O código não aplica automaticamente alterações no Supabase hospedado.

## Comportamento

Administrador ativo informa o movimento original, justificativa (1–500 caracteres) e chave da operação. O banco calcula o inverso do delta original e registra um novo movimento ESTORNO, sem editar o original. Não há estorno parcial nem estorno de estorno. Produto inativo exige reativação; setor histórico inativo não impede a correção, pois não representa uma nova entrega.

O resultado contém ID do estorno, ID original, produto, delta, saldo na confirmação, versão e tipo. Repetir a mesma chave e conteúdo retorna o resultado original. Outra chave para um original já estornado é recusada. Campos de saldo/autor/data não são aceitos do cliente. O histórico consulta os vínculos de estorno dos movimentos da página, incluindo estornos em outras páginas.

RNF01: administrador validado na RPC; RNF02: saldo/movimento/auditoria/comando em uma transação; RNF03: mesma ordem de bloqueios de RF07/RF08 e unicidade do original; RNF04: original preservado, vínculo, snapshots e autoria; RNF06/RNF07: justificativa rotulada, confirmação, teclado e feedback; RNF08: migration incremental e cliente tipado. RNF05 (carga/desempenho), RNF07 (checagem visual em navegadores), RNF09 (restore) e RNF10 (observabilidade/retenção antes de produção) continuam exigindo validação do ambiente.

## Validação integrada pendente

### Preparação pelo integrante responsável pelos testes

1. Atualizar o clone com `git pull --ff-only` e instalar as dependências com `npm ci` dentro de `app/`.
2. Com Docker em execução, na raiz do repositório executar `npx supabase start`. Em um ambiente local descartável, executar `npx supabase db reset` para recriar o banco com todas as migrations e o seed. Esse reset apaga os dados locais existentes; usar um ambiente reservado aos testes.
3. Copiar `app/.env.example` para `app/.env.local` e preencher URL/chave pública do Supabase local. Executar `npm run dev` dentro de `app/`. Os usuários fictícios estão documentados no README.
4. No SQL Editor do Supabase local, executar os arquivos `supabase/tests/rf08_exit_checks.sql` e `supabase/tests/rf09_reversal_checks.sql`, separadamente. Registrar erros completos, se houver; os scripts desfazem os dados de teste ao terminar.
5. Seguir os cenários adicionais abaixo e o roteiro `docs/demo-rf08.md`. Registrar commit testado, resultado de cada cenário e eventuais falhas para correção antes de concluir as tarefas no Jira.

Os testes de frontend e o build já foram executados no desenvolvimento; eles não substituem a validação do banco pelo integrante com ambiente disponível.

Executar `supabase/tests/rf09_reversal_checks.sql` em banco de desenvolvimento com migrations e seed. O script usa transação com rollback e verifica inversão da saída, imutabilidade, auditoria, replay, chave divergente, estorno duplicado, estorno de estorno, justificativa, funcionário sem permissão e estorno de entrada com/sem saldo.

Verificar adicionalmente com API/sessões reais:

1. Anônimo, funcionário e administrador inativo são recusados. Admin ativo pode estornar.
2. Entrada 10, saída 4: saldo 6. Estornar saída: saldo 10, versão +1 e delta +4; original permanece.
3. Antes do estorno da saída, estornar a entrada 10 é recusado por saldo insuficiente. Após recompor 10, o estorno da entrada deixa zero.
4. Duas sessões, chaves diferentes, mesmo original: uma confirma e outra recebe MOVEMENT_ALREADY_REVERSED. Mesma chave: ambas retornam o mesmo resultado, uma única baixa/reposição.
5. Falha forçada da auditoria em banco descartável reverte também saldo, versão e comando.
6. Produto inativo, ID inexistente, justificativa vazia/excedente, saldo máximo e renomeação de setor: recusas/snapshots corretos.
7. No navegador: cancelar confirmação não envia; perda da resposta seguida de reenvio sem edição usa a mesma chave; após sucesso saldo/histórico são atualizados. Movimentos já estornados mostram o vínculo mesmo em outra página.

Não classificar RF09 como homologado sem executar esses cenários no Supabase.
