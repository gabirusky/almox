# Transição landing ⇄ login (ALMOX)

> Referência técnica da experiência única de acesso público: `/` e `/login` são **dois estados visuais do mesmo componente**, e o logo viaja entre eles sem ser duplicado nem remontado.
> O plano original da feature está em [`landing-login-animation-plan.md`](./landing-login-animation-plan.md); o roteiro de verificação manual está em [`demo-landing-login.md`](./demo-landing-login.md).

---

## 1. Resumo

| Item | Antes | Depois |
|---|---|---|
| Landing (`/`) | `LandingPage` declarado dentro de `app/src/App.tsx`; card quadrado com logo e botões | `AuthExperience view="landing"` — card do mesmo componente do login |
| Login (`/login`) | `pages/LoginPage.tsx` (grid `lg:grid-cols-[1fr_2fr]`, painel de marca + formulário) | `AuthExperience view="login"` — o **mesmo** card, com o formulário revelado |
| Logo | duas imagens em telas diferentes | **um único `<img>`** que viaja do centro do card para o painel de marca |
| Transição entre telas | corte seco (troca de rota, remontagem) | coreografia CSS contínua e reversível, sem reload |
| Biblioteca de animação | nenhuma | **nenhuma** — CSS nativo; `package.json` intocado |
| Dependências novas | — | **zero** |

**O que a feature não toca:** autenticação (`auth-context.tsx`, `use-auth.ts`, `guards.tsx`, `mock-store.ts`), chamadas Supabase, chaves/RLS/RPCs, rotas, `basename`/`VITE_BASE_PATH`, copy, tokens de cor e tipografia. (Único item visual alterado: o **asset** do logo, substituído pela arte horizontal nova — ver seção 6.)

---

## 2. Arquitetura

### 2.1 Rota de layout (o heart da solução)

```text
App
└── AppShell
    └── Routes
        └── Route element={<AuthLayout/>}          ← rota de layout: mantém a árvore viva
            ├── "/"     → HomeRoute (autenticado → painel RF14)
            └── "/login" → PublicOnly (redireciona se autenticado)
```

`AuthLayout` (`app/src/App.tsx`) decide o que renderizar:

| Condição | Resultado |
|---|---|
| `pathname === "/"` e status `anonymous`/`misconfigured` | `<AuthExperience view="landing" />` |
| `pathname === "/login"` e status ≠ `loading`/`authenticated` | `<AuthExperience view="login" />` |
| Demais casos (loading, autenticado, inativo) | `<Outlet/>` — comportamento anterior intacto |

**Por que rota de layout:** `PublicOnly`/`HomeRoute` mudariam de posição na árvore React, remontando o componente e matando a continuidade do logo. Com rota de layout, o `AuthExperience` permanece no **mesmo slot** → React preserva a instância → o `<img>` do logo é literalmente o mesmo nó durante a animação (garantido por teste automatizado, seção 7).

**Contratos preservados dos guards:**

- `PublicOnly` continua em `/login`: autenticado → `Navigate to "/"`.
- `loading` → `PublicOnly` mostra o `LoadingSkeleton` (o `AuthLayout` não intercepta nesse estado).
- `inactive` → cai em `view="login"`: o usuário inativo continua vendo a tela de acesso, não a landing.
- `HomeRoute` devolve `null` no caso público anônimo (a landing passou a viver no `AuthExperience`).

### 2.2 Árvore de componentes

```text
AuthExperience (view: "landing" | "login")
├── Hero wrapper (largura animada 28rem → 72rem + halo decorativo)
│   └── Card (grid; tracks animam 100% 0% → 33.3333% 66.6667%)
│       ├── BrandPanel (coluna 1)
│       │   ├── BrandBg (vidro fosco neutro: width 0 → 100% da coluna + opacity)
│       │   ├── Chip  ← único <img src=logo_almox.png> da tela (sem placa)
│       │   └── Actions (botões do landing; colapsa max-height/opacity/gap)
│       └── LoginPanel (coluna 2)
│           └── LoginForm (extraído de LoginPage.tsx; auth intacta)
└── Recursos (seção do landing; colapsa na saída)
```

| Componente | Papel |
|---|---|
| `modules/access/components/AuthExperience.tsx` | Casca compartilhada: card, chip do logo, ações, recursos, foco/rolagem, `data-view`. |
| `modules/access/components/LoginForm.tsx` | Extração literal do formulário de `pages/LoginPage.tsx`: mesmo `zodResolver`, mesmos campos, mesma `signInWithPassword`, mesmo `navigate(from, { replace: true })` lendo `location.state.from`, mesmo link "Esqueci minha senha". |

### 2.3 Origem do estado

- **Fonte única de verdade:** a URL (`location.pathname`), com o status de sessão como condição de entrada.
- Duplo clique não dispara segunda animação: o `<Link>` já deduplica navegações e o estado é derivado, não imperativo.
- O formulário **não é resetado** na troca de estado (o componente não é remontado).

---

## 3. Estratégia de animação — CSS puro

Estado único: atributo `data-view="landing|login"` na raiz `.authx`. Cada estado declara seus próprios valores de `transition` — e como a transição usa os valores do **estado novo**, ida e volta têm coreografias diferentes **sem encadeamento de timeouts em JS**.

### 3.1 Coreografia

| Elemento | Propriedade | Landing | Login | Ida | Volta |
|---|---|---|---|---:|---:|
| `.authx` (container) | `padding-block` | 3rem (4rem ≥1024px) | 0 | 520 ms | 430 ms |
| `.authx__hero` | `max-width` | 28rem (448 px) | 72rem (1152 px) — limitado a ~1104 px pelo `main` do shell | 520 ms | 430 ms |
| `.authx__card` | `grid-template-columns` | `100% 0%` | `33.3333% 66.6667%` | 500 ms | 420 ms |
| `.authx__card` | `padding` | 1.5rem | 0 | 520 ms | 430 ms |
| `.authx__brand` | `gap` / `padding` | 1.25rem / 0 | 0 / 1.5rem | 240 ms / 420 ms | 220 ms / 380 ms |
| `.authx__brandBg` | `width` + `opacity` | 0 / 0 | 100% / 1 | 420 ms | 380 ms |
| `.authx__chip` (logo) | `width` | 20rem (320 px) ≥640px · 16rem (256 px) <640px | 13.5rem (216 px) ≥1024px · 8.4375rem (135 px) <1024px | 480 ms | 420 ms |
| `.authx__actions` | `max-height` + `opacity` | 8rem / 1 | 0 / 0 | 240 ms | 220 ms |
| `.authx__form` | `max-height` | 0 | 34rem ≥1024px · 46rem <1024px | 520 ms | 420 ms |
| `.authx__formInner` | `transform` + `opacity` | `translateX(-100%)` (desktop) / `translateY(-0.75rem)` (mobile) | `translateX(0)` / `translateY(0)` | 520 ms | 420 ms |
| `.authx__step` (×6) | `opacity` + `translateY` | 0 / 0.5rem | 1 / none | 300 ms (delay 280–530 ms) | 180 ms |
| `.authx__resources` | `max-height` + `opacity` + `margin-top` | 40rem / 1 / 4–5rem | 0 / 0 / 0 | 520 ms | 430 ms |
| `.authx__glow` (halo) | `opacity` | 1 | 0 | 520 ms | 430 ms |

Curva: `cubic-bezier(0.4, 0, 0.2, 1)` (padrão material). Uma curva *ease-out* muito agressiva foi descartada na verificação: o movimento terminava ~3× antes do esperado e a viagem do logo ficava ilegível.

### 3.2 Variáveis CSS (ponto único de ajuste)

Todas as durações vivem em custom properties na raiz `.authx`:

```css
.authx {
  --authx-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --authx-dur-card: 520ms;     /* container, hero, card, recursos, halo */
  --authx-dur-cols: 500ms;     /* tracks do grid */
  --authx-dur-chip: 480ms;     /* logo */
  --authx-dur-bg: 420ms;       /* vidro fosco */
  --authx-dur-actions: 240ms;  /* botões do landing */
  --authx-dur-panel: 520ms;    /* coluna do form + conteúdo */
  --authx-dur-step: 300ms;     /* revelação do conteúdo (entrada) */
  --authx-dur-step-out: 180ms; /* revelação do conteúdo (saída) */
}

/* direção inversa (login → landing): encolhe mais rápido, sem stagger */
.authx[data-view="landing"] {
  --authx-dur-card: 430ms;
  --authx-dur-cols: 420ms;
  --authx-dur-chip: 420ms;
  --authx-dur-bg: 380ms;
  --authx-dur-actions: 220ms;
  --authx-dur-panel: 420ms;
}
```

> **Pegadinha:** o bloco `[data-view="landing"]` define os tempos da **volta** (o estado novo é `landing`). O bloco base (sem seletor de estado) define os tempos da **ida** (estado novo = `login`). Ao mexer em um tempo, ajuste o par nos dois blocos.

### 3.3 Stagger do formulário

Seis etapas (`data-step="1..6"`) no `LoginForm`, reveladas em cascata só no estado `login`:

| Etapa | Elemento | Delay |
|---|---|---:|
| 1 | Título "Entrar" | 280 ms |
| 2 | Subtítulo | 330 ms |
| 3 | Campo e-mail | 380 ms |
| 4 | Campo senha | 430 ms |
| 5 | Botão "Entrar" | 480 ms |
| 6 | Link "Esqueci minha senha" | 530 ms |

Na volta não há stagger: as etapas usam `--authx-dur-step-out` (180 ms) e `transition-delay: 0ms`.

### 3.4 Como o logo viaja sem FLIP

O chip do logo é item da **coluna 1** do grid do card. A coluna encolhe de `100%` → `33,33%` enquanto o card cresce de 448 → ~1104 px (limitado pelo `main` do shell, `max-w-6xl` com `px-6`); como o chip está centralizado na coluna, sua posição é consequência direta da interpolação das tracks:

- movimento contínuo, sem medição (`getBoundingClientRect`), sem duplicar elemento, sem biblioteca;
- suporte nativo em Chrome 107+, **Firefox 66+**, Safari 16+ (interpolação de `grid-template-columns`);
- medido em Playwright: ~28–29 posições distintas por quadro, mediana 17 ms/quadro (≈60 fps), p90 41 ms — a animação é *layout*-heavy, mas a árvore é pequena.

**Alternativa descartada:** Motion/Framer Motion. O layout exigido (tracks em `fr`/`%`, translação do logo, revelação em camadas, stagger) é melhor servido por transição CSS nativa; adicionar ~40 kB gzip sem ganho visual seria custo sem retorno.

---

## 4. Layout e responsividade

1. **Altura do card é content-driven.** Não há `min-height` fixo: no landing o card abraça o conteúdo (logo + gap + botões `h-11`) — ~448×302 px; no login ele acompanha o formulário. O painel do form anima `max-height`, então a altura cresce continuamente durante a transição (sem salto) e ainda pode crescer quando o `Alert` de erro aparece.
2. **Altura estável do formulário.** No desktop, `min-width: 28rem` no painel mantém o texto numa largura estável (sem quebra de linha a cada quadro); no mobile não se aplica (evita overflow horizontal).
3. **Margens.** O landing mantém o respiro original (`padding-block` 3rem/4rem); o login encosta no topo do `main`. O card permanece **centralizado na tela** em ambos os estados e em todas as larguras (delta 0 px contra `clientWidth` em 1280/1440/1920).
4. **Sem placa em volta do logo.** O chip não tem fundo, borda ou sombra: no landing o logo fica direto no card branco; no login, direto sobre o painel de marca.
5. **Painel de marca em vidro fosco.** Superfície translúcida neutra (`rgb(238 242 241 / 0.55)` + `backdrop-filter: blur(26px) saturate(140%)`), sem manchas de cor; borda clara de 1 px separa o vidro do formulário.
6. **Logo e botões alinhados.** No desktop o wordmark ocupa exatamente a largura da linha de botões (320 px + respiro de 0,5 rem), com separação mínima de 0,75 rem entre os dois botões, de modo que as bordas externas dos botões alinham com as bordas do logo (0,00 px de diferença). O wrapper do landing é 28rem (`padding: 1.5rem` no card) para que o conteúdo ganhe respiro interno sem encolher a marca: a faixa entre a borda do card e o conteúdo passa de 24 px (16 de padding + 8 de margem) para 40 px.
7. **Mobile (<1024 px).** Grid de uma coluna; a marca vira **banner compacto** (vidro fosco + logo) acima do formulário; a revelação é **vertical** (`max-height: 0 → 46rem`); o chip encolhe no lugar (topo preservado), sem salto vertical.
8. **Seção "Recursos".** Vive fora do card, em wrapper `max-w-3xl` (mantém a largura atual) e permanece montada para poder colapsar na saída.
9. **Scroll.** Entrando no login: `window.scrollTo(0)`. Voltando: também `window.scrollTo(0)`, com foco no botão "Entrar no sistema".
10. **Overflow horizontal.** O halo decorativo passa da borda do card; `overflow-x: clip` no container impede scroll lateral (8 px no mobile) sem afetar o header sticky.

---

## 5. Acessibilidade

| Ponto | Implementação |
|---|---|
| Painel colapsado | Estado `landing`: o painel do formulário recebe `inert` + `aria-hidden="true"` → não recebe foco por teclado e sai da árvore de acessibilidade. |
| Ações colapsadas | Estado `login`: as ações do landing recebem `inert` + `aria-hidden="true"` (mesma lógica invertida). |
| Foco na ida | Após a transição para o login, o foco vai para o campo de e-mail (`focus({ preventScroll: true })`, timer de 900 ms). |
| Foco na volta | O foco volta para o botão "Entrar no sistema" (timer de 520 ms) + rolagem ao topo. |
| `prefers-reduced-motion` | A regra global de `index.css` zera as transições; uma regra escopada (especificidade maior) mantém apenas um **cross-fade de 120 ms** no conteúdo do form, preservando os layouts finais — sem o movimento espacial. |
| Sem flash de foco | O foco só é movido depois que a transição termina, e nunca sobrepõe o foco que o usuário já tinha (`!raizRef.current?.contains(document.activeElement)`). |
| Cliques rápidos | Estado derivado da rota (fonte única de verdade) → duplo clique não dispara segunda animação. |

---

## 6. Identidade visual (assets do logo)

| Arquivo | Formato | Uso |
|---|---|---|
| `app/assets/logo-nobg.png` | 1536×1024 RGBA, fundo transparente | Arte-mestra (marca + wordmark), sem fundo. |
| `app/assets/logo_almox.png` | 900×528 RGBA, fundo transparente | Recorte da arte-mestra, proporção 1,70:1 (fonte de origem). |
| `app/src/assets/logo_almox.png` | 900×528 RGBA | Cópia consumida pelo frontend (`import logo from "@/assets/logo_almox.png"`). |
| `app/public/logo_almox.png` | 256×256 quadrado escuro | Favicon: quadrado navy com a marca centralizada. |

Cores da arte: navy `#002030` + verde `#00A060`. A arte é horizontal e **escura**, então substitui a anterior em todos os pontos de uso (`AppShell`, `AccessStatusPages`, `RecoverPasswordPage`, `AuthExperience`) sem variação de cor: a mesma arte funciona em fundo claro (landing, header, páginas de acesso) e sobre o painel de marca.

Mudança no shell: o wordmark da arte dispensa o texto "ALMOX" ao lado do logo no header (`AppShell.tsx` → `Brand`), que agora renderiza só a imagem (`h-10 w-auto`, `alt="ALMOX"`).

---

## 7. Testes automatizados

Arquivo: `app/src/modules/access/auth-experience.test.tsx` (ambiente `jsdom` via `// @vitest-environment jsdom`).

| Caso | O que garante |
|---|---|
| "mantém um único logo e o mesmo elemento DOM entre os dois estados" | Existe exatamente 1 `.authx__chip img`; após trocar para `login` é **a mesma referência** (`toBe`), ou seja: o logo não é duplicado nem recriado. |
| "no landing o formulário fica inerte e fora da árvore de acessibilidade" | `.authx__form` com `aria-hidden="true"` + `inert`; o botão "Entrar no sistema" continua acessível. |
| "no login o formulário fica disponível para uso e foco" | `.authx__form` com `aria-hidden="false"` e **sem** `inert`; e-mail, senha, botão "Entrar" e link de recuperação presentes. |
| "no login as ações do landing saem da navegação por teclado" | `.authx__actions` com `aria-hidden="true"` + `inert`. |
| "mantém a entrada em /login e a recuperação de senha" | Link "Entrar no sistema" → `/login`; link "Esqueci minha senha" ausente da árvore no landing e presente em `/recuperar-senha` no login; logo único nos dois estados. |

**Ajuste de infraestrutura:** `app/vitest.config.ts` passou a aceitar `src/**/*.test.tsx` (o glob `.ts` existente foi mantido):

```diff
-    include: ["src/**/*.test.ts"],
+    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
```

`jsdom` e `@testing-library/react` já estavam instalados — nenhuma dependência nova.

---

## 8. Arquivos alterados

| Arquivo | Natureza | O que mudou |
|---|---|---|
| `app/src/modules/access/components/AuthExperience.tsx` | **novo** | Landing + login no mesmo componente; card, chip do logo, ações, recursos, foco/rolagem. |
| `app/src/modules/access/components/LoginForm.tsx` | **novo** | Extração do formulário de `LoginPage.tsx` (sem alteração de comportamento). |
| `app/src/modules/access/auth-experience.css` | **novo** | Coreografia (tracks, timings por direção, stagger, reduced-motion). |
| `app/src/modules/access/auth-experience.test.tsx` | **novo** | Logo único e estável entre estados, `inert`/`aria-hidden`, rotas preservadas. |
| `app/src/modules/access/pages/LoginPage.tsx` | **removido** | Markup absorvido pelo `AuthExperience` (brand panel + form panel). |
| `app/src/App.tsx` | editado | Removida a `LandingPage`; adicionada a rota de layout `AuthLayout`; `HomeRoute` ajustado. |
| `app/src/modules/shared/components/AppShell.tsx` | editado | Header passa a usar só a arte (wordmark embutido). |
| `app/vitest.config.ts` | editado | `include` aceita `src/**/*.test.tsx`. |
| `app/assets/logo-nobg.png` | **novo** | Arte-mestra 1536×1024 sem fundo. |
| `app/assets/logo_almox.png`, `app/src/assets/logo_almox.png` | substituídos | Arte horizontal nova (recorte 900×528). |
| `app/public/logo_almox.png` | substituído | Favicon 256×256 (quadrado navy + marca). |

Sem dependências novas: `package.json` e `package-lock.json` intocados.

---

## 9. Checks e verificação

**Checks do projeto** (mesma ordem do CI em `.github/workflows/pages.yml`):

```bash
cd app
npm run lint
npm run typecheck
npm run test
VITE_BASE_PATH=/almox/ VITE_OFFLINE_MODE=true npm run build
```

**Verificação funcional/visual** (Playwright + Chromium/Firefox, dev server em modo offline): ver o roteiro passo a passo em [`demo-landing-login.md`](./demo-landing-login.md).

---

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Animação de grid track é *layout*-heavy | Árvore pequena; medido ≈60 fps (mediana 17 ms/quadro) em Chromium. |
| Safari antigo (<16) sem interpolação de grid | Projeto já exige navegadores atuais (RNF07); fallback = troca instantânea, sem quebra funcional. |
| Altura do form variando durante a transição | `min-width: 28rem` (desktop) estabiliza o conteúdo; `max-height` anima a altura do painel. |
| Alerta de erro crescer o form | Card é content-driven → cresce sem clipping. |
| Regressão de layout no landing | Card content-driven, respiro vertical original, recursos em `max-w-3xl`, tokens intactos. |
| Foco em campo invisível | `inert` + `aria-hidden` em ambos os painéis. |
| Testes de componente inexistentes no projeto | `vitest.config.ts` só ganha um glob; `jsdom` e `@testing-library/react` já instalados. |

---

## 11. Manutenção — onde mexer

| Objetivo | Ponto de edição |
|---|---|
| Ajustar ritmo da animação | `auth-experience.css` → bloco `.authx` e bloco `.authx[data-view="landing"]` (ajustar **os dois**). |
| Trocar a curva de easing | `--authx-ease` em `.authx`. |
| Reordenar a revelação do form | `data-step` no `LoginForm.tsx` + delays em `.authx__step[data-step="N"]`. |
| Adicionar/remover um campo do form | `LoginForm.tsx` (marcar com `authx__step` e um `data-step` novo; ajusta os delays). |
| Mudar o logo | `app/src/assets/logo_almox.png` (mantenha a proporção 1,70:1 e o fundo transparente) e ajuste as larguras em `.authx__chip`. |
| Desativar a animação | Neutralizar as `transition` em `.authx` (mantendo os estados finais) — o layout final é o mesmo nos dois estados. |

---

## 12. Rollback

A feature é isolada: basta reverter o commit (ou remover `AuthLayout` + restaurar `LandingPage`/`LoginPage`). Não há migração de dados, mudança de rota, alteração de API ou estado persistido — o rollback é puramente de código.
