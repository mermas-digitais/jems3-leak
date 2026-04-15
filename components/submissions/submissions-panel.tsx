"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Download,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";

import type {
  NormalizedSession,
  NormalizedSubmission,
} from "../../types/jems3";
import { buttonVariants } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { EmptyState } from "../empty-state";
import { PageHeader } from "../page-header";
import { SectionShell } from "../section-shell";

type SubmissionsResponse = {
  authenticated: boolean;
  user: NormalizedSession["user"];
  submissions: NormalizedSubmission[];
  message?: string;
};

type SessionResponse = NormalizedSession;

function formatDate(value?: string) {
  if (!value) {
    return "Sem data";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sortSubmissions(submissions: NormalizedSubmission[]) {
  return [...submissions].sort((left, right) => {
    const leftValue = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightValue = right.updatedAt
      ? new Date(right.updatedAt).getTime()
      : 0;

    return rightValue - leftValue;
  });
}

function getAuthorsSummary(submission: NormalizedSubmission) {
  const authors = submission.authors ?? [];

  if (!authors.length) {
    return "Autores não normalizados.";
  }

  const mainAuthor =
    authors.find((author) => author.isMainAuthor) ?? authors[0];
  const coauthorCount = Math.max(authors.length - 1, 0);

  if (coauthorCount === 0) {
    return mainAuthor.person.name;
  }

  return `${mainAuthor.person.name} + ${coauthorCount} coautor${
    coauthorCount > 1 ? "es" : ""
  }`;
}

function getSubmissionDownloadHref(submission: NormalizedSubmission) {
  const firstFile = submission.files?.[0];

  if (!firstFile?.id) {
    return null;
  }

  return `/api/submissions/${submission.id}/files/${firstFile.id}/download`;
}

export function SubmissionsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [submissions, setSubmissions] = useState<NormalizedSubmission[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    let cancelled = false;

    async function loadSubmissions() {
      setLoading(true);
      setError(null);

      try {
        const sessionResponse = await fetch("/api/session", {
          cache: "no-store",
        });
        const sessionPayload =
          (await sessionResponse.json()) as SessionResponse;

        if (cancelled) {
          return;
        }

        const hasSession = Boolean(
          sessionPayload.authenticated && sessionPayload.user,
        );

        setAuthenticated(hasSession);

        if (!hasSession) {
          setSubmissions([]);
          setError(null);
          return;
        }

        const response = await fetch("/api/submissions", {
          cache: "no-store",
        });
        const payload = (await response.json()) as SubmissionsResponse;

        if (cancelled) {
          return;
        }

        setAuthenticated(Boolean(payload.authenticated));

        if (!response.ok) {
          throw new Error(payload.message ?? "Falha ao carregar submissões.");
        }

        setSubmissions(sortSubmissions(payload.submissions));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Falha ao carregar submissões.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSubmissions();

    return () => {
      cancelled = true;
    };
  }, []);

  const availableStatuses = useMemo(() => {
    return Array.from(
      new Set(submissions.map((submission) => submission.status)),
    );
  }, [submissions]);

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesStatus =
        statusFilter === "all" || submission.status === statusFilter;
      const authorsSummary = getAuthorsSummary(submission).toLowerCase();
      const authorsJoined = (submission.authors ?? [])
        .map((author) => author.person.name)
        .join(" ")
        .toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        [
          submission.id,
          submission.title,
          submission.abstract,
          submission.status,
          submission.trackId,
          submission.trackName,
          authorsSummary,
          authorsJoined,
          String(submission.reviewCount),
          String(submission.reviewerCount),
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, submissions]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSubmissions.length / pageSize),
  );
  const safePage = Math.min(page, totalPages);
  const paginatedSubmissions = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return filteredSubmissions.slice(startIndex, startIndex + pageSize);
  }, [filteredSubmissions, safePage]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">
      <PageHeader
        badge="Submissões"
        title="Lista operacional das submissões normalizadas"
        description="Esta tela consome somente o contrato interno de /api/submissions e organiza a fila por atualização recente."
        primaryAction="Voltar ao dashboard"
        primaryActionHref="/"
        secondaryAction="Abrir login"
        secondaryActionHref="/login"
      />

      <SectionShell
        eyebrow="Fila atual"
        title="Itens prontos para análise"
        description="Cada linha já vem com metadados úteis para triagem rápida e navegação para o dossiê detalhado."
      >
        {authenticated && submissions.length > 0 ? (
          <Card className="border-[#dce2dc] bg-white/90 dark:border-[#24312b] dark:bg-[#111815]">
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]"
                    htmlFor="submission-search"
                  >
                    Buscar
                  </label>
                  <Input
                    id="submission-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Título, resumo, autores, ID, reviews ou revisores"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#55625c] dark:text-[#aab4ae]">
                    Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: statusFilter === "all" ? "default" : "outline",
                        size: "sm",
                      })}
                      onClick={() => setStatusFilter("all")}
                    >
                      Todos
                    </button>
                    {availableStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        className={buttonVariants({
                          variant:
                            statusFilter === status ? "default" : "outline",
                          size: "sm",
                        })}
                        onClick={() => setStatusFilter(status)}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
              >
                Limpar filtros
              </button>
            </CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-[#e7c6c6] bg-[#fff6f6] text-[#7b1f1f] dark:border-[#5c2b2b] dark:bg-[#231313] dark:text-[#ffd3d3]">
            <CardContent className="p-5 text-sm leading-6">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-[#eef2ed] dark:bg-[#1a221e]" />
            <div className="h-20 animate-pulse rounded-2xl bg-[#eef2ed] dark:bg-[#1a221e]" />
            <div className="h-20 animate-pulse rounded-2xl bg-[#eef2ed] dark:bg-[#1a221e]" />
          </div>
        ) : authenticated && submissions.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-[#dce2dc] bg-white/90 dark:border-[#24312b] dark:bg-[#111815]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#f4f7f4] text-[#53615b] dark:bg-[#161f1a] dark:text-[#aab4ae]">
                <tr>
                  <th className="px-5 py-4 font-medium">Submissão</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Autores</th>
                  <th className="px-5 py-4 font-medium">Reviews</th>
                  <th className="px-5 py-4 font-medium">Revisores</th>
                  <th className="px-5 py-4 font-medium">Atualização</th>
                  <th className="px-5 py-4 font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubmissions.map((submission) => (
                  <tr
                    key={submission.id}
                    className="border-t border-[#e5ebe5] dark:border-[#24312b]"
                  >
                    <td className="px-5 py-4 align-top">
                      <div className="space-y-2">
                        <div className="font-medium text-[#0f172a] dark:text-[#f5f7f4]">
                          {submission.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                          <span>ID {submission.id}</span>
                          {submission.trackName ? (
                            <span>• {submission.trackName}</span>
                          ) : submission.trackId ? (
                            <span>• {submission.trackId}</span>
                          ) : null}
                        </div>
                        <p className="line-clamp-2 max-w-2xl text-[#5f6d67] dark:text-[#aab4ae]">
                          {submission.abstract || "Sem resumo disponível."}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Badge variant="outline">{submission.status}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top text-[#5f6d67] dark:text-[#aab4ae]">
                      <div className="space-y-1">
                        <p className="font-medium text-[#0f172a] dark:text-[#f5f7f4]">
                          {getAuthorsSummary(submission)}
                        </p>
                        <p className="text-xs">
                          {submission.authors?.length ?? 0} autor
                          {(submission.authors?.length ?? 0) === 1 ? "" : "es"}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Badge variant="outline">{submission.reviewCount}</Badge>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <Badge variant="outline">
                        {submission.reviewerCount}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 align-top text-[#5f6d67] dark:text-[#aab4ae]">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="size-4" />
                        {formatDate(submission.updatedAt)}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/submissions/${submission.id}`}
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          Abrir dossiê
                          <ArrowRight className="size-4" />
                        </Link>
                        {getSubmissionDownloadHref(submission) ? (
                          <Link
                            href={getSubmissionDownloadHref(submission) ?? "#"}
                            className={buttonVariants({
                              variant: "secondary",
                              size: "sm",
                            })}
                            title="Baixar artigo direto"
                            aria-label={`Baixar artigo de ${submission.title}`}
                          >
                            <Download className="size-4" />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5ebe5] px-5 py-4 text-sm text-[#5f6d67] dark:border-[#24312b] dark:text-[#aab4ae]">
              <span>
                Mostrando {paginatedSubmissions.length} de{" "}
                {filteredSubmissions.length} resultados
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={safePage === 1}
                >
                  Anterior
                </button>
                <span className="min-w-20 text-center font-medium text-[#0f172a] dark:text-[#f5f7f4]">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                  onClick={() =>
                    setPage((current) => Math.min(current + 1, totalPages))
                  }
                  disabled={safePage === totalPages}
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        ) : authenticated ? (
          <EmptyState
            title="Nenhuma submissão disponível"
            description={
              submissions.length > 0
                ? "Os filtros atuais não encontraram resultados. Ajuste a busca, o status ou limpe os critérios para voltar a ver a fila."
                : "Assim que a API retornar linhas para este usuário, a tabela desta página será preenchida com o contrato normalizado."
            }
            actionLabel={
              submissions.length > 0 ? "Limpar filtros" : "Voltar ao dashboard"
            }
            actionHref={submissions.length > 0 ? undefined : "/"}
            actionOnClick={
              submissions.length > 0
                ? () => {
                    setQuery("");
                    setStatusFilter("all");
                  }
                : undefined
            }
          />
        ) : (
          <EmptyState
            title="Login obrigatório"
            description="A fila de submissões só aparece para uma sessão válida. Faça login para continuar."
            actionLabel="Ir para login"
            actionHref="/login"
          />
        )}
      </SectionShell>

      <Card className="bg-[#eef3ef] text-[#102018] shadow-[0_24px_80px_rgba(13,20,17,0.18)] dark:bg-[#0d1411] dark:text-[#f2f6f3] dark:shadow-[0_24px_80px_rgba(13,20,17,0.35)]">
        <CardHeader>
          <CardTitle className="font-serif text-3xl text-[#102018] dark:text-[#f7faf8]">
            Estrutura de triagem
          </CardTitle>
          <CardDescription className="text-[#4f6559] dark:text-[#b5c0ba]">
            A tabela consolida ID, autores em resumo, contadores, atualização e
            ação direta de download quando houver artigo disponível.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 text-sm text-[#31453b] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dce6df]">
            <FileText className="mb-3 size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
            ID, título, autores e atualização aparecem primeiro.
          </div>
          <div className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 text-sm text-[#31453b] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dce6df]">
            <Users className="mb-3 size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
            Revisores, reviews e contadores entram na busca e na leitura rápida.
          </div>
          <div className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 text-sm text-[#31453b] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dce6df]">
            <ShieldCheck className="mb-3 size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
            O contrato interno continua sendo a única dependência da UI.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
