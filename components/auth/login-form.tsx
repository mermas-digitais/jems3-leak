"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

const loginSchema = z.object({
  identifier: z.string().min(3, "Informe seu identificador"),
  password: z.string().min(6, "Informe uma senha válida"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    setIsSubmitting(true);

    void (async () => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setFormError(payload?.message ?? "Não foi possível autenticar.");
        setIsSubmitting(false);
        return;
      }

      router.replace("/");
      router.refresh();
    })();
  });

  return (
    <Card className="border-[#d8dfd8] bg-white/90 dark:border-[#24312b] dark:bg-[#111815]">
      <CardHeader>
        <CardTitle className="font-serif text-3xl">
          Acesse a plataforma
        </CardTitle>
        <CardDescription>
          O login passa pelo BFF. O token sensível nunca vai para o cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="identifier">Identificador</Label>
            <Input
              id="identifier"
              autoComplete="username"
              {...form.register("identifier")}
            />
            {form.formState.errors.identifier ? (
              <p className="text-sm text-[#9b1c1c]">
                {form.formState.errors.identifier.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-[#9b1c1c]">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p className="text-sm text-[#9b1c1c]">{formError}</p>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
