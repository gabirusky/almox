import type { Category, Department, MovementLogFilters, MovementLogItem, PaginatedMovements, PaginatedProducts, Product, ProductFormValues, ProductHistory, ProductListFilters, ReversalResult, StockBalance, StockMovement } from "@/modules/catalog/types"
import type { AlmoxRole, Profile } from "@/modules/access/types"
import type { StockAdjustmentResult } from "@/modules/catalog/types"
import type { AccessRequest, BalanceExportFilters, BalanceExportRow, DashboardSummary, ExportResult, InviteInput, ManagedUser, MovementExportFilters, MovementExportRow, StockAlert } from "@/modules/admin/types"

type UserRecord = { id: string; email: string; password: string; profile: Profile; created_at?: string; updated_at?: string; last_sign_in_at?: string | null; invited_at?: string | null }

type Store = {
  users: UserRecord[]
  categories: Category[]
  departments: Department[]
  products: Product[]
  movements: StockMovement[]
  accessRequests?: AccessRequest[]
}

const KEY = "almox.offline.store.v2"

const nowIso = () => new Date().toISOString()
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString()

function seed(): Store {
  const t = "2026-11-10T12:00:00.000Z"
  const catEpi: Category = { id: "cat-epi", name: "EPI", active: true, created_at: t, updated_at: t }
  const catFerr: Category = { id: "cat-ferr", name: "Ferramentas", active: true, created_at: t, updated_at: t }
  const catEsc: Category = { id: "cat-esc", name: "Escritório", active: true, created_at: t, updated_at: t }
  const catLimp: Category = { id: "cat-limp", name: "Limpeza", active: false, created_at: t, updated_at: t }
  const categories: Category[] = [catEpi, catFerr, catEsc, catLimp]
  const departments: Department[] = [
    { id: "dep-manut", name: "Manutenção", active: true, created_at: t, updated_at: t },
    { id: "dep-prod", name: "Produção", active: true, created_at: t, updated_at: t },
    { id: "dep-adm", name: "Administrativo", active: true, created_at: t, updated_at: t },
    { id: "dep-exp", name: "Expedição", active: false, created_at: t, updated_at: t },
  ]
  const adminUser: UserRecord = { id: "9018e72c-b54e-4fcc-8f36-14edd2848ea5", email: "admin@almox.test", password: "Test1234!", profile: { id: "9018e72c-b54e-4fcc-8f36-14edd2848ea5", display_name: "Admin Teste", role: "admin", active: true } }
  const operatorUser: UserRecord = { id: "4515bbb4-df35-4d9f-8ece-5c8d391e2619", email: "operador@almox.test", password: "Test1234!", profile: { id: "4515bbb4-df35-4d9f-8ece-5c8d391e2619", display_name: "Operador Teste", role: "employee", active: true } }
  const users: UserRecord[] = [adminUser, operatorUser]
  const products: Product[] = [
    { id: "prd-luva", sku: "EPI-001", name: "Luva de proteção", description: "Luva nitrílica tamanho M", category_id: "cat-epi", unit: "CX", minimum_stock: 5, location: "Prateleira A1", active: true, first_movement_at: "2026-11-10T13:00:00.000Z", created_at: t, updated_at: "2026-11-10T13:10:00.000Z", categories: { id: catEpi.id, name: catEpi.name, active: catEpi.active }, stock_balances: { product_id: "prd-luva", quantity: 18, version: 2, updated_at: "2026-11-10T13:10:00.000Z" } },
    { id: "prd-oculos", sku: "EPI-002", name: "Óculos de segurança", description: null, category_id: "cat-epi", unit: "UN", minimum_stock: 10, location: "Prateleira A2", active: true, first_movement_at: "2026-11-10T13:05:00.000Z", created_at: t, updated_at: "2026-11-10T13:05:00.000Z", categories: { id: catEpi.id, name: catEpi.name, active: catEpi.active }, stock_balances: { product_id: "prd-oculos", quantity: 0, version: 2, updated_at: "2026-11-10T13:05:00.000Z" } },
    { id: "prd-martelo", sku: "FER-010", name: "Martelo unha", description: "Cabo de fibra", category_id: "cat-ferr", unit: "UN", minimum_stock: 2, location: "Armário F1", active: true, first_movement_at: null, created_at: t, updated_at: t, categories: { id: catFerr.id, name: catFerr.name, active: catFerr.active }, stock_balances: { product_id: "prd-martelo", quantity: 0, version: 0, updated_at: t } },
    { id: "prd-caneta", sku: "ESC-100", name: "Caneta esferográfica azul", description: null, category_id: "cat-esc", unit: "CX", minimum_stock: 3, location: null, active: false, first_movement_at: "2026-11-09T10:00:00.000Z", created_at: t, updated_at: "2026-11-09T10:30:00.000Z", categories: { id: catEsc.id, name: catEsc.name, active: catEsc.active }, stock_balances: { product_id: "prd-caneta", quantity: 0, version: 1, updated_at: "2026-11-09T10:30:00.000Z" } },
  ]
  const movements: StockMovement[] = [
    { id: "mov-1", product_id: "prd-luva", actor_id: adminUser.id, kind: "ENTRADA", delta: 20, balance_before: 0, balance_after: 20, product_version: 1, reason: "Compra inicial", origin: "Fornecedor ABC", department_id: null, recipient_ref: null, document_ref: "NF-1001", reversal_of: null, recorded_at: "2026-11-10T13:00:00.000Z", snapshots: { sku: "EPI-001", name: "Luva de proteção", unit: "CX", actor_name: adminUser.profile.display_name } },
    { id: "mov-2", product_id: "prd-luva", actor_id: operatorUser.id, kind: "SAIDA", delta: -2, balance_before: 20, balance_after: 18, product_version: 2, reason: "Uso em manutenção", origin: null, department_id: "dep-manut", recipient_ref: "João Silva", document_ref: null, reversal_of: null, recorded_at: "2026-11-10T13:10:00.000Z", snapshots: { sku: "EPI-001", name: "Luva de proteção", unit: "CX", actor_name: operatorUser.profile.display_name, department_name: "Manutenção" } },
    { id: "mov-3", product_id: "prd-oculos", actor_id: adminUser.id, kind: "ENTRADA", delta: 10, balance_before: 0, balance_after: 10, product_version: 1, reason: "Reposição", origin: "Fornecedor XYZ", department_id: null, recipient_ref: null, document_ref: null, reversal_of: null, recorded_at: "2026-11-10T13:02:00.000Z", snapshots: { sku: "EPI-002", name: "Óculos de segurança", unit: "UN", actor_name: adminUser.profile.display_name } },
    { id: "mov-4", product_id: "prd-oculos", actor_id: operatorUser.id, kind: "SAIDA", delta: -10, balance_before: 10, balance_after: 0, product_version: 2, reason: "Distribuição", origin: null, department_id: "dep-prod", recipient_ref: "Equipe A", document_ref: null, reversal_of: null, recorded_at: "2026-11-10T13:05:00.000Z", snapshots: { sku: "EPI-002", name: "Óculos de segurança", unit: "UN", actor_name: operatorUser.profile.display_name, department_name: "Produção" } },
  ]
  // Itens adicionais (horários relativos) para o painel RF14 ter alertas e atividade recente.
  const extra: Array<{ id: string; sku: string; name: string; cat: Category; unit: Product["unit"]; min: number; loc: string | null; flow: Array<[number, number, string, string | null]> }> = [
    { id: "prd-fita", sku: "MAN-021", name: "Fita isolante 19mm", cat: catFerr, unit: "UN", min: 8, loc: "Gaveta F3", flow: [[50, 20, "Compra mensal", null], [30, -14, "Reparo elétrico", "dep-manut"], [6, -3, "Manutenção preventiva", "dep-manut"]] },
    { id: "prd-alcool", sku: "LIM-070", name: "Álcool 70% (litro)", cat: catEpi, unit: "L", min: 10, loc: "Prateleira B2", flow: [[70, 30, "Reposição", null], [20, -12.5, "Higienização de linhas", "dep-prod"]] },
    { id: "prd-disco", sku: "FER-115", name: "Disco de corte 115mm", cat: catFerr, unit: "UN", min: 15, loc: "Armário F2", flow: [[90, 60, "Compra trimestral", null], [26, -12, "Serralheria", "dep-manut"], [3, -8, "Ajuste de estrutura", "dep-prod"]] },
    { id: "prd-papel", sku: "ESC-200", name: "Papel A4 75g (caixa)", cat: catEsc, unit: "CX", min: 4, loc: "Sala 2 — estante", flow: [[100, 6, "Compra", null], [10, -3, "Uso administrativo", "dep-adm"]] },
    { id: "prd-capacete", sku: "EPI-010", name: "Capacete de segurança", cat: catEpi, unit: "UN", min: 6, loc: "Prateleira A3", flow: [[120, 25, "Compra inicial", null], [2, -4, "Novos colaboradores", "dep-prod"]] },
  ]
  for (const e of extra) {
    let bal = 0; let version = 0; let last = t
    e.flow.forEach(([h, delta, reason, dep], i) => {
      const before = bal; bal = Math.round((bal + delta) * 1000) / 1000; version += 1; last = hoursAgo(h)
      const actor = delta > 0 ? adminUser : operatorUser
      const depName = departments.find((d) => d.id === dep)?.name
      movements.push({ id: `mov-${e.id}-${i}`, product_id: e.id, actor_id: actor.id, kind: delta > 0 ? "ENTRADA" : "SAIDA", delta, balance_before: before, balance_after: bal, product_version: version, reason, origin: delta > 0 ? "Fornecedor Central" : null, department_id: dep, recipient_ref: dep ? "Equipe do setor" : null, document_ref: delta > 0 ? `NF-${2000 + i}` : null, reversal_of: null, recorded_at: last, snapshots: { sku: e.sku, name: e.name, unit: e.unit, actor_name: actor.profile.display_name, ...(depName ? { department_name: depName } : {}) } })
    })
    products.push({ id: e.id, sku: e.sku, name: e.name, description: null, category_id: e.cat.id, unit: e.unit, minimum_stock: e.min, location: e.loc, active: true, first_movement_at: hoursAgo(e.flow[0]![0]), created_at: t, updated_at: last, categories: { id: e.cat.id, name: e.cat.name, active: e.cat.active }, stock_balances: { product_id: e.id, quantity: bal, version, updated_at: last } })
  }
  return { users, categories, departments, products, movements, accessRequests: [] }
}

let cache: Store | null = null

export function loadStore(): Store {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { cache = JSON.parse(raw) as Store; return cache }
  } catch { /* ignore */ }
  cache = seed()
  saveStore(cache)
  return cache
}

export function saveStore(store: Store) {
  cache = store
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* ignore */ }
}

export function resetStore() { cache = seed(); saveStore(cache) }

export function getCurrentUser(): UserRecord | null {
  try {
    const id = localStorage.getItem("almox.offline.user")
    if (!id) return null
    return loadStore().users.find((u) => u.id === id) ?? null
  } catch { return null }
}
export function setCurrentUser(id: string | null) {
  try { if (id) localStorage.setItem("almox.offline.user", id); else localStorage.removeItem("almox.offline.user") } catch { /* ignore */ }
}

function norm(s: string) { return s.trim().toLowerCase() }

function syncProductCategory(product: Product, store: Store) {
  const c = store.categories.find((x) => x.id === product.category_id)
  product.categories = c ? { id: c.id, name: c.name, active: c.active } : null
}

function getBalance(product: Product): StockBalance {
  const sb = Array.isArray(product.stock_balances) ? product.stock_balances[0] : product.stock_balances
  if (!sb) throw new Error("BALANCE_NOT_FOUND")
  return sb
}

function actorSnapshot(actor: UserRecord | null): { actor_name?: string } {
  return actor ? { actor_name: actor.profile.display_name } : {}
}

export const mockApi = {
  signIn(email: string, password: string): Profile | null {
    const store = loadStore()
    const u = store.users.find((x) => norm(x.email) === norm(email) && x.password === password)
    if (!u) return null
    if (!u.profile.active) return { ...u.profile, active: false }
    u.last_sign_in_at = nowIso(); saveStore(store)
    setCurrentUser(u.id)
    return u.profile
  },
  signOut() { setCurrentUser(null) },
  sessionProfile(): Profile | null { return getCurrentUser()?.profile ?? null },

  listCategories(): Category[] { return [...loadStore().categories].sort((a,b)=> Number(b.active)-Number(a.active) || a.name.localeCompare(b.name,"pt-BR")) },
  saveCategory(input: { id?: string; name: string }) {
    const store = loadStore()
    const name = input.name.trim()
    if (store.categories.some((c) => norm(c.name) === norm(name) && c.id !== input.id)) throw new Error("categories_name_normalized_uidx duplicate key")
    if (input.id) {
      const c = store.categories.find((x)=>x.id===input.id); if (!c) throw new Error("NOT_FOUND")
      c.name = name; c.updated_at = nowIso()
    } else {
      store.categories.push({ id: uid("cat"), name, active: true, created_at: nowIso(), updated_at: nowIso() })
    }
    store.products.forEach((p)=>syncProductCategory(p,store)); saveStore(store)
  },
  setCategoryActive(id: string, active: boolean) {
    const store = loadStore(); const c = store.categories.find((x)=>x.id===id); if(!c) throw new Error("NOT_FOUND")
    if (!active && store.products.some((p)=>p.category_id===id && p.active)) throw new Error("CATEGORY_HAS_ACTIVE_PRODUCTS")
    c.active = active; c.updated_at = nowIso(); store.products.forEach((p)=>syncProductCategory(p,store)); saveStore(store)
  },

  listDepartments(): Department[] { return [...loadStore().departments].sort((a,b)=> Number(b.active)-Number(a.active) || a.name.localeCompare(b.name,"pt-BR")) },
  saveDepartment(input: { id?: string; name: string }) {
    const store = loadStore(); const name = input.name.trim()
    if (store.departments.some((d) => norm(d.name) === norm(name) && d.id !== input.id)) throw new Error("departments_name_normalized_uidx duplicate key")
    if (input.id) { const d = store.departments.find((x)=>x.id===input.id); if(!d) throw new Error("NOT_FOUND"); d.name=name; d.updated_at=nowIso() }
    else store.departments.push({ id: uid("dep"), name, active: true, created_at: nowIso(), updated_at: nowIso() })
    saveStore(store)
  },
  setDepartmentActive(id: string, active: boolean) { const store = loadStore(); const d = store.departments.find((x)=>x.id===id); if(!d) throw new Error("NOT_FOUND"); d.active=active; d.updated_at=nowIso(); saveStore(store) },

  listProducts(filters: ProductListFilters = {}): PaginatedProducts {
    const store = loadStore(); const page=Math.max(1, filters.page ?? 1); const pageSize=Math.min(100, Math.max(1, filters.pageSize ?? 10))
    let items = [...store.products]
    const term = filters.search?.trim().toLowerCase(); if (term) items = items.filter((p)=>p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term))
    if (filters.categoryId) items = items.filter((p)=>p.category_id===filters.categoryId)
    if (filters.situation === "active") items = items.filter((p)=>p.active)
    if (filters.situation === "inactive") items = items.filter((p)=>!p.active)
    if (filters.situation === "zero_balance") items = items.filter((p)=>Number((Array.isArray(p.stock_balances)?p.stock_balances[0]:p.stock_balances)?.quantity ?? 0)<=0)
    const sort = filters.sort ?? "name"; const dir = filters.direction === "desc" ? -1 : 1
    items.sort((a,b)=>{ const av = sort==="sku"?a.sku: sort==="updated_at"?a.updated_at: sort==="active"?String(a.active):a.name; const bv = sort==="sku"?b.sku: sort==="updated_at"?b.updated_at: sort==="active"?String(b.active):b.name; return av< bv ? -1*dir : av>bv ? 1*dir : a.id.localeCompare(b.id) })
    const total = items.length; const start=(page-1)*pageSize
    return { items: items.slice(start,start+pageSize), total, page, pageSize }
  },
  getProduct(productId: string): Product { const p = loadStore().products.find((x)=>x.id===productId); if(!p) throw new Error("PRODUCT_NOT_FOUND"); syncProductCategory(p, loadStore()); return p },
  getProductHistory(productId: string, page=1, pageSize=10): ProductHistory {
    const store = loadStore(); const product = this.getProduct(productId)
    const all = store.movements.filter((m)=>m.product_id===productId).sort((a,b)=>a.product_version-b.product_version || a.recorded_at.localeCompare(b.recorded_at) || a.id.localeCompare(b.id))
    const safePage=Math.max(1,page), safeSize=Math.min(100,Math.max(1,pageSize)); const start=(safePage-1)*safeSize
    const slice = all.slice(start,start+safeSize)
    const ids = new Set(slice.map((m)=>m.id)); const reversedBy: Record<string,string> = {}
    for (const m of store.movements) if (m.reversal_of && ids.has(m.reversal_of)) reversedBy[m.reversal_of]=m.id
    return { reversedBy, product, movements: slice, total: all.length, page: safePage, pageSize: safeSize }
  },
  createProduct(values: ProductFormValues) {
    const store = loadStore(); const sku = values.sku.trim().toUpperCase()
    if (store.products.some((p)=>p.sku.toUpperCase()===sku)) throw new Error("products_sku_normalized_uidx duplicate key")
    const cat = store.categories.find((c)=>c.id===values.category_id && c.active); if(!cat) throw new Error("CATEGORY_INACTIVE_OR_NOT_FOUND")
    const t = nowIso(); const id = uid("prd")
    const p: Product = { id, sku, name: values.name.trim(), description: values.description || null, category_id: values.category_id, unit: values.unit, minimum_stock: values.minimum_stock, location: values.location || null, active: true, first_movement_at: null, created_at: t, updated_at: t, categories: {id:cat.id,name:cat.name,active:cat.active}, stock_balances: { product_id: id, quantity: 0, version: 0, updated_at: t } }
    store.products.push(p); saveStore(store)
  },
  updateProduct(id: string, values: ProductFormValues) {
    const store = loadStore(); const p = store.products.find((x)=>x.id===id); if(!p) throw new Error("PRODUCT_NOT_FOUND")
    const sku = values.sku.trim().toUpperCase(); if (store.products.some((x)=>x.id!==id && x.sku.toUpperCase()===sku)) throw new Error("products_sku_normalized_uidx duplicate key")
    const cat = store.categories.find((c)=>c.id===values.category_id && c.active); if(!cat && values.category_id !== p.category_id) throw new Error("CATEGORY_INACTIVE_OR_NOT_FOUND")
    if (p.first_movement_at && values.unit !== p.unit) throw new Error("PRODUCT_UNIT_LOCKED_AFTER_FIRST_MOVEMENT")
    Object.assign(p, { sku, name: values.name.trim(), description: values.description || null, category_id: values.category_id, unit: values.unit, minimum_stock: values.minimum_stock, location: values.location || null, updated_at: nowIso() })
    syncProductCategory(p, store); saveStore(store)
  },
  setProductActive(id: string, active: boolean) {
    const store = loadStore(); const p = store.products.find((x)=>x.id===id); if(!p) throw new Error("PRODUCT_NOT_FOUND")
    const qty = Number((Array.isArray(p.stock_balances)?p.stock_balances[0]:p.stock_balances)?.quantity ?? 0)
    if (!active && qty !== 0) throw new Error("PRODUCT_INACTIVATION_REQUIRES_ZERO_BALANCE")
    p.active = active; p.updated_at = nowIso(); saveStore(store)
  },
  registerEntry(input: { productId: string; quantity: string; origin: string; reason: string; documentRef?: string; operationKey: string }) {
    const store = loadStore(); const p = store.products.find((x)=>x.id===input.productId); if(!p) throw new Error("PRODUCT_NOT_FOUND"); if(!p.active) throw new Error("PRODUCT_INACTIVE")
    const q = Number(input.quantity); const bal = getBalance(p)
    const before = Number(bal.quantity); const after = before + q; bal.quantity = after; bal.version += 1; bal.updated_at = nowIso()
    p.first_movement_at = p.first_movement_at ?? bal.updated_at; p.updated_at = bal.updated_at
    const actor = getCurrentUser()
    const m: StockMovement = { id: uid("mov"), product_id: p.id, actor_id: actor?.id ?? null, kind: "ENTRADA", delta: q, balance_before: before, balance_after: after, product_version: bal.version, reason: input.reason, origin: input.origin, department_id: null, recipient_ref: null, document_ref: input.documentRef || null, reversal_of: null, recorded_at: bal.updated_at, snapshots: { sku: p.sku, name: p.name, unit: p.unit, ...actorSnapshot(actor) } }
    store.movements.push(m); saveStore(store)
    return { product_id: p.id, quantity: q, balance: after, version: bal.version, kind: "ENTRADA" as const }
  },
  registerExit(input: { productId: string; quantity: string; departmentId: string; recipientRef: string; reason: string; operationKey: string }) {
    const store = loadStore(); const p = store.products.find((x)=>x.id===input.productId); if(!p) throw new Error("PRODUCT_NOT_FOUND"); if(!p.active) throw new Error("PRODUCT_INACTIVE")
    const dep = store.departments.find((d)=>d.id===input.departmentId && d.active); if(!dep) throw new Error("DEPARTMENT_INACTIVE_OR_NOT_FOUND")
    const q = Number(input.quantity); const bal = getBalance(p)
    const before = Number(bal.quantity); if (before < q) throw new Error("INSUFFICIENT_STOCK")
    const after = before - q; bal.quantity = after; bal.version += 1; bal.updated_at = nowIso(); p.updated_at = bal.updated_at; p.first_movement_at = p.first_movement_at ?? bal.updated_at
    const actor = getCurrentUser()
    const m: StockMovement = { id: uid("mov"), product_id: p.id, actor_id: actor?.id ?? null, kind: "SAIDA", delta: -q, balance_before: before, balance_after: after, product_version: bal.version, reason: input.reason, origin: null, department_id: dep.id, recipient_ref: input.recipientRef, document_ref: null, reversal_of: null, recorded_at: bal.updated_at, snapshots: { sku: p.sku, name: p.name, unit: p.unit, ...actorSnapshot(actor), department_name: dep.name } }
    store.movements.push(m); saveStore(store)
    return { movement_id: m.id, product_id: p.id, quantity: q, balance: after, version: bal.version, kind: "SAIDA" as const }
  },
  reverseMovement(input: { movementId: string; reason: string; operationKey: string }): ReversalResult {
    const store = loadStore(); const actor = getCurrentUser(); if (actor?.profile.role !== "admin") throw new Error("REVERSAL_ADMIN_REQUIRED")
    const original = store.movements.find((m)=>m.id===input.movementId); if(!original) throw new Error("MOVEMENT_NOT_FOUND")
    if (original.kind === "ESTORNO") throw new Error("REVERSAL_OF_REVERSAL_FORBIDDEN")
    if (store.movements.some((m)=>m.reversal_of===original.id)) throw new Error("MOVEMENT_ALREADY_REVERSED")
    const p = store.products.find((x)=>x.id===original.product_id); if(!p) throw new Error("PRODUCT_NOT_FOUND"); if(!p.active) throw new Error("PRODUCT_INACTIVE")
    const bal = getBalance(p)
    const before = Number(bal.quantity); const delta = -Number(original.delta); const after = before + delta
    if (after < 0) throw new Error("REVERSAL_INSUFFICIENT_STOCK")
    bal.quantity = after; bal.version += 1; bal.updated_at = nowIso(); p.updated_at = bal.updated_at
    const m: StockMovement = { id: uid("mov"), product_id: p.id, actor_id: actor.id, kind: "ESTORNO", delta, balance_before: before, balance_after: after, product_version: bal.version, reason: input.reason, origin: null, department_id: null, recipient_ref: null, document_ref: null, reversal_of: original.id, recorded_at: bal.updated_at, snapshots: { sku: p.sku, name: p.name, unit: p.unit, ...actorSnapshot(actor) } }
    store.movements.push(m); saveStore(store)
    return { movement_id: m.id, reversal_of: original.id, product_id: p.id, delta: String(delta), balance: String(after), version: bal.version, kind: "ESTORNO" }
  },

  listMovements(filters: MovementLogFilters = {}): PaginatedMovements {
    const store = loadStore()
    const page = Math.max(1, filters.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10))
    let items = [...store.movements]
    if (filters.productId) items = items.filter((m) => m.product_id === filters.productId)
    if (filters.kind && filters.kind !== "all") items = items.filter((m) => m.kind === filters.kind)
    if (filters.actorId) items = items.filter((m) => m.actor_id === filters.actorId)
    if (filters.departmentId) items = items.filter((m) => m.department_id === filters.departmentId)
    if (filters.dateFrom) {
      const from = filters.dateFrom.includes("T") ? filters.dateFrom : `${filters.dateFrom}T00:00:00.000`
      items = items.filter((m) => m.recorded_at >= from)
    }
    if (filters.dateTo) {
      const to = filters.dateTo.includes("T") ? filters.dateTo : `${filters.dateTo}T23:59:59.999`
      items = items.filter((m) => m.recorded_at <= to)
    }
    items.sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.id.localeCompare(a.id))
    const total = items.length
    const start = (page - 1) * pageSize
    const slice = items.slice(start, start + pageSize)
    const ids = new Set(slice.map((m) => m.id))
    const reversedBy: Record<string, string> = {}
    for (const m of store.movements) if (m.reversal_of && ids.has(m.reversal_of)) reversedBy[m.reversal_of] = m.id
    const enriched: MovementLogItem[] = slice.map((m) => {
      const p = store.products.find((x) => x.id === m.product_id)
      return { ...m, products: p ? { id: p.id, sku: p.sku, name: p.name, unit: p.unit, active: p.active } : null }
    })
    return { items: enriched, total, page, pageSize, reversedBy }
  },

  // RF10 — ajuste por contagem (simulação da verificação de versão)
  adjustStockByCount(input: { productId: string; countedQuantity: string; expectedVersion: number; reason: string; operationKey: string }): StockAdjustmentResult {
    const store = loadStore(); const actor = requireAdmin("STOCK_ADJUSTMENT_ADMIN_REQUIRED")
    const p = store.products.find((x) => x.id === input.productId); if (!p) throw new Error("PRODUCT_NOT_FOUND"); if (!p.active) throw new Error("PRODUCT_INACTIVE")
    const bal = getBalance(p)
    if (bal.version !== input.expectedVersion) throw new Error("STOCK_VERSION_CHANGED")
    const counted = Number(input.countedQuantity); const before = Number(bal.quantity); const delta = counted - before
    if (!Number.isFinite(counted) || counted < 0) throw new Error("COUNTED_QUANTITY_INVALID")
    if (delta === 0) throw new Error("COUNT_MATCHES_CURRENT_STOCK")
    bal.quantity = counted; bal.version += 1; bal.updated_at = nowIso(); p.updated_at = bal.updated_at; p.first_movement_at = p.first_movement_at ?? bal.updated_at
    const m: StockMovement = { id: uid("mov"), product_id: p.id, actor_id: actor.id, kind: "AJUSTE", delta, balance_before: before, balance_after: counted, product_version: bal.version, reason: input.reason.trim(), origin: null, department_id: null, recipient_ref: null, document_ref: null, reversal_of: null, recorded_at: bal.updated_at, snapshots: { sku: p.sku, name: p.name, unit: p.unit, ...actorSnapshot(actor) } }
    store.movements.push(m); saveStore(store)
    return { movement_id: m.id, product_id: p.id, delta: String(delta), balance: String(counted), version: bal.version, kind: "AJUSTE" }
  },

  // RF14 — painel
  dashboardSummary(alertLimit = 20): DashboardSummary {
    const store = loadStore()
    const rows = store.products.map((p) => ({ p, qty: Number(getBalance(p).quantity), min: Number(p.minimum_stock), bal: getBalance(p) }))
    const active = rows.filter((r) => r.p.active)
    const alerts: StockAlert[] = active
      .filter((r) => r.qty <= r.min)
      .sort((a, b) => (a.qty === 0 ? 0 : 1) - (b.qty === 0 ? 0 : 1) || (a.min > 0 ? a.qty / a.min : 0) - (b.min > 0 ? b.qty / b.min : 0) || a.p.name.localeCompare(b.p.name, "pt-BR"))
      .slice(0, alertLimit)
      .map((r) => ({ id: r.p.id, sku: r.p.sku, name: r.p.name, unit: r.p.unit, location: r.p.location, category_name: r.p.categories?.name ?? null, quantity: r.qty, minimum_stock: r.min, updated_at: r.bal.updated_at }))
    const since = Date.now() - 7 * 24 * 3600 * 1000
    const recent = store.movements.filter((m) => new Date(m.recorded_at).getTime() >= since)
    const last = store.movements.reduce<string | null>((acc, m) => (!acc || m.recorded_at > acc ? m.recorded_at : acc), null)
    return {
      generated_at: nowIso(),
      counts: {
        active_products: active.length,
        inactive_products: rows.length - active.length,
        zero_balance: active.filter((r) => r.qty === 0).length,
        at_or_below_minimum: active.filter((r) => r.qty <= r.min).length,
        below_minimum_with_stock: active.filter((r) => r.qty > 0 && r.qty <= r.min).length,
      },
      alerts,
      activity: {
        last_7_days: recent.length,
        entries_7_days: recent.filter((m) => m.kind === "ENTRADA").length,
        exits_7_days: recent.filter((m) => m.kind === "SAIDA").length,
        corrections_7_days: recent.filter((m) => m.kind === "AJUSTE" || m.kind === "ESTORNO").length,
        last_movement_at: last,
      },
    }
  },

  // RF15 — exportações
  exportBalances(filters: BalanceExportFilters): ExportResult<BalanceExportRow> {
    requireAdmin("EXPORT_ADMIN_REQUIRED")
    const store = loadStore(); const situation = filters.situation ?? "all"
    const rows: BalanceExportRow[] = store.products
      .filter((p) => !filters.categoryId || p.category_id === filters.categoryId)
      .map((p) => ({ p, b: getBalance(p) }))
      .filter(({ p, b }) => {
        const q = Number(b.quantity)
        if (situation === "active") return p.active
        if (situation === "inactive") return !p.active
        if (situation === "zero_balance") return p.active && q === 0
        if (situation === "at_or_below_minimum") return p.active && q <= Number(p.minimum_stock)
        return true
      })
      .sort((a, b) => a.p.sku.localeCompare(b.p.sku))
      .map(({ p, b }) => ({ sku: p.sku, name: p.name, category_name: store.categories.find((c) => c.id === p.category_id)?.name ?? null, unit: p.unit, quantity: b.quantity, minimum_stock: p.minimum_stock, location: p.location, active: p.active, at_or_below_minimum: p.active && Number(b.quantity) <= Number(p.minimum_stock), version: b.version, updated_at: b.updated_at }))
    return { generated_at: nowIso(), filters: { category_id: filters.categoryId || null, situation }, row_count: rows.length, rows }
  },
  exportMovements(filters: MovementExportFilters & { from: string | null; toExclusive: string | null }): ExportResult<MovementExportRow> {
    requireAdmin("EXPORT_ADMIN_REQUIRED")
    const store = loadStore()
    const rows: MovementExportRow[] = store.movements
      .filter((m) => (!filters.from || m.recorded_at >= filters.from) && (!filters.toExclusive || m.recorded_at < filters.toExclusive))
      .filter((m) => (!filters.productId || m.product_id === filters.productId) && (!filters.kind || m.kind === filters.kind))
      .filter((m) => (!filters.actorId || m.actor_id === filters.actorId) && (!filters.departmentId || m.department_id === filters.departmentId))
      .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.id.localeCompare(a.id))
      .map((m) => ({ id: m.id, recorded_at: m.recorded_at, kind: m.kind, sku: m.snapshots.sku ?? null, product_name: m.snapshots.name ?? null, unit: m.snapshots.unit ?? null, delta: m.delta, balance_before: m.balance_before, balance_after: m.balance_after, product_version: m.product_version, actor_name: m.snapshots.actor_name ?? null, origin: m.origin, department_name: m.snapshots.department_name ?? null, recipient_ref: m.recipient_ref, document_ref: m.document_ref, reason: m.reason, reversal_of: m.reversal_of, reversed_by: store.movements.find((r) => r.reversal_of === m.id)?.id ?? null }))
    return { generated_at: nowIso(), filters: { from: filters.from, to_exclusive: filters.toExclusive, product_id: filters.productId || null, kind: filters.kind || null, actor_id: filters.actorId || null, department_id: filters.departmentId || null }, row_count: rows.length, rows }
  },

  // RF16 — usuários
  listUsers(): ManagedUser[] {
    requireAdmin("USER_ADMIN_REQUIRED")
    return loadStore().users
      .map((u) => ({ id: u.id, display_name: u.profile.display_name, email: u.email, role: u.profile.role, active: u.profile.active, created_at: u.created_at ?? "2026-11-10T12:00:00.000Z", updated_at: u.updated_at ?? "2026-11-10T12:00:00.000Z", last_sign_in_at: u.last_sign_in_at ?? null, invited_at: u.invited_at ?? null }))
      .sort((a, b) => Number(b.active) - Number(a.active) || a.display_name.localeCompare(b.display_name, "pt-BR"))
  },
  setUserRole(userId: string, role: AlmoxRole) {
    requireAdmin("USER_ADMIN_REQUIRED")
    const store = loadStore(); const u = store.users.find((x) => x.id === userId); if (!u) throw new Error("USER_NOT_FOUND")
    ensureAnotherAdmin(store, userId, role, u.profile.active)
    const changed = u.profile.role !== role
    if (changed) { u.profile.role = role; u.updated_at = nowIso(); saveStore(store) }
    return { id: u.id, role: u.profile.role, active: u.profile.active, changed }
  },
  setUserActive(userId: string, active: boolean) {
    requireAdmin("USER_ADMIN_REQUIRED")
    const store = loadStore(); const u = store.users.find((x) => x.id === userId); if (!u) throw new Error("USER_NOT_FOUND")
    ensureAnotherAdmin(store, userId, u.profile.role, active)
    const changed = u.profile.active !== active
    if (changed) { u.profile.active = active; u.updated_at = nowIso(); saveStore(store) }
    return { id: u.id, role: u.profile.role, active: u.profile.active, changed }
  },
  listAccessRequests(): AccessRequest[] {
    requireAdmin("USER_ADMIN_REQUIRED")
    return [...(loadStore().accessRequests ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20)
  },
  inviteUser(input: InviteInput): AccessRequest {
    const actor = requireAdmin("USER_ADMIN_REQUIRED")
    const store = loadStore(); store.accessRequests ??= []
    const email = input.email.trim().toLowerCase(); const name = input.displayName.trim().replace(/\s+/g, " ")
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("INVITE_EMAIL_INVALID")
    if (!name) throw new Error("INVITE_NAME_INVALID")
    const key = `${actor.id}:${input.operationKey}`
    const existing = store.accessRequests.find((r) => (r as AccessRequest & { _key?: string })._key === key)
    if (existing) {
      if (existing.target_email !== email || existing.display_name !== name || existing.role !== input.role) throw new Error("OPERATION_KEY_REUSED_WITH_DIFFERENT_CONTENT")
      if (existing.status === "failed") throw new Error(existing.error_code ?? "INVITE_FAILED")
      return existing
    }
    const t = nowIso()
    const request: AccessRequest & { _key: string } = { _key: key, id: uid("req"), target_email: email, display_name: name, role: input.role, status: "completed", error_code: null, auth_user_id: null, created_at: t }
    if (store.users.some((u) => norm(u.email) === email)) {
      request.status = "failed"; request.error_code = "USER_ALREADY_EXISTS"
      store.accessRequests.push(request); saveStore(store)
      throw new Error("USER_ALREADY_EXISTS")
    }
    const id = crypto.randomUUID()
    // Modo demonstração: a conta convidada usa a senha de teste e nasce INATIVA.
    store.users.push({ id, email, password: "Test1234!", created_at: t, updated_at: t, invited_at: t, last_sign_in_at: null, profile: { id, display_name: name, role: input.role, active: false } })
    request.auth_user_id = id
    store.accessRequests.push(request); saveStore(store)
    return request
  },
}

function requireAdmin(code: string): UserRecord {
  const actor = getCurrentUser()
  if (!actor || !actor.profile.active || actor.profile.role !== "admin") throw new Error(code)
  return actor
}

function ensureAnotherAdmin(store: Store, targetId: string, nextRole: AlmoxRole, nextActive: boolean) {
  const remaining = store.users.filter((u) => u.id !== targetId && u.profile.role === "admin" && u.profile.active).length
  if (remaining === 0 && !(nextRole === "admin" && nextActive)) throw new Error("LAST_ADMIN_REQUIRED")
}
