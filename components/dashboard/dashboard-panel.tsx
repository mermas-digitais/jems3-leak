"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  FileText,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

import type {
  NormalizedSession,
  NormalizedSubmission,
} from "../../types/jems3";
import { buttonVariants, Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { EmptyState } from "../empty-state";
import { SectionShell } from "../section-shell";
import { StatCard } from "../stat-card";

type SessionResponse = NormalizedSession;

type SubmissionsResponse = {
  authenticated: boolean;
  user: NormalizedSession["user"];
  submissions: NormalizedSubmission[];
  message?: string;
};

function sortSubmissions(submissions: NormalizedSubmission[]) {
  return [...submissions].sort((left, right) => {
    const leftValue = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightValue = right.updatedAt
      ? new Date(right.updatedAt).getTime()
      : 0;

    return rightValue - leftValue;
  });
}

function getAuthorSummary(submission: NormalizedSubmission) {
  const authors = submission.authors ?? [];

  if (!authors.length) {
    return "Sem autores normalizados.";
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

export function DashboardPanel() {
  const router = useRouter();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [submissions, setSubmissions] = useState<NormalizedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
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

        setSession(sessionPayload);

        if (!sessionPayload.authenticated || !sessionPayload.user) {
          setSubmissions([]);
          return;
        }

        const submissionsResponse = await fetch("/api/submissions", {
          cache: "no-store",
        });
        const submissionsPayload =
          (await submissionsResponse.json()) as SubmissionsResponse;

        if (cancelled) {
          return;
        }

        if (!submissionsResponse.ok) {
          throw new Error(
            submissionsPayload.message ?? "Falha ao carregar submissões.",
          );
        }

        setSubmissions(sortSubmissions(submissionsPayload.submissions));
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Falha ao carregar o dashboard.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function handleRefresh() {
    if (!authenticated) {
      setError("Faça login para atualizar as submissões.");
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch("/api/submissions", {
        cache: "no-store",
      });
      const payload = (await response.json()) as SubmissionsResponse;

      if (!response.ok) {
        throw new Error(payload.message ?? "Falha ao atualizar submissões.");
      }

      setSubmissions(sortSubmissions(payload.submissions));
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Falha ao atualizar o dashboard.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  const authenticated = Boolean(session?.authenticated && session.user);
  const user = session?.user ?? null;
  const totalReviews = submissions.reduce(
    (sum, submission) => sum + submission.reviewCount,
    0,
  );
  const totalReviewers = submissions.reduce(
    (sum, submission) => sum + submission.reviewerCount,
    0,
  );
  const recentSubmissions = submissions.slice(0, 4);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10 lg:py-10">
      <header className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-4">
          <div className="inline-flex w-fit items-center gap-3 rounded-2xl border border-[#dce2dc] bg-white/80 px-4 py-3 shadow-sm dark:border-[#24312b] dark:bg-[#111815]">
            <Image
              src="/icon.svg"
              alt="JEMS3 Leak"
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 shrink-0"
            />
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#5f6f65] dark:text-[#aab4ae]">
                JEMS3 Leak
              </p>
              <p className="text-sm font-medium text-[#0f172a] dark:text-[#f5f7f4]">
                Plataforma acadêmica
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="font-serif text-5xl leading-[1.02] tracking-tight text-[#0f172a] dark:text-[#f5f7f4] md:text-7xl">
              {authenticated
                ? `Bem-vindo, ${user?.name ?? "usuário"}.`
                : "Acesso protegido, sessão validada e navegação pronta."}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-[#4b5a53] dark:text-[#aab4ae] md:text-lg">
              {authenticated
                ? "A partir daqui você acompanha submissões, autores, revisores, reviews e arquivos sem tocar no payload bruto da API externa."
                : "Entre para acessar a navegação do produto. O token vive em cookie HttpOnly e a interface consome apenas contratos internos."}
            </p>
            {authenticated && user ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#4b5a53] dark:text-[#aab4ae]">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#dce2dc] bg-white/80 px-3 py-1.5 dark:border-[#24312b] dark:bg-[#111815]">
                  <ShieldCheck className="size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
                  {user.name}
                </span>
                {user.email ? (
                  <span className="inline-flex items-center rounded-full border border-[#dce2dc] bg-white/80 px-3 py-1.5 dark:border-[#24312b] dark:bg-[#111815]">
                    {user.email}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:justify-end">
          {authenticated ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
            >
              <RefreshCw
                className={isRefreshing ? "size-4 animate-spin" : "size-4"}
              />
              Atualizar
            </Button>
          ) : null}
          {authenticated ? (
            <Button type="button" variant="secondary" onClick={handleLogout}>
              <LogOut className="size-4" />
              Sair e voltar ao login
            </Button>
          ) : null}
          {!authenticated ? (
            <Link className={buttonVariants()} href="/login">
              Entrar
              <ArrowRight className="size-4" />
            </Link>
          ) : null}
        </div>
      </header>

      {error ? (
        <Card className="border-[#e7c6c6] bg-[#fff6f6] text-[#7b1f1f] dark:border-[#5c2b2b] dark:bg-[#231313] dark:text-[#ffd3d3]">
          <CardContent className="p-5 text-sm leading-6">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Submissões"
          value={loading ? "..." : String(submissions.length)}
          helpText="Conjunto normalizado retornado por /api/submissions."
          badge="Lista"
        />
        <StatCard
          label="Reviews"
          value={loading ? "..." : String(totalReviews)}
          helpText="Total agregado a partir dos contratos internos do dossiê."
          badge="Dossiê"
        />
        <StatCard
          label="Revisores"
          value={loading ? "..." : String(totalReviewers)}
          helpText="Revisores normalizados associados às submissões carregadas."
          badge="Equipe"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white/88 dark:bg-[#0b0f0d]/80">
          <CardHeader className="space-y-3 border-b border-[#e6ece6] bg-white/70 dark:border-[#24312b] dark:bg-[#101713]">
            <Badge variant="outline" className="w-fit">
              Atividade recente
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              Submissões em foco
            </CardTitle>
            <CardDescription>
              Lista priorizada por atualização mais recente, com autores,
              contadores e navegação direta para o dossiê.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {loading ? (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-2xl bg-[#eef2ed] dark:bg-[#1a221e]" />
                <div className="h-20 animate-pulse rounded-2xl bg-[#eef2ed] dark:bg-[#1a221e]" />
                <div className="h-20 animate-pulse rounded-2xl bg-[#eef2ed] dark:bg-[#1a221e]" />
              </div>
            ) : recentSubmissions.length > 0 ? (
              recentSubmissions.map((submission) => (
                <Link
                  key={submission.id}
                  href={`/submissions/${submission.id}`}
                  className="block rounded-2xl border border-[#dfe5df] bg-[#f9fbf9] p-4 transition-colors hover:border-[#b8c5bb] hover:bg-white dark:border-[#24312b] dark:bg-[#111815] dark:hover:border-[#33453d] dark:hover:bg-[#16201c]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                          {submission.title}
                        </h3>
                        <Badge variant="outline">{submission.status}</Badge>
                      </div>
                      <p className="text-xs text-[#66736d] dark:text-[#98a59d]">
                        ID {submission.id} • {getAuthorSummary(submission)}
                      </p>
                      <p className="line-clamp-2 text-sm leading-6 text-[#5f6d67] dark:text-[#aab4ae]">
                        {submission.abstract || "Sem resumo disponível."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#617069] dark:text-[#9eaba4]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 dark:bg-[#1a221e]">
                      <FileText className="size-3.5" />
                      {submission.reviewCount} reviews
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 dark:bg-[#1a221e]">
                      <Users className="size-3.5" />
                      {submission.reviewerCount} revisores
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 dark:bg-[#1a221e]">
                      <ShieldCheck className="size-3.5" />
                      {getAuthorSummary(submission)}
                    </span>
                  </div>
                </Link>
              ))
            ) : authenticated ? (
              <EmptyState
                title="Nenhuma submissão carregada"
                description="Quando a API retornar itens para o usuário autenticado, eles aparecerão aqui e na página de submissões."
                actionLabel="Ir para submissões"
                actionHref="/submissions"
              />
            ) : (
              <EmptyState
                title="Faça login para continuar"
                description="A sessão ainda não existe neste navegador. Entre para acessar o dashboard e os contratos normalizados do JEMS3."
                actionLabel="Entrar na plataforma"
                actionHref="/login"
              />
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#eef3ef] text-[#102018] shadow-[0_24px_80px_rgba(13,20,17,0.18)] dark:bg-[#0d1411] dark:text-[#f2f6f3] dark:shadow-[0_24px_80px_rgba(13,20,17,0.35)]">
          <CardHeader>
            <Badge variant="accent" className="w-fit">
              Visão operacional
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#102018] dark:text-[#f7faf8]">
              O que o painel entrega agora
            </CardTitle>
            <CardDescription className="text-[#4f6559] dark:text-[#b5c0ba]">
              O painel combina visão executiva, fila priorizada e atalhos para
              dossiê e download direto do artigo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SectionShell
              eyebrow="Resumo da tela"
              title="Leitura rápida do estado atual"
              description="Métricas de submissão, revisão, autoria e arquivos já ficam visíveis na entrada da aplicação."
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 text-sm text-[#31453b] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dbe3dd]">
                  <FileText className="size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
                  ID, autores, reviews e revisores aparecem em leitura rápida.
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 text-sm text-[#31453b] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dbe3dd]">
                  <Users className="size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
                  Submissões com arquivo permitem baixar o artigo direto da
                  fila.
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 text-sm text-[#31453b] dark:border-[#223129] dark:bg-[#111815] dark:text-[#dbe3dd]">
                  <ShieldCheck className="size-4 text-[#3f6f55] dark:text-[#90c6a1]" />
                  A interface continua consumindo apenas contratos internos.
                </div>
              </div>
            </SectionShell>

            <div className="rounded-2xl border border-[#c9d7cf] bg-[#f3f8f4] p-4 text-sm leading-6 text-[#4f6559] dark:border-[#223129] dark:bg-[#0b110e] dark:text-[#9fb0a7]">
              O usuário autenticado enxerga contexto real de submissões,
              autores, contadores e atualização. O usuário anônimo recebe um
              caminho direto para o login.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonVariants({ variant: "default" })}
                href="/submissions"
              >
                Abrir submissões
                <ArrowRight className="size-4" />
              </Link>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/session"
              >
                Sessão e preferências
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
