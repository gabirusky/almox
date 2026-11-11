import type { Category, Department, MovementLogFilters, MovementLogItem, PaginatedMovements, PaginatedProducts, Product, ProductFormValues, ProductHistory, ProductListFilters, ReversalResult, StockBalance, StockMovement } from "@/modules/catalog/types"
import type { Profile } from "@/modules/access/types"

type UserRecord = { id: string; email: string; password: string; profile: Profile }

type Store = {
  users: UserRecord[]
  categories: Category[]
  departments: Department[]
  products: Product[]
  movements: StockMovement[]
}

const KEY = "almox.offline.store.v1"

const nowIso = () => new Date().toISOString()
const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`

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
  return { users, categories, departments, products, movements }
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
}
