## Justificativa de Arquitetura (ALMOX)

> Projeto em andamento (RF01–RF07 consolidados; RF08/RF09 implementados no código e pendentes de validação integrada no Supabase). As decisões priorizam integridade de estoque, rastreabilidade e segurança para um almoxarifado único (MVP), conforme análise de requisitos.

### 1. Frontend (`app/`)

| Decisão | Por que foi escolhida | Benefício no projeto | Trade-off / cuidado |
|---|---|---|---|
| **React 19** | Biblioteca madura para SPA com estado de UI complexo (listas, formulários, fluxos de confirmação). | Componentização por domínio (`modules/access`, `modules/catalog`, `shared`) e evolução incremental das telas (consulta, entrada/saída, estorno). | Exige disciplina de estado/efeitos; mitigado com hooks e padrões claros. |
| **TypeScript (estrito)** | Tipagem estática no código da aplicação. | Reduz erros em regras sensíveis (quantidades, papéis, contratos de API) e melhora manutenibilidade/refatoração (RNF08). | Custo inicial de modelagem de tipos; compensa na evolução do MVP. |
| **Vite 8** | Ferramenta moderna de dev/build para SPA. | Feedback rápido no desenvolvimento e build simples/reproduzível; configuração enxuta para React+TS. | Focado em SPA; SSR não é requisito deste sistema interno. |
| **Tailwind CSS 4** | Estilização utilitária e consistente. | Agilidade para implementar UI responsiva e estados visuais (erro, vazio, loading, foco) sem CSS disperso (apoia RNF06/RNF07). | Classes extensas no markup; controlado com componentes reutilizáveis. |
| **shadcn/ui** | Componentes acessíveis e copiáveis para o projeto (não caixa-preta). | Base consistente para formulários, diálogos e tabelas, com controle total do código e alinhamento a acessibilidade/rótulos/foco. | Manutenção dos componentes fica no repositório (exige padronização). |
| **React Router** | Roteamento de SPA com rotas públicas/protegidas. | Separa jornadas (login, produtos, detalhe/histórico, nova entrada/saída, admin de categorias/setores) e aplica guards de navegação por sessão/perfil. | Guard de UI é só UX; autorização efetiva permanece no banco (ver seção 3). |
| **TanStack Query** | Gerenciamento de estado de servidor (cache, refetch, invalidação, paginação). | Mantém consultas e históricos consistentes após mutações, evita requisições duplicadas e simplifica estados de carregamento/erro nas telas paginadas. | Requer estratégia de invalidação correta; páginas críticas recarregam dados do servidor. |
| **React Hook Form + Zod** | Formulários performáticos + validação declarativa por schema. | Feedback imediato e mensagens claras em PT-BR antes do envio (campos obrigatórios, formatos/quantidades), melhorando usabilidade (RNF06). | Validação no cliente é complementar; regras de negócio são revalidadas no PostgreSQL. |

### 2. Backend (BaaS)

| Decisão | Por que foi escolhida | Benefício no projeto | Trade-off / cuidado |
|---|---|---|---|
| **Supabase Auth** | Autenticação integrada (e-mail/senha, sessão/JWT, recuperação). | Identidade confiável para atrelar autor às operações e perfis (`admin`/`employee`), sem implementar auth do zero. | Dependência de serviço gerenciado; configuração local versionada (`supabase/config.toml`, signup desabilitado). |
| **PostgreSQL** | Banco relacional transacional com constraints, locks e funções. | Modelo natural para produtos, saldos, movimentações e auditoria; garante invariantes (ex.: saldo não negativo, SKU único) e consultas paginadas/indexadas. | Exige cuidado em modelagem/migrations; mitigado com SQL versionado em `supabase/migrations/`. |
| **PostgREST** | API de dados sobre o schema com base em permissões/RLS. | Leitura segura e direta de catálogos/saldos/históricos respeitando políticas, reduzindo backend intermediário para consultas. | Escritas críticas não devem ficar soltas no cliente; por isso comandos de domínio usam RPC. |
| **RPC (funções PostgreSQL)** | Execução de comandos de domínio no banco (`almox_create_product`, `almox_register_entry/exit`, `almox_reverse_movement`). | Centraliza fluxos atômicos e idempotentes (ex.: `stock_commands`, hash de operação, travas produto→saldo) e retorna resultado consistente ao reenvio. | Lógica concentrada em SQL/plpgsql; exige testes/migrations disciplinados (`supabase/tests/`, roteiros em `docs/`). |

### 3. Regras críticas no PostgreSQL (fonte de verdade)

| Decisão | Justificativa | Evidência/efeito prático |
|---|---|---|
| **RLS (Row Level Security)** | Autorização efetiva por identidade/perfil em toda operação de dados, independente do cliente. | Políticas e helpers (`almox_is_active_user`, `almox_is_admin`) restringem leitura/escrita; UI não é fonte de autorização (RNF01, RF02). |
| **Constraints e integridade** | Impedir estados inválidos no dado (unicidade, referências, domínios, não-negativo). | SKU normalizado único, referências preservadas, saldo/versão controlados, bloqueios de inativação/associação inválida (RN05/RN14/RN15/RN02). |
| **Funções/triggers/RPC transacionais** | Executar validação, efeito e auditoria na mesma transação, com controle de concorrência. | Lock ordenado, recálculo de saldo, recusa de saldo insuficiente/duplicidade, idempotência por chave e vínculo de estorno integral (RNF02/RNF03/RF07–RF09/RF13). |
| **Auditoria no banco (triggers)** | Rastreabilidade não pode depender de chamada extra do navegador. | `audit_events` e gatilhos registram autor/ação/antes-depois no servidor; falha de auditoria aborta a operação (RNF04). |
| **Frontend só com chave publicável/anon + JWT; nunca `service_role`** | Princípio do menor privilégio: o cliente opera sempre no contexto do usuário. | `service_role` bypassa RLS — expô-la no app permitiria escalar privilégios e violar invariantes; por isso fica restrita a ambiente servidor/controlado (não usada no frontend). |

### 4. Resumo
- **Separação de responsabilidades:** React cuida de experiência/validação de formulário; PostgreSQL/Supabase garantem identidade, autorização, consistência, concorrência e auditoria.
- **Adequação ao domínio:** estoque exige “verdade única” de saldo e histórico imutável/rastreável — concentrar regras no banco evita divergência entre telas/clients.
- **Escopo e maturidade:** arquitetura BaaS + SPA acelera o MVP acadêmico sem abrir mão das invariantes críticas; itens operacionais (validação integrada RF08/RF09, metas de desempenho/recuperação em homologação) permanecem como próximos passos do projeto em andamento.

### 5. Protótipo Figma e componentes de UI
- **Figma como inspiração:** eventuais protótipos no Figma servem apenas como referência de intenção visual, hierarquia e fluxo de telas.
- **Implementação padronizada:** a interface deve ser reconstruída no código com **componentes shadcn/ui padrão e reutilizáveis** (`app/src/components/ui`) e composições compartilhadas do projeto, sem copiar código exportado do Figma.
- **Benefícios:** consistência visual, acessibilidade, manutenção mais simples, reaproveitamento entre páginas (RF01–RF09) e aderência aos tokens/convenções do ALMOX.
- **Integração MCP:** o servidor MCP do Figma está disponível para consulta de contexto de design quando necessário; isso não altera a regra de implementar com componentes shadcn/ui padrão e reutilizáveis.
