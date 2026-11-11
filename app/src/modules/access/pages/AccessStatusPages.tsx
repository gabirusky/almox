import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { useAuth } from "../use-auth"
import logo from "@/assets/logo_almox.png"

export function InactiveAccessPage() {
  const { signOut, profile } = useAuth()
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-6 flex justify-center"><img src={logo} alt="ALMOX" className="h-16 w-auto" /></div>
      <Card className="border-line">
        <CardHeader className="space-y-2">
          <p className="font-mono text-xs text-warn">Acesso restrito</p>
          <CardTitle className="font-heading text-2xl">Acesso indisponível</CardTitle>
          <CardDescription>Seu perfil não está ativo para uso do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="warning">
            {profile ? "Entre em contato com um administrador para solicitar a reativação do seu acesso." : "Perfil não encontrado ou inativo. Solicite liberação a um administrador."}
          </Alert>
          <Button variant="outline" className="w-full" onClick={() => void signOut()}>Sair da sessão</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function MisconfiguredPage() {
  return (
    <div className="mx-auto max-w-lg py-6">
      <div className="mb-6 flex justify-center"><img src={logo} alt="ALMOX" className="h-16 w-auto" /></div>
      <Card className="border-line">
        <CardHeader className="space-y-2">
          <p className="font-mono text-xs text-signal">Configuração</p>
          <CardTitle className="font-heading text-2xl">Configuração necessária</CardTitle>
          <CardDescription>Defina as variáveis do Supabase para habilitar o acesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-ink">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Copie <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">app/.env.example</code> para <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">app/.env.local</code>.</li>
            <li>Preencha <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_URL</code> e <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>.</li>
            <li>Reinicie o servidor de desenvolvimento.</li>
          </ol>
          <Alert variant="warning">Não use a chave <code className="font-mono">service_role</code> no frontend.</Alert>
        </CardContent>
      </Card>
    </div>
  )
}
