import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description:
    "Acesse a plataforma JEMS3 Leak com sessão segura e contratos normalizados.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 lg:px-10">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <section className="space-y-5">
          <Image
            src="/jems3-leak-logo.svg"
            alt="JEMS3 Leak"
            width={360}
            height={96}
            priority
            unoptimized
            className="h-16 w-auto max-w-full"
          />
          <h1 className="font-serif text-5xl leading-tight text-[#0f172a] md:text-7xl">
            Sessão segura, BFF controlado e estado local mínimo.
          </h1>
          <p className="max-w-xl text-base leading-7 text-[#51605a] md:text-lg">
            O acesso à plataforma passa por um backend-for-frontend que protege
            o token, normaliza contratos e deixa a UI livre para focar na
            experiência.
          </p>
        </section>

        <LoginForm />
      </div>
    </main>
  );
}
