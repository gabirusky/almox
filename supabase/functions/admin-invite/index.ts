// ALMOX RF16: convite de usuários por administrador.
//
// Fluxo (seção 12.3 da análise):
//   1. Valida o JWT do chamador e abre o pedido via RPC no contexto do PRÓPRIO
//      administrador (almox_begin_access_request): o banco confere o perfil admin,
//      a idempotência por chave de operação e o conteúdo.
//   2. Só então usa a credencial privilegiada (service_role, disponível apenas no
//      ambiente da função) para chamar a API administrativa de Auth.
//   3. Conclui ou marca falha do pedido novamente no contexto do administrador,
//      preservando a autoria. O perfil nasce INATIVO até a habilitação.
//
// A service_role nunca sai deste ambiente e nunca é enviada ao navegador.
import { createClient } from "npm:@supabase/supabase-js@2.49.4"

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALMOX_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json(405, { code: "METHOD_NOT_ALLOWED" })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !anonKey || !serviceKey) return json(500, { code: "FUNCTION_MISCONFIGURED" })

  const authorization = req.headers.get("Authorization")
  if (!authorization?.startsWith("Bearer ")) return json(401, { code: "AUTH_REQUIRED" })

  let payload: { email?: string; displayName?: string; role?: string; operationKey?: string; redirectTo?: string }
  try {
    payload = await req.json()
  } catch {
    return json(400, { code: "INVALID_JSON" })
  }
  const role = payload.role === "admin" ? "admin" : "employee"

  // Cliente no contexto do administrador: RLS e funções de domínio validam tudo.
  const asAdmin = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await asAdmin.auth.getUser()
  if (userError || !userData.user) return json(401, { code: "AUTH_REQUIRED" })

  const begin = await asAdmin.rpc("almox_begin_access_request", {
    p_email: payload.email ?? "",
    p_display_name: payload.displayName ?? "",
    p_role: role,
    p_operation_key: payload.operationKey ?? "",
  })
  if (begin.error) {
    const status = begin.error.code === "42501" ? 403 : 400
    return json(status, { code: begin.error.message })
  }
  const request = begin.data as { id: string; status: string; target_email: string; error_code: string | null }
  if (request.status !== "pending") return json(200, { request })

  // Credencial privilegiada: somente para a API administrativa de Auth.
  const privileged = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const invite = await privileged.auth.admin.inviteUserByEmail(request.target_email, {
    data: { display_name: payload.displayName },
    redirectTo: payload.redirectTo,
  })

  if (invite.error || !invite.data.user) {
    const code = /already/i.test(invite.error?.message ?? "") ? "USER_ALREADY_EXISTS" : "INVITE_FAILED"
    const failed = await asAdmin.rpc("almox_fail_access_request", { p_request_id: request.id, p_error_code: code })
    return json(409, { code, request: failed.data ?? request })
  }

  const done = await asAdmin.rpc("almox_complete_access_request", {
    p_request_id: request.id,
    p_auth_user_id: invite.data.user.id,
  })
  if (done.error) return json(500, { code: done.error.message, request })
  return json(200, { request: done.data })
})
