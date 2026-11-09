import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../use-auth";

const schema = z.object({ email: z.string().email("Informe um e-mail vÃ¡lido.") });
type FormValues = z.infer<typeof schema>;

export function RecoverPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    const message = await requestPasswordReset(email);
    if (message) return setError("root", { message });
    setSent(true);
  });

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>Enviaremos um link de redefiniÃ§Ã£o para seu e-mail, se a conta existir.</CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-sm text-gray-700" role="status">Se o e-mail estiver cadastrado, vocÃª receberÃ¡ instruÃ§Ãµes para redefinir a senha.</p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
                {errors.email ? <p className="text-sm text-red-600" role="alert">{errors.email.message}</p> : null}
              </div>
              {errors.root?.message ? <p className="text-sm text-red-600" role="alert">{errors.root.message}</p> : null}
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Enviando..." : "Enviar link"}</Button>
            </form>
          )}
          <p className="mt-4 text-center text-sm"><a className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900" href="/login">Voltar ao login</a></p>
        </CardContent>
      </Card>
    </div>
  );
}

