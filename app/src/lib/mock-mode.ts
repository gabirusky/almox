const offlineEnv = (import.meta.env.VITE_OFFLINE_MODE as string | undefined)?.toLowerCase()

export function isOfflineMode(): boolean {
  if (offlineEnv === "true" || offlineEnv === "1") return true
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  return !url || !key
}

export function getModeLabel() {
  return isOfflineMode() ? "offline-mock" : "supabase"
}
