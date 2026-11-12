# Deploy no GitHub Pages — guia simples

Este documento explica, em linguagem simples, como o frontend do ALMOX é publicado como **demo online** no GitHub Pages, por que existem algumas configurações específicas no código e o que fazer quando for a hora de conectar o Supabase.

Pipeline: [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) · App: [`app/`](../app) · Demo: <https://gabirusky.github.io/almox/>

## 1. Ideia geral

O GitHub Pages é uma hospedagem **estática**: ele entrega arquivos prontos (HTML, CSS, JS, imagens) e não executa código no servidor. Por isso, o build do frontend é gerado no GitHub Actions e o resultado (`app/dist/`) é publicado como um pacote de arquivos.

Fluxo resumido:

```
push em main
  └─ Actions roda: instalar → lint → typecheck → test → build
       └─ build gera app/dist/ (modo offline/mock, sem Supabase)
            └─ dist/ é publicado em https://gabirusky.github.io/almox/
```

Pull requests **não publicam**: apenas rodam as verificações. Isso evita que uma branch qualquer substitua o site publicado.

## 2. Por que a URL tem `/almox/`

O repositório se chama `almox` e não é o repositório especial `gabirusky.github.io`. Nesse caso o GitHub Pages publica em um subcaminho: `https://gabirusky.github.io/almox/`.

Consequência prática: todo arquivo do site fica **dentro** de `/almox/`. Se o build gerar caminhos absolutos como `/assets/app.js`, o navegador vai procurar `https://gabirusky.github.io/assets/app.js` — que não existe. O site abre em branco.

Solução aplicada:

- `app/vite.config.ts` define `base: process.env.VITE_BASE_PATH ?? "/"`.
- O workflow passa `VITE_BASE_PATH=/almox/` apenas no build de produção.
- Desenvolvimento local continua em `http://localhost:5173/`, sem subcaminho.

Se o repositório for renomeado, essa URL e essa variável precisam ser atualizadas. Se um domínio próprio for configurado depois, `base` volta a ser `/`.

## 3. Por que o roteador precisa de `basename`

O app é uma SPA (Single Page Application): existe um único `index.html` e o React Router troca a tela conforme a URL. O navegador não pede uma página nova a cada clique.

Para o roteador entender que todas as rotas começam em `/almox/`, `app/src/App.tsx` usa:

```tsx
<BrowserRouter basename={import.meta.env.BASE_URL}>
```

`import.meta.env.BASE_URL` é preenchido pelo Vite: vale `/almox/` no build de produção e `/` no desenvolvimento. Com isso, um link interno para `/produtos` aparece no navegador como `/almox/produtos`, mas o app continua resolvendo a rota `/produtos` normalmente.

## 4. Por que existe um `404.html`

Ao clicar em links dentro do app, o navegador não consulta o servidor — o React Router só muda a URL. Isso funciona.

O problema aparece quando alguém **abre ou atualiza** uma URL interna diretamente, por exemplo `https://gabirusky.github.io/almox/produtos`. O navegador pede esse caminho ao GitHub Pages, que procura um arquivo `almox/produtos` e não encontra. Sem tratamento, aparece a página 404 do GitHub.

Solução: copiar o `index.html` para `404.html` depois do build.

```bash
cp dist/index.html dist/404.html
```

Quando o Pages não acha um arquivo, ele entrega o `404.html`. Como esse arquivo é o próprio app, o React sobe, lê a URL (`/almox/produtos`) e mostra a tela correta. A URL continua limpa, sem `#`.

Trade-off: a primeira resposta HTTP é 404 (o navegador mostra a página normalmente). Para uma aplicação atrás de login isso é irrelevante e não afeta SEO.

Alternativa descartada: `HashRouter` (URLs com `#/produtos`). Funciona em qualquer hospedagem estática, mas deixa a URL feia e conflita com links de recuperação de senha do Supabase, que usam o fragmento `#` para transportar o token.

## 5. O que é o "modo offline/mock"

O frontend detecta automaticamente que não há Supabase configurado e passa a usar um armazenamento simulado no próprio navegador:

- dados de exemplo (produtos, categorias, setores, movimentações, usuários) pré-carregados;
- persistência em `localStorage`, com chaves `almox.offline.*`;
- login simulado com usuários de teste pré-semeados (credenciais entregues fora do repositório).

O workflow força `VITE_OFFLINE_MODE=true` para deixar a intenção explícita e impedir que o build mude de modo caso variáveis do Supabase sejam adicionadas ao repositório no futuro.

Pontos importantes:

- nada é enviado a servidor; cada visitante tem seus próprios dados;
- limpar o `localStorage` restaura os dados de exemplo;
- a demo é pública e serve para apresentação/avaliação de usabilidade;
- o mock **não** reproduz garantias do banco (RLS, RPCs, constraints, transações, concorrência).

## 6. O pipeline passo a passo

Arquivo: `.github/workflows/pages.yml`.

Disparos:

- `push` em `main` → verifica e publica;
- `pull_request` → apenas verifica;
- `workflow_dispatch` → permite rodar manualmente pela aba Actions.

Job `check` (roda em `app/`):

1. `actions/checkout` — baixa o código.
2. `actions/setup-node` com Node 22 e cache do npm (`app/package-lock.json`).
3. `npm ci` — instala exatamente o que está no lockfile.
4. `npm run lint` — oxlint. Hoje avisos não quebram o build; erros quebram.
5. `npm run typecheck` — TypeScript estrito nas configs de app e node.
6. `npm run test` — Vitest (20 testes).
7. `npm run build` — `tsc -b` + `vite build`, com `VITE_BASE_PATH=/almox/` e `VITE_OFFLINE_MODE=true`.
8. `cp dist/index.html dist/404.html` — fallback de rotas descrito acima.
9. `actions/upload-pages-artifact` — empacota `app/dist`.

Job `deploy`:

- só executa em `main` e fora de pull request;
- depende do `check` (se a verificação falhar, nada é publicado);
- usa `actions/deploy-pages` para publicar o pacote;
- expõe a URL no ambiente `github-pages`.

Não há segredos no pipeline: build offline não precisa de chave alguma.

## 7. Configuração única no GitHub

Feita uma vez, manualmente, no repositório:

1. **Settings → Pages → Source:** selecionar **GitHub Actions**.
   Sem isso, o passo de deploy falha com `Get Pages site failed`.
2. **Settings → Branches:** proteger `main`, exigindo o check do workflow e, se quiser, bloqueando push direto.
3. **Settings → Actions → General:** permitir execução de workflows (padrão já habilitado).

## 8. Como verificar depois do deploy

1. Abrir <https://gabirusky.github.io/almox/> → tela de login, logo visível, sem erros 404 no console/Network.
2. Abrir <https://gabirusky.github.io/almox/produtos> em uma aba nova → deve mostrar o app (login), não a 404 do GitHub.
3. Atualizar essa mesma página → deve continuar funcionando.
4. Entrar com um usuário de teste → painel com dados de exemplo.
5. Criar uma movimentação → atualizar a página → dado continua lá.
6. Abrir em janela anônima → dados voltam ao estado inicial (esperado).
7. Abrir um PR de uma branch → job `check` roda; job `deploy` não aparece.

## 9. Diagnóstico de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| Tela branca; JS/CSS com 404 em `/assets/...` | `base` errado no build | conferir `VITE_BASE_PATH` no workflow e `base` em `app/vite.config.ts` |
| `Get Pages site failed` no deploy | Pages não está configurado como `GitHub Actions` | ajustar em Settings → Pages |
| Refresh em rota interna cai na 404 do GitHub | `dist/404.html` não foi gerado | conferir o passo `cp` no workflow |
| Ícone da aba não carrega | `href` sem `%BASE_URL%` em `app/index.html` | restaurar `href="%BASE_URL%logo_almox.png"` |
| Site antigo por alguns minutos | cache de HTML do Pages (~10 min) | aguardar; não há controle de headers no Pages |
| Login mock não funciona | `localStorage` com estado antigo | limpar as chaves `almox.offline.*` no navegador |
| Página interna mostra tela errada após deploy | cache de HTML + rota antiga | recarregar com cache limpo |

## 10. Fase 2 — conectar o Supabase

Quando o projeto Supabase estiver pronto:

1. Em **Settings → Secrets and variables → Actions → Variables**, criar:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   A chave `anon` é pública por design (ela vai dentro do bundle do navegador). Mesmo assim, **nunca** usar `service_role` no frontend.
2. No workflow, remover a linha `VITE_OFFLINE_MODE: "true"` do passo de build.
3. No Supabase, em **Authentication → URL Configuration**:
   - Site URL: `https://gabirusky.github.io/almox/`
   - Redirect allowlist: incluir `https://gabirusky.github.io/almox/definir-senha`
   Sem isso, links de recuperação de senha apontam para `localhost` e quebram no site publicado.
4. A Edge Function `admin-invite` (convites de usuário) precisa de pipeline próprio com `supabase functions deploy`. Ela não faz parte do Pages.
5. Opcional: manter a demo offline viva em `/almox/demo/`, gerando um segundo build com `VITE_BASE_PATH=/almox/demo/` e copiando para `dist/demo/` antes do upload. Decisão para depois.

Enquanto a fase 2 não acontece, o site publicado é uma demo de interface — sem persistência real e sem autenticação de verdade.

## 11. Limitações conhecidas

- **Cache de HTML:** o Pages serve `index.html` com cache curto (~10 min) e não permite configurar headers. Após um deploy, alguns visitantes podem ver a versão anterior por alguns minutos.
- **Tamanho do bundle:** o chunk principal tem cerca de 878 kB (248 kB gzip), sem code-splitting. Funciona, mas pesa em rede móvel; separar rotas em chunks é melhoria futura.
- **Renomear o repositório** muda a URL e exige atualizar `VITE_BASE_PATH`, `README.md` e este documento.
- **Domínio próprio** depois: `base` volta para `/`, adicionar arquivo `CNAME`, configurar DNS e aguardar a emissão do certificado.
- **Fontes do Google:** carregadas por CDN externo; sem impacto no deploy, mas dependem de rede externa.
- **Demo pública:** qualquer pessoa pode usar o mock; os dados ficam só no navegador dela, então não há vazamento nem gravação em servidor.

## 12. Onde mexer em cada situação

| Mudança desejada | Arquivo |
|---|---|
| Caminho base do site | `app/vite.config.ts` + `VITE_BASE_PATH` no workflow |
| Rotas/basename | `app/src/App.tsx` (`BrowserRouter basename`) |
| Ícone e metadados do HTML | `app/index.html` |
| Etapas de verificação/deploy | `.github/workflows/pages.yml` |
| Credenciais e textos da demo | `README.md` (seção "Demo online") + `app/src/lib/mock-store.ts` |
| Ativar Supabase | workflow (remover `VITE_OFFLINE_MODE`) + variáveis no GitHub + Auth do Supabase |
