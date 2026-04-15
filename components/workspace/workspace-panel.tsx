"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Save,
  Trash2,
  Users,
} from "lucide-react";

import { useHydrated } from "../../hooks/use-hydrated";
import {
  useSessionStore,
  type WorkspaceDraft,
} from "../../stores/session-store";
import { Badge } from "../ui/badge";
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
import { Textarea } from "../ui/textarea";
import { PageHeader } from "../page-header";
import { SectionShell } from "../section-shell";

const workspaceSchema = z.object({
  title: z.string().min(4, "Informe um título com ao menos 4 caracteres"),
  abstract: z.string().min(20, "Informe um resumo com ao menos 20 caracteres"),
  authors: z.string().min(3, "Informe pelo menos um autor"),
});

type WorkspaceFormValues = z.infer<typeof workspaceSchema>;

const draftId = "workspace-main";

function parseDraftAuthors(authors?: string[]) {
  return authors?.join(", ") ?? "";
}

function buildDraft(values: WorkspaceFormValues): WorkspaceDraft {
  return {
    id: draftId,
    title: values.title,
    abstract: values.abstract,
    authors: values.authors
      .split(",")
      .map((author) => author.trim())
      .filter(Boolean),
    updatedAt: new Date().toISOString(),
  };
}

export function WorkspacePanel() {
  const hydrated = useHydrated();
  const [step, setStep] = useState(1);
  const draft = useSessionStore((state) => state.drafts[draftId]);
  const saveDraft = useSessionStore((state) => state.saveDraft);
  const clearDraft = useSessionStore((state) => state.clearDraft);

  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      title: "",
      abstract: "",
      authors: "",
    },
  });

  useEffect(() => {
    if (!hydrated || !draft) {
      return;
    }

    form.reset({
      title: draft.title ?? "",
      abstract: draft.abstract ?? "",
      authors: parseDraftAuthors(draft.authors),
    });
  }, [draft, form, hydrated]);

  function handleNext() {
    if (step === 1) {
      const title = form.getValues("title");
      const abstract = form.getValues("abstract");
      const result = workspaceSchema
        .pick({ title: true, abstract: true })
        .safeParse({
          title,
          abstract,
        });

      if (!result.success) {
        void form.trigger(["title", "abstract"]);
        return;
      }
    }

    if (step === 2) {
      const authors = form.getValues("authors");
      const result = workspaceSchema
        .pick({ authors: true })
        .safeParse({ authors });

      if (!result.success) {
        void form.trigger(["authors"]);
        return;
      }
    }

    setStep((current) => Math.min(current + 1, 3));
  }

  function handleBack() {
    setStep((current) => Math.max(current - 1, 1));
  }

  function handlePersist() {
    const values = form.getValues();
    const parsed = workspaceSchema.safeParse(values);

    if (!parsed.success) {
      void form.trigger();
      return;
    }

    saveDraft(buildDraft(parsed.data));
    setStep(3);
  }

  function handleClearDraft() {
    clearDraft(draftId);
    form.reset({ title: "", abstract: "", authors: "" });
    setStep(1);
  }

  const draftSummary = draft
    ? {
        title: draft.title ?? "Sem título",
        authors: draft.authors?.length ?? 0,
        updatedAt: draft.updatedAt,
      }
    : null;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">
      <PageHeader
        badge="Workspace"
        title="Rascunhos persistidos e fluxo multi-etapas"
        description="A tela usa o estado local permitido para recuperar progresso, sem misturar isso com sessão real ou payload externo."
        primaryAction="Voltar ao dashboard"
        primaryActionHref="/"
        secondaryAction="Abrir submissões"
        secondaryActionHref="/submissions"
      />

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-white/90 dark:bg-[#111815]">
          <CardHeader className="space-y-3 border-b border-[#e6ece6] bg-white/70 dark:border-[#24312b] dark:bg-[#101713]">
            <Badge variant="outline" className="w-fit">
              Etapa {step} de 3
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              Montar submissão em rascunho
            </CardTitle>
            <CardDescription>
              O progresso fica salvo localmente no navegador e volta
              automaticamente após recarregar a página.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <form
              className="space-y-6"
              onSubmit={(event) => event.preventDefault()}
            >
              {step === 1 ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      placeholder="Título do trabalho"
                      {...form.register("title")}
                    />
                    {form.formState.errors.title ? (
                      <p className="text-sm text-[#9b1c1c]">
                        {form.formState.errors.title.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="abstract">Resumo</Label>
                    <Textarea
                      id="abstract"
                      placeholder="Descreva o trabalho com clareza"
                      {...form.register("abstract")}
                    />
                    {form.formState.errors.abstract ? (
                      <p className="text-sm text-[#9b1c1c]">
                        {form.formState.errors.abstract.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="authors">Autores</Label>
                    <Input
                      id="authors"
                      placeholder="Nome 1, Nome 2, Nome 3"
                      {...form.register("authors")}
                    />
                    {form.formState.errors.authors ? (
                      <p className="text-sm text-[#9b1c1c]">
                        {form.formState.errors.authors.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#e4eae4] bg-[#f8faf7] p-4 text-sm leading-6 text-[#55625c] dark:border-[#24312b] dark:bg-[#161f1a] dark:text-[#aab4ae]">
                    Informe os autores separados por vírgula. O rascunho será
                    salvo com a lista normalizada.
                  </div>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                      <FileText className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                      Título
                    </div>
                    <p className="text-sm leading-6 text-[#54615b] dark:text-[#aab4ae]">
                      {form.getValues("title") || "Sem título"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                      <Users className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                      Autores
                    </div>
                    <p className="text-sm leading-6 text-[#54615b] dark:text-[#aab4ae]">
                      {form.getValues("authors") || "Sem autores"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                      <CheckCircle2 className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                      Status do rascunho
                    </div>
                    <p className="text-sm leading-6 text-[#54615b] dark:text-[#aab4ae]">
                      {draft
                        ? "Rascunho salvo e disponível para recuperação."
                        : "Nenhum rascunho salvo ainda."}
                    </p>
                  </div>
                </div>
              ) : null}
            </form>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
              {step < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Próximo
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handlePersist}>
                  <Save className="size-4" />
                  Salvar rascunho
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={handleClearDraft}
              >
                <Trash2 className="size-4" />
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#eef3ef] text-[#102018] shadow-[0_24px_80px_rgba(13,20,17,0.18)] dark:bg-[#0d1411] dark:text-[#f2f6f3] dark:shadow-[0_24px_80px_rgba(13,20,17,0.35)]">
          <CardHeader>
            <Badge variant="accent" className="w-fit">
              Persistência local
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#102018] dark:text-[#f7faf8]">
              Rascunho recuperável
            </CardTitle>
            <CardDescription className="text-[#4f6559] dark:text-[#b5c0ba]">
              O estado armazenado não contém segredos. Só dados de trabalho que
              podem voltar após reload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 dark:border-[#223129] dark:bg-[#111815]">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[#31453b] dark:text-[#d2dbd5]">
                <CheckCircle2 className="size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
                Controle de estado
              </div>
              <ul className="space-y-2 text-sm leading-6 text-[#4f6559] dark:text-[#9fb0a7]">
                <li>
                  O formulário resgata o rascunho salvo após a hidratação.
                </li>
                <li>O armazenamento fica restrito ao navegador.</li>
                <li>O token de sessão não entra nessa camada.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 text-sm leading-6 text-[#31453b] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dbe3dd]">
              {draftSummary ? (
                <div className="space-y-2">
                  <p className="font-semibold text-[#102018] dark:text-[#f5f7f4]">
                    {draftSummary.title}
                  </p>
                  <p>Autores: {draftSummary.authors}</p>
                  <p>
                    Atualizado em:{" "}
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(draftSummary.updatedAt))}
                  </p>
                </div>
              ) : (
                <p>Você ainda não salvou nenhum rascunho neste navegador.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-[#c4d3ca] px-5 py-3 text-sm font-medium text-[#102018] transition-colors hover:bg-[#dce9e1] dark:border-[#d3d8d2] dark:text-[#f2f6f3] dark:hover:bg-[#16201c]"
                href="/submissions"
              >
                Ir para submissões
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-[#d9f0e1] px-5 py-3 text-sm font-medium text-[#0f3d27] transition-colors hover:bg-[#cbe8d6] dark:bg-[#1d3328] dark:text-[#b9f0cd] dark:hover:bg-[#234031]"
                href="/"
              >
                Voltar ao dashboard
              </Link>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-[#c4d3ca] px-5 py-3 text-sm font-medium text-[#102018] transition-colors hover:bg-[#dce9e1] dark:border-[#d3d8d2] dark:text-[#f2f6f3] dark:hover:bg-[#16201c]"
                href="/session"
              >
                Sessão e preferências
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <SectionShell
        eyebrow="Próxima execução"
        title="O workspace fecha a lacuna da fase 6"
        description="A partir daqui o próximo esforço natural é evoluir o fluxo de submissão com paginação, filtros e edição assistida, sobre uma base já persistida localmente."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white/85 dark:bg-[#111815]">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
                Persistência
              </p>
              <p className="mt-2 text-sm leading-6 text-[#66736d] dark:text-[#98a59d]">
                Drafts e preferências já voltam após reload.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/85 dark:bg-[#111815]">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
                Validação
              </p>
              <p className="mt-2 text-sm leading-6 text-[#66736d] dark:text-[#98a59d]">
                RHF + Zod seguram o fluxo em três etapas.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/85 dark:bg-[#111815]">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
                Separação
              </p>
              <p className="mt-2 text-sm leading-6 text-[#66736d] dark:text-[#98a59d]">
                Nada aqui depende da API externa para funcionar localmente.
              </p>
            </CardContent>
          </Card>
        </div>
      </SectionShell>
    </main>
  );
}
