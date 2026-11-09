import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../use-auth";

const schema = z.object({
  email: z.string().email("Informe um e-mail vÃ¡lido."),
  password: z.string().min(1, "Informe sua senha."),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    const message = await signInWithPassword(values.email, values.password);
    if (message) {
      setError("root", { message });
      return;
    }
    navigate(from, { replace: true });
  });

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
          <CardDescription>Acesse com seu e-mail e senha corporativos.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
              {errors.email ? <p className="text-sm text-red-600" role="alert">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} {...register("password")} />
              {errors.password ? <p className="text-sm text-red-600" role="alert">{errors.password.message}</p> : null}
            </div>
            {errors.root?.message ? <p className="text-sm text-red-600" role="alert">{errors.root.message}</p> : null}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm">
              <a className="text-gray-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900" href="/recuperar-senha">
                Esqueci minha senha
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

