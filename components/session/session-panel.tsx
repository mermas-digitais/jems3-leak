"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  CheckCircle2,
  MoonStar,
  RefreshCcw,
  SunMedium,
  Trash2,
} from "lucide-react";

import { useHydrated } from "../../hooks/use-hydrated";
import { useSessionStore, type ThemeMode } from "../../stores/session-store";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { EmptyState } from "../empty-state";
import { PageHeader } from "../page-header";
import { SectionShell } from "../section-shell";

function getThemeLabel(theme: ThemeMode) {
  switch (theme) {
    case "light":
      return "Claro";
    case "dark":
      return "Escuro";
    default:
      return "Sistema";
  }
}

export function SessionPanel() {
  const hydrated = useHydrated();
  const theme = useSessionStore((state) => state.theme);
  const drafts = useSessionStore((state) => state.drafts);
  const recentSubmissions = useSessionStore((state) => state.recentSubmissions);
  const clearLocalState = useSessionStore((state) => state.clearLocalState);
  const setTheme = useSessionStore((state) => state.setTheme);

  const draftItems = useMemo(() => Object.values(drafts), [drafts]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">
      <PageHeader
        badge="Sessão"
        title="Preferências locais e estado persistido"
        description="Esta tela mostra o que o navegador mantém do usuário sem tocar no token HttpOnly nem nos payloads do JEMS3."
        primaryAction="Voltar ao dashboard"
        primaryActionHref="/"
        secondaryAction="Abrir workspace"
        secondaryActionHref="/workspace"
      />

      {!hydrated ? (
        <Card className="bg-white/90 dark:bg-[#111815]">
          <CardContent className="p-6 text-sm text-[#5f6d67] dark:text-[#aab4ae]">
            Carregando preferências locais...
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="bg-white/90 dark:bg-[#111815]">
          <CardHeader className="space-y-3 border-b border-[#e6ece6] bg-white/70 dark:border-[#24312b] dark:bg-[#101713]">
            <Badge variant="outline" className="w-fit">
              Estado local
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              Controle do que fica salvo
            </CardTitle>
            <CardDescription>
              O token de sessão continua isolado. Aqui só ficam preferências,
              rascunhos e atalhos úteis para a navegação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
              <div className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
                Tema
              </div>
              <div className="mt-2 text-2xl font-serif text-[#0f172a] dark:text-[#f5f7f4]">
                {getThemeLabel(theme)}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTheme("light")}
                >
                  <SunMedium className="size-4" />
                  Claro
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTheme("dark")}
                >
                  <MoonStar className="size-4" />
                  Escuro
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTheme("system")}
                >
                  <RefreshCcw className="size-4" />
                  Sistema
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-dashed border-[#d5ddd5] bg-[#f8faf7] shadow-none dark:border-[#24312b] dark:bg-[#161f1a]">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
                    Rascunhos
                  </div>
                  <div className="mt-2 text-3xl font-serif text-[#0f172a] dark:text-[#f5f7f4]">
                    {draftItems.length}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-dashed border-[#d5ddd5] bg-[#f8faf7] shadow-none dark:border-[#24312b] dark:bg-[#161f1a]">
                <CardContent className="p-4">
                  <div className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
                    Recentes
                  </div>
                  <div className="mt-2 text-3xl font-serif text-[#0f172a] dark:text-[#f5f7f4]">
                    {recentSubmissions.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="destructive"
                onClick={clearLocalState}
              >
                <Trash2 className="size-4" />
                Limpar estado local
              </Button>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-[#d3d8d2] px-5 py-3 text-sm font-medium text-[#0f172a] transition-colors hover:bg-[#f4f7f4] dark:border-[#24312b] dark:text-[#f2f6f3] dark:hover:bg-[#16201c]"
                href="/login"
              >
                Entrar novamente
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#eef3ef] text-[#102018] shadow-[0_24px_80px_rgba(13,20,17,0.18)] dark:bg-[#0d1411] dark:text-[#f2f6f3] dark:shadow-[0_24px_80px_rgba(13,20,17,0.35)]">
          <CardHeader>
            <Badge variant="accent" className="w-fit">
              Hidratação
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#102018] dark:text-[#f7faf8]">
              Estado visível após o carregamento
            </CardTitle>
            <CardDescription className="text-[#4f6559] dark:text-[#b5c0ba]">
              As informações aparecem somente depois que o cliente hidrata o
              store persistido.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SectionShell
              eyebrow="Resumo persistido"
              title="O que está guardado"
              description="Abaixo está o recorte mínimo permitido para o cliente: nada de segredos, só contexto de trabalho."
            >
              {draftItems.length > 0 ? (
                <div className="space-y-3">
                  {draftItems.map((draft) => (
                    <div
                      key={draft.id}
                      className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 dark:border-[#223129] dark:bg-[#111815]"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-[#102018] dark:text-[#f5f7f4]">
                        <CheckCircle2 className="size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
                        {draft.title || "Rascunho sem título"}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#4f6559] dark:text-[#d2dbd5]">
                        {draft.authors?.length
                          ? `${draft.authors.length} autores registrados.`
                          : "Sem autores registrados."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhum rascunho salvo"
                  description="Quando o workspace gravar um draft, ele reaparece aqui após reload do navegador."
                  actionLabel="Abrir workspace"
                  actionHref="/workspace"
                  className="border-[#c9d7cf] bg-[#f8fbf9] text-[#102018] dark:border-[#223129] dark:bg-[#111815] dark:text-[#f2f6f3]"
                />
              )}
            </SectionShell>

            <div className="rounded-2xl border border-[#c9d7cf] bg-[#f3f8f4] p-4 text-sm leading-6 text-[#4f6559] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dbe3dd]">
              Esta etapa fecha a governança do estado local e prepara o terreno
              para a fase de qualidade e estabilidade.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
