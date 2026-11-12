// RF15 — geração de CSV compatível com Excel pt-BR (UTF-8 com BOM, separador ";").
// Também neutraliza injeção de fórmulas em campos de texto (CWE-1236).

export type CsvColumnType = "text" | "number" | "datetime" | "boolean"

export interface CsvColumn<Row> {
  key: keyof Row & string
  label: string
  type?: CsvColumnType
}

const DELIMITER = ";"
const EOL = "\r\n"
const FORMULA_PREFIX = /^[=+\-@\t\r]/

function formatDateTimeCell(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(d)
}

export function formatCell(value: unknown, type: CsvColumnType = "text"): string {
  if (value === null || value === undefined || value === "") return ""
  if (type === "number") {
    const n = typeof value === "number" ? value : Number(value)
    return Number.isFinite(n) ? String(n).replace(".", ",") : ""
  }
  if (type === "boolean") return value === true || value === "true" ? "Sim" : "Não"
  if (type === "datetime") return formatDateTimeCell(String(value))
  const text = String(value)
  return FORMULA_PREFIX.test(text) ? `'${text}` : text
}

export function escapeCell(text: string): string {
  if (/[";\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCsv<Row>(columns: CsvColumn<Row>[], rows: Row[], meta: Array<[string, string]> = []): string {
  const lines: string[] = []
  for (const [label, value] of meta) lines.push([escapeCell(formatCell(label)), escapeCell(formatCell(value))].join(DELIMITER))
  if (meta.length > 0) lines.push("")
  lines.push(columns.map((c) => escapeCell(formatCell(c.label))).join(DELIMITER))
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCell(formatCell(row[c.key], c.type))).join(DELIMITER))
  }
  return "﻿" + lines.join(EOL) + EOL
}

export function csvFileName(prefix: string, generatedAt: string) {
  const d = new Date(generatedAt)
  const stamp = Number.isNaN(d.getTime())
    ? "export"
    : `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`
  return `almox-${prefix}-${stamp}.csv`
}

export function downloadCsv(fileName: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
