// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { mockApi, resetStore } from "@/lib/mock-store"
import { csvFileName, escapeCell, formatCell, toCsv } from "./csv"
import { dateRangeToIso } from "./services/admin-api"

const ADMIN = { email: "admin@almox.test", password: "Test1234!" }
const OPERATOR = { email: "operador@almox.test", password: "Test1234!" }

describe("CSV (RF15)", () => {
  it("formata números com vírgula, booleanos e datas", () => {
    expect(formatCell("2.5", "number")).toBe("2,5")
    expect(formatCell(-3, "number")).toBe("-3")
    expect(formatCell(true, "boolean")).toBe("Sim")
    expect(formatCell(false, "boolean")).toBe("Não")
    expect(formatCell(null)).toBe("")
  })

  it("neutraliza fórmulas em texto, mas não em números", () => {
    expect(formatCell("=HYPERLINK(\"x\")")).toBe("'=HYPERLINK(\"x\")")
    expect(formatCell("+5")).toBe("'+5")
    expect(formatCell("@cmd")).toBe("'@cmd")
    expect(formatCell(-2, "number")).toBe("-2")
  })

  it("escapa separador, aspas e quebras de linha", () => {
    expect(escapeCell("a;b")).toBe('"a;b"')
    expect(escapeCell('diz "oi"')).toBe('"diz ""oi"""')
    expect(escapeCell("linha1\nlinha2")).toBe('"linha1\nlinha2"')
    expect(escapeCell("simples")).toBe("simples")
  })

  it("inclui BOM, metadados (filtros e geração) e cabeçalho", () => {
    const csv = toCsv([{ key: "sku", label: "SKU" }, { key: "qty", label: "Saldo", type: "number" }], [{ sku: "EPI-001", qty: 1.5 }], [["Gerado em (servidor)", "12/11/2026"], ["Filtro: situação", "Todos"]])
    expect(csv.startsWith("﻿")).toBe(true)
    const lines = csv.slice(1).split("\r\n")
    expect(lines[0]).toBe("Gerado em (servidor);12/11/2026")
    expect(lines[1]).toBe("Filtro: situação;Todos")
    expect(lines[2]).toBe("")
    expect(lines[3]).toBe("SKU;Saldo")
    expect(lines[4]).toBe("EPI-001;1,5")
  })

  it("gera nome de arquivo com carimbo de data", () => {
    expect(csvFileName("saldos", "2026-11-12T10:20:30")).toBe("almox-saldos-20261112-102030.csv")
  })

  it("converte período local em intervalo [início, fim exclusivo)", () => {
    const r = dateRangeToIso("2026-11-01", "2026-11-01")
    expect(r.from).not.toBeNull()
    expect(new Date(r.toExclusive!).getTime() - new Date(r.from!).getTime()).toBe(24 * 3600 * 1000)
    expect(dateRangeToIso().from).toBeNull()
  })
})

describe("modo offline — RF14/RF15/RF16", () => {
  beforeEach(() => {
    localStorage.clear()
    resetStore()
  })

  it("RF14: indicadores coincidem com os saldos e priorizam zerados", () => {
    mockApi.signIn(OPERATOR.email, OPERATOR.password)
    const s = mockApi.dashboardSummary()
    const products = mockApi.listProducts({ pageSize: 100 }).items
    const active = products.filter((p) => p.active)
    const qty = (p: (typeof products)[number]) => Number((Array.isArray(p.stock_balances) ? p.stock_balances[0] : p.stock_balances)?.quantity ?? 0)
    expect(s.counts.active_products).toBe(active.length)
    expect(s.counts.zero_balance).toBe(active.filter((p) => qty(p) === 0).length)
    expect(s.counts.at_or_below_minimum).toBe(active.filter((p) => qty(p) <= Number(p.minimum_stock)).length)
    expect(s.alerts.length).toBe(s.counts.at_or_below_minimum)
    const firstNonZero = s.alerts.findIndex((a) => Number(a.quantity) > 0)
    const lastZero = s.alerts.map((a) => Number(a.quantity)).lastIndexOf(0)
    if (firstNonZero >= 0 && lastZero >= 0) expect(lastZero).toBeLessThan(firstNonZero)
  })

  it("RF15: exportação exige administrador e respeita filtros", () => {
    mockApi.signIn(OPERATOR.email, OPERATOR.password)
    expect(() => mockApi.exportBalances({})).toThrow("EXPORT_ADMIN_REQUIRED")
    mockApi.signIn(ADMIN.email, ADMIN.password)
    const zero = mockApi.exportBalances({ situation: "zero_balance" })
    expect(zero.rows.every((r) => r.active && Number(r.quantity) === 0)).toBe(true)
    expect(zero.row_count).toBe(zero.rows.length)
    const exits = mockApi.exportMovements({ kind: "SAIDA", from: null, toExclusive: null })
    expect(exits.rows.length).toBeGreaterThan(0)
    expect(exits.rows.every((r) => r.kind === "SAIDA")).toBe(true)
  })

  it("RF16: convite cria perfil inativo, sem duplicar, e só admin gerencia", () => {
    mockApi.signIn(OPERATOR.email, OPERATOR.password)
    expect(() => mockApi.listUsers()).toThrow("USER_ADMIN_REQUIRED")
    mockApi.signIn(ADMIN.email, ADMIN.password)
    const input = { email: "nova@almox.test", displayName: "Nova Pessoa", role: "employee" as const, operationKey: "k1" }
    const first = mockApi.inviteUser(input)
    const replay = mockApi.inviteUser(input)
    expect(replay.id).toBe(first.id)
    expect(() => mockApi.inviteUser({ ...input, displayName: "Outra" })).toThrow("OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT")
    const invited = mockApi.listUsers().find((u) => u.email === "nova@almox.test")
    expect(invited?.active).toBe(false)
    expect(mockApi.listUsers().filter((u) => u.email === "nova@almox.test")).toHaveLength(1)
    expect(() => mockApi.inviteUser({ ...input, operationKey: "k2" })).toThrow("USER_ALREADY_EXISTS")
  })

  it("RF16/RN17: não remove o último administrador ativo", () => {
    mockApi.signIn(ADMIN.email, ADMIN.password)
    const admin = mockApi.listUsers().find((u) => u.email === ADMIN.email)!
    const operator = mockApi.listUsers().find((u) => u.email === OPERATOR.email)!
    expect(() => mockApi.setUserActive(admin.id, false)).toThrow("LAST_ADMIN_REQUIRED")
    expect(() => mockApi.setUserRole(admin.id, "employee")).toThrow("LAST_ADMIN_REQUIRED")
    mockApi.setUserRole(operator.id, "admin")
    expect(mockApi.setUserRole(admin.id, "employee").changed).toBe(true)
  })

  it("RF16: usuário desativado deixa de ter sessão ativa", () => {
    mockApi.signIn(ADMIN.email, ADMIN.password)
    const operator = mockApi.listUsers().find((u) => u.email === OPERATOR.email)!
    mockApi.setUserActive(operator.id, false)
    expect(mockApi.signIn(OPERATOR.email, OPERATOR.password)?.active).toBe(false)
  })

  it("RF10 offline: recusa versão desatualizada e calcula o ajuste", () => {
    mockApi.signIn(ADMIN.email, ADMIN.password)
    const p = mockApi.getProduct("prd-luva")
    const live = Array.isArray(p.stock_balances) ? p.stock_balances[0]! : p.stock_balances!
    const bal = { quantity: Number(live.quantity), version: live.version }
    expect(() => mockApi.adjustStockByCount({ productId: p.id, countedQuantity: "10", expectedVersion: bal.version - 1, reason: "teste", operationKey: "a" })).toThrow("STOCK_VERSION_CHANGED")
    const r = mockApi.adjustStockByCount({ productId: p.id, countedQuantity: "10", expectedVersion: bal.version, reason: "Inventário", operationKey: "b" })
    expect(Number(r.delta)).toBe(10 - Number(bal.quantity))
    expect(r.balance).toBe("10")
  })
})
