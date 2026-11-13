# Transição landing ⇄ login — roteiro de verificação

Roteiro manual da experiência única de acesso público: `/` e `/login` são dois estados do mesmo componente, com o logo viajando entre eles. Referência técnica em [`landing-login-animation.md`](./landing-login-animation.md); plano original em [`landing-login-animation-plan.md`](./landing-login-animation-plan.md).

## Preparação

1. `cd app && npm ci` (ou `npm install`).
2. Modo offline/mock (sem Supabase): basta rodar `npm run dev` sem `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no `.env.local`, ou forçar `VITE_OFFLINE_MODE=true`.
3. Abrir `http://localhost:5173/` (em dev o `basename` é `/`; no Pages é `/almox/`).
4. Para o roteiro completo de produção: `VITE_BASE_PATH=/almox/ VITE_OFFLINE_MODE=true npm run build` e servir `app/dist` com fallback SPA (o CI copia `dist/index.html` para `404.html`).

Nenhuma credencial é necessária para os cenários 1–8 e 10–12; o cenário 5 usa o usuário de demonstração já semeado no modo offline.

---

## 1. Landing (anônimo)

- Abrir `/` diretamente (acesso direto, sem clique anterior).
- Esperado: card único centralizado, com o logo ALMOX, o botão "Entrar no sistema" e o botão "Conhecer recursos"; nenhuma tela de login visível; respiro vertical preservado.
- O logo aparece **uma única vez** na tela.

## 2. Ida: landing → login

- Clicar em "Entrar no sistema".
- Esperado: sem reload, sem flash e sem duplicação de logo; o card expande (~448 px → ~1104 px de largura útil) e o logo viaja do centro do card até o painel de marca, encolhendo (~320 px → ~216 px no desktop).
- Ao lado, o painel de marca ganha o fundo de vidro fosco pela esquerda; o formulário entra por baixo do painel de marca, com o conteúdo aparecendo em cascata (título, subtítulo, e-mail, senha, botão, link).
- O card continua **centralizado na tela** durante e depois da animação.

## 3. Ações do landing no login

- Esperado: os botões "Entrar no sistema" e "Conhecer recursos" desaparecem do painel de marca.
- Navegar por teclado (`Tab`): o foco **não** entra nos botões do landing nem no painel colapsado.

## 4. Voltar: login → landing

- Usar o botão "voltar" do navegador.
- Esperado: animação reversa (mais rápida, sem cascata); o card recolhe para ~448 px, o logo volta ao centro, a rolagem vai ao topo e o foco retorna ao botão "Entrar no sistema".
- O histórico do navegador preserva a entrada: avançar refaz a transição para o login.

## 5. Autenticação intacta

- Preencher e-mail/senha inválidos → mensagem de erro aparece no formulário, sem quebra de layout (o card cresce junto).
- Entrar com o usuário de demonstração (`admin@almox.test`) → o painel RF14 é exibido; a URL continua `/`.
- Usar "Esqueci minha senha" → vai para `/recuperar-senha`; o formulário de recuperação aparece normalmente.

## 6. Recarga e deep link

- Recarregar a página em `/login` → o estado `login` aparece direto, **sem animação de entrada** e sem reload de recursos.
- Acessar `/login` por URL direta (deep link) e por `404.html` do GitHub Pages → o mesmo resultado.

## 7. Estados de sessão

- Usuário autenticado em `/login` → redirecionado para `/` (painel RF14).
- Usuário inativo → continua vendo a tela de login (não a landing).
- Backend sem configuração (`/configuracao`) → a landing continua acessível para anônimo.

## 8. Recursos do MVP

- Na landing, clicar em "Conhecer recursos" → a seção de recursos expande e a rolagem suave chega até ela (a rolagem só acontece depois que o painel termina de expandir: a página precisa ganhar altura antes, senão o navegador limita o scroll ao topo).
- Clicar em "Ocultar recursos" → a seção colapsa e a rolagem volta ao topo da landing.
- Na transição para o login, a seção de recursos **colapsa** sem salto.

## 9. Movimento reduzido

- Ativar `prefers-reduced-motion` no sistema (ou no DevTools → *Emulate CSS media feature*) e repetir a ida e a volta.
- Esperado: **nenhum movimento espacial**; apenas um cross-fade curto (~120 ms) do conteúdo do formulário; o layout final é idêntico ao normal.

## 10. Responsivo

- 390×844 (mobile) e 820×1180 (tablet): layout vertical; a marca vira banner compacto acima do formulário; a revelação é vertical; sem rolagem horizontal (`scrollWidth === clientWidth`).
- 1280 / 1440 / 1920: card centralizado na tela (delta 0 px) nos dois estados.

## 11. Navegadores

- Repetir os cenários 1–5 em Chromium e Firefox: as mesmas geometrias e transições (a interpolação de `grid-template-columns` é suportada nos dois motores).

## 12. Bundle de produção

- Servir `app/dist` (build com `VITE_BASE_PATH=/almox/`) e repetir 1, 2, 4, 5 e 6 no bundle final: deep link, refresh, transição e voltar do navegador funcionam igual ao dev.

---

## Checklist automatizado

```bash
cd app
npm run lint        # oxlint
npm run typecheck   # tsc --noEmit
npm run test        # vitest run (inclui auth-experience.test.tsx)
```

Cobertura de `app/src/modules/access/auth-experience.test.tsx`: logo único e **mesmo elemento DOM** entre os estados, `inert`/`aria-hidden` em ambos os painéis, rotas `/login` e `/recuperar-senha` preservadas.

Registre o commit avaliado, o ambiente (dev/build), os resultados e eventuais erros.
