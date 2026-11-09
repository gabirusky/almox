import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../use-auth";

export function InactiveAccessPage() {
  const { signOut, profile } = useAuth();
  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Acesso indisponÃ­vel</CardTitle>
          <CardDescription>Seu perfil nÃ£o estÃ¡ ativo para uso do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700" role="alert">
            {profile ? "Entre em contato com um administrador para reativaÃ§Ã£o." : "Perfil nÃ£o encontrado ou inativo. Solicite liberaÃ§Ã£o a um administrador."}
          </p>
          <Button variant="secondary" className="w-full" onClick={() => void signOut()}>Sair</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function MisconfiguredPage() {
  return (
    <div className="mx-auto max-w-lg py-8">
      <Card>
        <CardHeader>
          <CardTitle>ConfiguraÃ§Ã£o necessÃ¡ria</CardTitle>
          <CardDescription>Defina as variÃ¡veis do Supabase para habilitar o acesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          <p>Copie <code className="rounded bg-gray-100 px-1">app/.env.example</code> para <code className="rounded bg-gray-100 px-1">app/.env.local</code>.</p>
          <p>Preencha <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_URL</code> e <code className="rounded bg-gray-100 px-1">VITE_SUPABASE_ANON_KEY</code>.</p>
          <p className="text-amber-800">NÃ£o use chave <code>service_role</code> no frontend.</p>
        </CardContent>
      </Card>
    </div>
  );
}

