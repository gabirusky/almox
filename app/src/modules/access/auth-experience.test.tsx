// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { AuthExperience, type AuthView } from "./components/AuthExperience"

vi.mock("@/modules/access/use-auth", () => ({
  useAuth: () => ({
    status: "anonymous",
    signInWithPassword: async () => null,
    requestPasswordReset: async () => null,
  }),
}))

beforeAll(() => {
  // jsdom não implementa scrollIntoView/scrollTo.
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = (() => {}) as typeof window.scrollTo
})

afterEach(() => {
  cleanup()
})

function renderizar(view: AuthView) {
  const arvore = (
    <MemoryRouter initialEntries={["/"]}>
      <AuthExperience view={view} />
    </MemoryRouter>
  )
  const utils = render(arvore)
  return {
    ...utils,
    trocarEstado: (proximo: AuthView) => utils.rerender(
      <MemoryRouter initialEntries={["/"]}>
        <AuthExperience view={proximo} />
      </MemoryRouter>,
    ),
  }
}

describe("experiência de acesso (landing ⇄ login)", () => {
  it("mantém um único logo e o mesmo elemento DOM entre os dois estados", () => {
    const { container, trocarEstado } = renderizar("landing")
    const logo = container.querySelector(".authx__chip img")
    expect(logo).not.toBeNull()
    expect(container.querySelectorAll(".authx__chip img")).toHaveLength(1)

    trocarEstado("login")

    // o logo não é duplicado nem recriado: é o mesmo elemento viajando
    expect(container.querySelectorAll(".authx__chip img")).toHaveLength(1)
    expect(container.querySelector(".authx__chip img")).toBe(logo)
  })

  it("no landing o formulário fica inerte e fora da árvore de acessibilidade", () => {
    const { container } = renderizar("landing")
    const painel = container.querySelector(".authx__form")
    expect(painel?.getAttribute("aria-hidden")).toBe("true")
    expect(painel?.hasAttribute("inert")).toBe(true)
    expect(screen.getByRole("link", { name: "Entrar no sistema" })).toBeTruthy()
  })

  it("no login o formulário fica disponível para uso e foco", () => {
    const { container } = renderizar("login")
    const painel = container.querySelector(".authx__form")
    expect(painel?.getAttribute("aria-hidden")).toBe("false")
    expect(painel?.hasAttribute("inert")).toBe(false)
    expect(screen.getByLabelText("E-mail")).toBeTruthy()
    expect(screen.getByLabelText("Senha")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Esqueci minha senha" })).toBeTruthy()
  })

  it("no login as ações do landing saem da navegação por teclado", () => {
    const { container } = renderizar("login")
    const acoes = container.querySelector(".authx__actions")
    expect(acoes?.getAttribute("aria-hidden")).toBe("true")
    expect(acoes?.hasAttribute("inert")).toBe(true)
  })

  it("mantém a entrada em /login e a recuperação de senha", () => {
    const { container, trocarEstado } = renderizar("landing")
    expect(screen.getByRole("link", { name: "Entrar no sistema" }).getAttribute("href")).toBe("/login")
    // colapsado: o formulário não é exposto à árvore de acessibilidade
    expect(screen.queryByRole("link", { name: "Esqueci minha senha" })).toBeNull()

    trocarEstado("login")
    expect(screen.getByRole("link", { name: "Esqueci minha senha" }).getAttribute("href")).toBe("/recuperar-senha")
    expect(container.querySelectorAll(".authx__chip img")).toHaveLength(1)
  })
})
