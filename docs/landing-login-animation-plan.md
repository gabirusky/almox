# Plano — Animação de transição landing → login (ALMOX)

> **Status:** ✅ **implementado**. Este documento é o plano original (mantido como registro do desenho); a referência técnica do que foi construído está em [`landing-login-animation.md`](./landing-login-animation.md) e o roteiro de verificação em [`demo-landing-login.md`](./demo-landing-login.md).
>
> **Escopo:** `/almox` (landing) e `/almox/login` viram dois estados visuais da mesma interface. Sem alteração de autenticação, rotas, copy ou identidade visual.
> **Técnica:** transição CSS nativa sobre um único componente compartilhado (sem biblioteca nova, sem FLIP, sem duplicar o logo).

---

## 1. Estado atual (verificado no código)

| Item | Situação |
|---|---|
| Stack | Vite 8 + React 19.3 + TypeScript 7 + Tailwind CSS 4 + react-router **8.5.1** (declarativo, `BrowserRouter basename={import.meta.env.BASE_URL}`) |
| Animação | **Nenhuma biblioteca**. Único CSS do projeto: `src/index.css` (tokens `@theme` + regra global de `prefers-reduced-motion`) |
| Landing | `LandingPage` declarado **dentro de `app/src/App.tsx`**; rota `/` via `HomeRoute` (anônimo) |
| Login | `app/src/modules/access/pages/LoginPage.tsx` — card `grid lg:grid-cols-[1fr_2fr]`, painel esquerdo com o logo, formulário à direita |
| Logo | `app/src/assets/logo_almox.png` — arte ALMOX nova (navy `#002030` + verde `#00A060`, fundo transparente, 900×528, proporção 1,70) |
| Auth | `AuthProvider` (`modules/access/auth-context.tsx`) → Supabase ou modo offline/mock (`lib/mock-mode.ts`, `lib/mock-store.ts`); guards em `modules/access/guards.tsx` |
| Shell | `modules/shared/components/AppShell.tsx` — ramo não autenticado: header sticky + `<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">` (≈1104 px úteis em 1440) |
| Deploy | GitHub Pages, `VITE_BASE_PATH=/almox/`, fallback SPA via `404.html` copiado no CI |
| Checks | `npm run lint` (oxlint), `typecheck` (tsc), `test` (vitest; ambiente `node`, include `src/**/*.test.ts` + `.tsx`), `build` |
| Browser tests | Não havia no projeto. Ambiente local com Playwright (Chromium + Firefox) para verificação |

**Arte do logo:** a nova arte é horizontal (proporção 1,70) e nasce escura — por isso substitui a arte antiga em todos os pontos de uso (`AppShell`, `AccessStatusPages`, `RecoverPasswordPage`, `AuthExperience`) sem variação de cor: a mesma arte funciona em fundo claro (landing, header, páginas de acesso) e sobre o gradiente cinza do painel de marca. `public/logo_almox.png` (favicon) virou um quadrado escuro com a arte centralizada.

---

## 2. Arquitetura

Componente único **montado uma só vez** nas duas rotas. O logo é **o mesmo elemento DOM** durante toda a transição (sem fade-out/fade-in, sem duplicação).

```text
App
└── AppShell
    └── Routes
        └── Route element={<AuthLayout/>}          ← rota de layout: mantém a árvore viva
            ├── "/"     → HomeRoute (autenticado → Dashboard)
            └── "/login" → PublicOnly (redireciona se autenticado)
```

`AuthLayout` decide quem renderiza:

- `"/"` com status `anonymous`/`misconfigured` → `<AuthExperience view="landing" />`
- `"/login"` com qualquer status que não seja `loading`/`authenticated` → `<AuthExperience view="login" />`
- demais casos (loading, autenticado, inativo) → `<Outlet/>` (comportamento atual intacto)

```text
AuthExperience (view: "landing" | "login")
├── Hero wrapper (largura animada 26rem → 72rem + halo decorativo)
│   └── Card (grid; tracks animam 100% 0% → 33.3333% 66.6667%)
│       ├── BrandPanel (coluna 1)
│       │   ├── BrandBg (vidro fosco neutro: width 0 → 100% da coluna + opacity)
│       │   ├── Chip  ← único <img src=logo_almox.png> da tela (sem placa)
│       │   └── Actions (botões do landing; colapsa max-height/opacity/gap)
│       └── LoginPanel (coluna 2)
│           └── LoginForm (extraído de LoginPage.tsx; auth intacta)
└── Recursos (seção do landing; colapsa na saída)
```

**Por que rota de layout:** `PublicOnly`/`HomeRoute` mudariam a posição na árvore React, remontando o componente e matando a continuidade do logo. Com rota de layout, o `AuthExperience` permanece no mesmo slot → React preserva a instância → o `<img>` do logo é literalmente o mesmo nó durante a animação (coberto por teste automatizado).

---

## 3. Estratégia de animação — CSS puro, sem dependência nova

Estado único: atributo `data-view="landing|login"`. Cada estado define `transition` (propriedade, duração, delay, easing) — a transição usa os valores do **estado novo**, então ida e volta têm coreografias próprias sem encadeamento de timeouts.

| Elemento | Propriedade animada | Ida | Volta |
|---|---|---:|---:|
| Card | `grid-template-columns: 100% 0% → 33.3333% 66.6667%` | 500 ms | 420 ms |
| Wrapper | `max-width: 28rem → 72rem` | 520 ms | 430 ms |
| Chip (logo) | `width` (320 → 216 px no desktop) | 480 ms | 420 ms |
| BrandBg | `width: 0 → 100%` da coluna + `opacity: 0 → 1` (vidro fosco) | 420 ms | 380 ms |
| BrandPanel | `gap` (1.25rem → 0) e `padding` (0 → 1.5rem) | 240/420 ms | 220/380 ms |
| Actions | `max-height: 8rem → 0`, `opacity` | 240 ms | 220 ms |
| LoginPanel | `max-height: 0 → 34rem` (desktop) / `0 → 46rem` (mobile) | 520 ms | 420 ms |
| Conteúdo do form | `translateX(-100% → 0)` (desktop) / `translateY` (mobile) | 520 ms | 420 ms |
| Etapas do form | `opacity` + `translateY(0.5rem → 0)`, delays 280/330/380/430/480/530 ms | 300 ms | 180 ms |
| Container | `padding-block` (3rem/4rem → 0): o landing mantém o respiro da página | 520 ms | 430 ms |

Curva: `cubic-bezier(0.4, 0, 0.2, 1)` (padrão material). Uma curva *ease-out* muito agressiva foi descartada na verificação: o movimento terminava ~3× antes do esperado e a viagem do logo ficava ilegível.

**Por que o logo viaja sem FLIP:** o chip é item da coluna 1 do grid. A coluna encolhe de 100% → 33,33% enquanto o card cresce de 448 → 1104 px; como o chip está centralizado na coluna, sua posição é consequência direta da interpolação das tracks — movimento contínuo, sem medição, sem duplicar elemento.

**Viabilidade verificada** (Playwright, `getBoundingClientRect` por quadro):
- `grid-template-columns` interpola suavemente em **Chromium** e **Firefox**, com tracks em `fr` **e** em `%` (28–29 posições distintas por animação, sem saltos).
- Suporte: Chrome 107+, **Firefox 66+**, Safari 16+ ("widely available" desde 2025-04-27).
- Quadro por quadro durante a transição: mediana 17 ms (≈60 fps), p90 41 ms — a animação é de layout, mas a árvore é pequena.

**Alternativa descartada:** Motion/Framer Motion. O layout exigido (tracks em `fr`/`%`, translação do logo, revelação em camadas, stagger) é melhor servido por transição CSS nativa; adicionar ~40 kB gzip sem ganho visual seria custo sem retorno.

---

## 4. Detalhes de layout que exigem cuidado

1. **Altura do card é content-driven.** O card não tem `min-height` fixo: no landing ele abraça o conteúdo (logo 320 px + gap + botões `h-11`; card de 448×302 px); no login ele acompanha o formulário. O painel do form anima `max-height: 0 → 34rem`, então a altura do card cresce continuamente durante a transição (sem salto) e ainda pode crescer quando o `Alert` de erro aparece.
2. **Altura estável do formulário.** O conteúdo do form depende da largura da coluna. No desktop, `min-width: 28rem` no painel mantém o texto numa largura estável (sem quebra de linha a cada quadro); no mobile não se aplica (evita overflow horizontal).
3. **Margens.** O landing mantém o respiro original (container com `padding-block` 3rem/4rem); o login encosta no topo do `main`. O card permanece **centralizado na tela** em ambos os estados e em todas as larguras (verificado: delta 0 px contra `clientWidth` em 1280/1440/1920). O card do landing grew de 26rem para 28rem com `padding` de 1,5rem: o conteúdo (logo 368 px) não encolhe e a faixa entre a borda do card e o conteúdo passa de 24 px (16 de padding + 8 de margem) para 40 px.
4. **Sem placa em volta do logo.** O chip não tem fundo, borda ou sombra: no landing o logo fica direto no card branco; no login, direto sobre o painel de marca.
5. **Painel de marca em vidro fosco.** Superfície translúcida neutra (`rgb(238 242 241 / 0.55)` + `backdrop-filter: blur(26px)`), sem manchas de cor — minimalismo. A borda clara de 1 px separa o vidro do formulário.
6. **Logo e botões alinhados.** No desktop o wordmark ocupa exatamente a largura da linha de botões (320 px + respiro de 0,5 rem), com separação mínima de 0,75 rem entre os dois botões, de modo que as bordas externas dos botões alinham com as bordas do logo (verificado: 0,00 px de diferença).
7. **Mobile (<1024 px).** Grid de uma coluna; a marca vira **banner compacto** (vidro fosco + logo) acima do formulário; a revelação é **vertical** (`max-height: 0 → 46rem`); o chip encolhe no lugar (topo preservado), sem salto vertical.
8. **Seção "Recursos".** Vive fora do card, em wrapper `max-w-3xl` (mantém a largura atual) e permanece montada para poder colapsar na saída.
9. **Scroll.** Entrando no login: `window.scrollTo(0)`. Voltando: também `window.scrollTo(0)`, com foco no botão "Entrar no sistema".
10. **Overflow horizontal.** O halo decorativo passa da borda do card; `overflow-x: clip` no container impede scroll lateral (8 px no mobile) sem afetar o header sticky.

---

## 5. Roteamento (sem regressão)

- Rotas preservadas: `/` e `/login` continuam existindo, com acesso direto, refresh, deep link e `404.html` do Pages.
- Navegação client-side: "Entrar no sistema" continua sendo `<Link to="/login">` → sem reload, histórico preservado, back/forward funcionando.
- `basename`/`VITE_BASE_PATH` intocados → `/almox` e `/almox/login` seguem iguais em dev e Pages.
- `HomeRoute` mantém `loading` → skeleton, `authenticated` → painel RF14, `inactive` → `/acesso-inativo`; no caso público anônimo devolve `null` (a landing passa a viver no `AuthExperience`).
- Guard `PublicOnly` preservado em `/login` (redireciona para `/` quando autenticado); usuário `inactive` continua vendo a tela de login.

---

## 6. Autenticação e acessibilidade

Nada muda em `auth-context.tsx`, `use-auth.ts`, `guards.tsx`, `mock-store.ts` nem nas chamadas Supabase.

- `LoginForm` é extração literal do formulário atual de `LoginPage.tsx`: mesmo `zodResolver`, mesmos campos, mesma `signInWithPassword`, mesmo `navigate(from, { replace: true })` lendo `location.state.from`, mesmo link "Esqueci minha senha".
- Estado colapsado (landing): o painel do formulário recebe `inert` + `aria-hidden="true"` → não recebe foco por teclado e sai da árvore de acessibilidade. No login, as ações do landing recebem `inert` + `aria-hidden="true"` (mesma lógica invertida).
- Após a transição para o login, o foco vai para o campo de e-mail (`focus({ preventScroll: true })`); no retorno, volta para o botão "Entrar no sistema".
- `prefers-reduced-motion`: a regra global de `index.css` zera as transições; uma regra escopada (especificidade maior) mantém apenas um cross-fade de 120 ms no conteúdo do form, preservando os layouts finais — sem o movimento espacial.
- Cliques rápidos: o estado é derivado da rota (fonte única de verdade) → duplo clique não dispara segunda animação; o `Link` já deduplica navegações.
- O estado do form não é resetado na troca de estado (o componente não é remontado).

---

## 7. Arquivos

| Arquivo | Ação |
|---|---|
| `app/src/modules/access/components/AuthExperience.tsx` | **novo** — landing + login, card compartilhado, chip do logo, ações, recursos |
| `app/src/modules/access/components/LoginForm.tsx` | **novo** — extração do form de `LoginPage.tsx` (sem alteração de comportamento) |
| `app/src/modules/access/auth-experience.css` | **novo** — coreografia (tracks, timings por direção, stagger, reduced-motion) |
| `app/src/modules/access/auth-experience.test.tsx` | **novo** — logo único e estável entre estados, `inert`/`aria-hidden`, rotas preservadas |
| `app/src/modules/access/pages/LoginPage.tsx` | **removido** — markup absorvido pelo `AuthExperience` (brand panel + form panel) |
| `app/src/App.tsx` | editado — removida a `LandingPage`, adicionada rota de layout `AuthLayout`, `HomeRoute` ajustado |
| `app/src/modules/shared/components/AppShell.tsx` | editado — logo novo no header (wordmark da arte dispensa o texto "ALMOX" ao lado) |
| `app/vitest.config.ts` | editado — `include` passa a aceitar `src/**/*.test.tsx` (mantém os testes `.ts` existentes) |
| `app/assets/logo_almox.png`, `app/src/assets/logo_almox.png` | **substituídos** pela arte nova (recortada no conteúdo, 900×528) |
| `app/public/logo_almox.png` | **substituído** — favicon: quadrado escuro com a arte |

Sem dependências novas; `package.json` e `package-lock.json` intocados.

---

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Animação de grid track é *layout*-heavy | Árvore pequena; medido ≈60 fps (mediana 17 ms/quadro) em Chromium |
| Safari antigo (<16) sem interpolação de grid | Projeto já exige navegadores atuais (RNF07); fallback = troca instantânea, sem quebra funcional |
| Altura do form variando durante a transição | `min-width: 28rem` (desktop) estabiliza o conteúdo; `max-height` anima a altura do painel |
| Alerta de erro crescer o form | Card é content-driven → cresce sem clipping |
| Regressão de layout no landing | Card 448×302 (conteúdo), respiro vertical original, recursos em `max-w-3xl`, tokens intactos |
| Foco em campo invisível | `inert` + `aria-hidden` em ambos os painéis |
| Testes de componente inexistentes no projeto | `vitest.config.ts` só ganha um glob; `jsdom` e `@testing-library/react` já instalados |

---

## 9. Verificação

**Checks do projeto** (mesma ordem do CI em `.github/workflows/pages.yml`):
```bash
cd app
npm run lint
npm run typecheck
npm run test
VITE_BASE_PATH=/almox/ VITE_OFFLINE_MODE=true npm run build
```

**Verificação funcional/visual** (Playwright + Chromium/Firefox, dev server em modo offline):

| # | Cenário | Resultado |
|---|---|---|
| 1 | `/almox` direto | card 448×302, logo único, respiro vertical original, centralizado na tela |
| 2 | Clique em "Entrar no sistema" | card expande 448 → 1104 px, logo viaja do centro e encolhe 320 → 216 px, sem flash nem duplicação |
| 3 | Painel de marca | vidro fosco cresce pela esquerda; logo sem placa branca |
| 4 | Painel de login | entra por baixo do painel de marca (`translateX`) com revelação vertical do conteúdo em stagger |
| 5 | Formulário | validação (e-mail/senha), erro de credenciais, login demo (`admin@almox.test`) → painel RF14, link "Esqueci minha senha" |
| 6 | Back do navegador | animação reversa: card recolhe para 448×302, logo volta ao centro, foco volta ao botão, scroll no topo |
| 7 | `/almox/login` direto | estado login sem animação de entrada; sem reload |
| 8 | `prefers-reduced-motion` | sem movimento espacial; cross-fade curto; layout final idêntico |
| 9 | Mobile 390×844 / tablet 820×1180 | layout vertical, banner compacto, sem overflow horizontal (scrollWidth = clientWidth) |
| 10 | Larguras 1280/1440/1920 | card centralizado na tela (delta 0 px) nos dois estados |
| 11 | Firefox 146 e Chromium | mesmas geometrias e transições (interpolação de grid track confirmada nos dois motores) |
| 12 | Build de produção (`/almox/`) | deep link, refresh, transição e back funcionando no bundle final |
