"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  FileText,
  HelpCircle,
  Info,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type {
  NormalizedPerson,
  NormalizedSubmissionAuthor,
  NormalizedSubmissionDossier,
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
import { EmptyState } from "../empty-state";
import { PageHeader } from "../page-header";
import { Skeleton } from "../ui/skeleton";

type DossierResponse = {
  authenticated: boolean;
  user: NormalizedPerson | null;
  dossier: NormalizedSubmissionDossier;
  message?: string;
};

type ReviewerResponse = {
  reviewer?: NormalizedPerson;
  message?: string;
};

type AiInsightsResponse = {
  analysis: string;
  hasReviews: boolean;
  usedPdfContext: boolean;
  generatedAt: string;
  message?: string;
};

const AI_INSIGHTS_STORAGE_PREFIX = "ai-insights-v1";
const AI_INSIGHTS_TTL_MS = 24 * 60 * 60 * 1000;
const COLLAPSED_INSIGHT_PREVIEW_LENGTH = 300;

function getAiInsightsStorageKey(submissionId: string) {
  return `${AI_INSIGHTS_STORAGE_PREFIX}:${submissionId}`;
}

function readAiInsightsCache(submissionId: string): AiInsightsResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(
      getAiInsightsStorageKey(submissionId),
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AiInsightsResponse;

    if (
      !parsed ||
      typeof parsed.analysis !== "string" ||
      typeof parsed.generatedAt !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeAiInsightsCache(
  submissionId: string,
  payload: AiInsightsResponse,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getAiInsightsStorageKey(submissionId),
      JSON.stringify(payload),
    );
  } catch {
    // Ignora falhas de persistencia local.
  }
}

function isInsightExpired(generatedAt?: string) {
  if (!generatedAt) {
    return true;
  }

  const generatedMs = new Date(generatedAt).getTime();

  if (Number.isNaN(generatedMs)) {
    return true;
  }

  return Date.now() - generatedMs >= AI_INSIGHTS_TTL_MS;
}

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

function formatBytes(value?: number) {
  if (!value || value <= 0) {
    return "-";
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function getInitials(name?: string) {
  if (!name) {
    return "RV";
  }

  const parts = name
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) {
    return "RV";
  }

  return parts.map((entry) => entry[0]?.toUpperCase() ?? "").join("");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMarkdownSection(markdown: string, heading: string) {
  const pattern = new RegExp(
    `^##\\s+${escapeRegExp(heading)}\\s*$([\\s\\S]*?)(?=^##\\s+|$)`,
    "mi",
  );
  const match = markdown.match(pattern);

  if (!match) {
    return markdown;
  }

  return `## ${heading}\n\n${match[1].trim()}`.trim();
}

function extractExecutiveSummaryPreview(markdown: string) {
  const section = extractMarkdownSection(markdown, "Resumo Executivo");
  const content = section.replace(/^##\s+Resumo Executivo\s*/i, "").trim();

  if (!content) {
    return section;
  }

  const firstParagraph = content
    .split(/\n\s*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)[0];

  if (!firstParagraph) {
    return `## Resumo Executivo`;
  }

  return `## Resumo Executivo\n\n${firstParagraph}`.trim();
}

function extractAcceptanceOpinionPreview(markdown: string) {
  const section = extractMarkdownSection(markdown, "Parecer de Aceitacao");
  const content = section.replace(/^##\s+Parecer de Aceitacao\s*/i, "").trim();

  if (!content) {
    return section;
  }

  const firstParagraph = content
    .split(/\n\s*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)[0];

  if (!firstParagraph) {
    return `## Parecer de Aceitacao`;
  }

  return `## Parecer de Aceitacao\n\n${firstParagraph}`.trim();
}

function removeMarkdownSection(markdown: string, heading: string) {
  const pattern = new RegExp(
    `^##\\s+${escapeRegExp(heading)}\\s*$([\\s\\S]*?)(?=^##\\s+|$)`,
    "mi",
  );

  return markdown.replace(pattern, "").trim();
}

function buildInsightCollapsedPreview(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "";
  }

  if (normalizedText.length <= COLLAPSED_INSIGHT_PREVIEW_LENGTH) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, COLLAPSED_INSIGHT_PREVIEW_LENGTH).trimEnd()}...`;
}

function ReviewerAvatar({ reviewer }: { reviewer?: NormalizedPerson }) {
  const avatar = reviewer?.avatar?.trim();

  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={reviewer?.name ?? "Revisor"}
        width={40}
        height={40}
        unoptimized
        className="size-10 rounded-full border border-[#c9d7cf] object-cover dark:border-[#223129]"
      />
    );
  }

  return (
    <div className="flex size-10 items-center justify-center rounded-full border border-[#c9d7cf] bg-[#e8f0eb] text-xs font-semibold text-[#305241] dark:border-[#223129] dark:bg-[#1a261f] dark:text-[#c7dfd2]">
      {getInitials(reviewer?.name)}
    </div>
  );
}

function ReviewerInfoPopover({
  reviewer,
  loading,
}: {
  reviewer?: NormalizedPerson;
  loading?: boolean;
}) {
  if (!reviewer && !loading) {
    return null;
  }

  return (
    <div className="absolute left-0 top-12 z-20 w-72 rounded-xl border border-[#d6dfd8] bg-white p-3 text-xs shadow-[0_10px_35px_rgba(16,32,24,0.14)] dark:border-[#223129] dark:bg-[#0f1613] dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
      {loading ? (
        <p className="text-[#4f6559] dark:text-[#b5c0ba]">
          Carregando detalhes do revisor...
        </p>
      ) : reviewer ? (
        <>
          <p className="font-semibold text-[#102018] dark:text-[#f5f7f4]">
            {reviewer.name}
          </p>
          <div className="mt-2 space-y-1 text-[#4f6559] dark:text-[#b5c0ba]">
            <p>Email: {reviewer.email || "-"}</p>
            <p>Afiliacao: {reviewer.affiliation || "-"}</p>
            <p>Pais: {reviewer.country || "-"}</p>
            <p>Idioma: {reviewer.language || "-"}</p>
            <p>Area: {reviewer.actingArea || "-"}</p>
            <p>Titulo: {reviewer.profileTitle || "-"}</p>
            <p>ORCID: {reviewer.orcid || "-"}</p>
            <p>Lattes: {reviewer.lattes || "-"}</p>
            <p>Reviews: {reviewer.reviewCount ?? 0}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function AuthorInfoPopover({ author }: { author: NormalizedPerson }) {
  return (
    <div className="absolute left-0 top-12 z-20 w-72 rounded-xl border border-[#d6dfd8] bg-white p-3 text-xs shadow-[0_10px_35px_rgba(16,32,24,0.14)] dark:border-[#223129] dark:bg-[#0f1613] dark:shadow-[0_10px_35px_rgba(0,0,0,0.45)]">
      <p className="font-semibold text-[#102018] dark:text-[#f5f7f4]">
        {author.name}
      </p>
      <div className="mt-2 space-y-1 text-[#4f6559] dark:text-[#b5c0ba]">
        <p>Email: {author.email || "-"}</p>
        <p>Afiliacao: {author.affiliation || "-"}</p>
        <p>Pais: {author.country || "-"}</p>
        <p>Idioma: {author.language || "-"}</p>
        <p>Area: {author.actingArea || "-"}</p>
        <p>Titulo: {author.profileTitle || "-"}</p>
        <p>ORCID: {author.orcid || "-"}</p>
        <p>Lattes: {author.lattes || "-"}</p>
      </div>
    </div>
  );
}

export function SubmissionDossierPanel({
  submissionId,
}: {
  submissionId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<NormalizedSubmissionDossier | null>(
    null,
  );
  const [authenticated, setAuthenticated] = useState(false);
  const [reviewersExpanded, setReviewersExpanded] = useState(false);
  const [reviewersPage, setReviewersPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<
    Record<string, boolean>
  >({});
  const [reviewerInfoOpen, setReviewerInfoOpen] = useState<
    Record<string, boolean>
  >({});
  const [reviewerDetailsById, setReviewerDetailsById] = useState<
    Record<string, NormalizedPerson>
  >({});
  const [reviewerDetailsLoadingById, setReviewerDetailsLoadingById] = useState<
    Record<string, boolean>
  >({});
  const [authorInfoOpen, setAuthorInfoOpen] = useState<Record<string, boolean>>(
    {},
  );
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<AiInsightsResponse | null>(null);
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(false);
  const [displayedInsightText, setDisplayedInsightText] = useState("");
  const [isTypingInsight, setIsTypingInsight] = useState(false);
  const [copiedAiInsights, setCopiedAiInsights] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadDossier() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/submissions/${submissionId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as DossierResponse;

        if (cancelled) {
          return;
        }

        setAuthenticated(Boolean(payload.authenticated));

        if (!response.ok) {
          throw new Error(payload.message ?? "Falha ao carregar dossiê.");
        }

        setDossier(payload.dossier);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Falha ao carregar dossiê.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDossier();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const loadAiInsights = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      if (!authenticated) {
        return;
      }

      if (!force) {
        const cached = readAiInsightsCache(submissionId);

        if (cached && !isInsightExpired(cached.generatedAt)) {
          setAiInsights(cached);
          setAiInsightsError(null);
          return;
        }
      }

      setAiInsightsLoading(true);
      setAiInsightsError(null);

      try {
        const response = await fetch(
          `/api/submissions/${submissionId}/ai-insights`,
          {
            cache: "no-store",
          },
        );
        const payload = (await response.json()) as AiInsightsResponse;

        if (!response.ok) {
          throw new Error(payload.message ?? "Falha ao gerar AI Insights.");
        }

        setAiInsights(payload);
        writeAiInsightsCache(submissionId, payload);
      } catch (loadError) {
        setAiInsightsError(
          loadError instanceof Error
            ? loadError.message
            : "Falha ao gerar AI Insights.",
        );
      } finally {
        setAiInsightsLoading(false);
      }
    },
    [authenticated, submissionId],
  );

  useEffect(() => {
    setAiInsights(null);
    setDisplayedInsightText("");
    setAiInsightsExpanded(false);

    if (!authenticated) {
      return;
    }

    void loadAiInsights();
  }, [authenticated, loadAiInsights, submissionId]);

  useEffect(() => {
    const insight = aiInsights?.analysis ?? "";

    if (!insight) {
      setDisplayedInsightText("");
      setIsTypingInsight(false);
      return;
    }

    setDisplayedInsightText("");
    setIsTypingInsight(true);

    let cursor = 0;
    const step = 6;
    const timer = window.setInterval(() => {
      cursor += step;

      if (cursor >= insight.length) {
        setDisplayedInsightText(insight);
        setIsTypingInsight(false);
        window.clearInterval(timer);
        return;
      }

      setDisplayedInsightText(insight.slice(0, cursor));
    }, 16);

    return () => {
      window.clearInterval(timer);
    };
  }, [aiInsights?.analysis]);

  const submission = dossier?.submission ?? null;
  const mainAuthor =
    submission?.authors?.find((author) => author.isMainAuthor) ??
    submission?.authors?.[0];
  const getAuthorKey = (author: NormalizedSubmissionAuthor) =>
    `${author.person.id}-${author.order ?? "n"}`;
  const mainAuthorKey = mainAuthor ? getAuthorKey(mainAuthor) : null;
  const coauthors =
    submission?.authors?.filter(
      (author) => getAuthorKey(author) !== mainAuthorKey,
    ) ?? [];
  const reviewersPerPage = reviewersExpanded ? 10 : 5;
  const allReviewers = dossier?.reviewers ?? [];
  const reviewersTotal = allReviewers.length;
  const reviewersTotalPages = reviewersExpanded
    ? Math.max(1, Math.ceil(reviewersTotal / 10))
    : 1;
  const safeReviewersPage = Math.min(reviewersPage, reviewersTotalPages);
  const reviewersStart = reviewersExpanded ? (safeReviewersPage - 1) * 10 : 0;
  const visibleReviewers = allReviewers.slice(
    reviewersStart,
    reviewersStart + reviewersPerPage,
  );
  const hasLongInsight =
    displayedInsightText.length > COLLAPSED_INSIGHT_PREVIEW_LENGTH;
  const executiveSummaryMarkdown = useMemo(() => {
    if (!displayedInsightText) {
      return "";
    }

    return extractExecutiveSummaryPreview(displayedInsightText);
  }, [displayedInsightText]);

  const acceptanceOpinionMarkdown = useMemo(() => {
    if (!displayedInsightText) {
      return "";
    }

    return extractAcceptanceOpinionPreview(displayedInsightText);
  }, [displayedInsightText]);

  const insightMarkdownToRender = useMemo(() => {
    if (!displayedInsightText) {
      return "";
    }

    if (aiInsightsExpanded || !executiveSummaryMarkdown) {
      return removeMarkdownSection(
        displayedInsightText,
        "Parecer de Aceitacao",
      );
    }

    return executiveSummaryMarkdown;
  }, [aiInsightsExpanded, displayedInsightText, executiveSummaryMarkdown]);

  const collapsedInsightPreview = useMemo(() => {
    if (!displayedInsightText) {
      return "";
    }

    return buildInsightCollapsedPreview(displayedInsightText);
  }, [displayedInsightText]);

  async function loadReviewerDetails(reviewerId: string) {
    if (!reviewerId || reviewerId === "unknown") {
      return;
    }

    if (
      reviewerDetailsById[reviewerId] ||
      reviewerDetailsLoadingById[reviewerId]
    ) {
      return;
    }

    setReviewerDetailsLoadingById((current) => ({
      ...current,
      [reviewerId]: true,
    }));

    try {
      const response = await fetch(`/api/reviewers/${reviewerId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ReviewerResponse;

      if (response.ok && payload.reviewer) {
        setReviewerDetailsById((current) => ({
          ...current,
          [reviewerId]: payload.reviewer as NormalizedPerson,
        }));
      }
    } catch {
      // Mantem fallback para os dados ja existentes no dossie.
    } finally {
      setReviewerDetailsLoadingById((current) => ({
        ...current,
        [reviewerId]: false,
      }));
    }
  }

  async function handleCopyAiInsights() {
    if (!aiInsights?.analysis) {
      return;
    }

    try {
      await navigator.clipboard.writeText(aiInsights.analysis);
      setCopiedAiInsights(true);
      window.setTimeout(() => setCopiedAiInsights(false), 1800);
    } catch {
      // Ignora erro de clipboard.
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10 lg:py-10">
      <PageHeader
        badge="Dossiê"
        title={submission ? submission.title : "Dossiê da submissão"}
        description="Esta tela consolida a submissão, os revisores por interesse e os reviews em um único contrato interno."
        primaryAction="Voltar à fila"
        primaryActionHref="/submissions"
        secondaryAction="Abrir dashboard"
        secondaryActionHref="/"
      />

      {error ? (
        <Card className="border-[#e7c6c6] bg-[#fff6f6] text-[#7b1f1f] dark:border-[#5c2b2b] dark:bg-[#231313] dark:text-[#ffd3d3]">
          <CardContent className="p-5 text-sm leading-6">{error}</CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-[#dce2dc] bg-white/90 dark:border-[#24312b] dark:bg-[#111815]">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-[#5b6460] dark:text-[#aab4ae]">
              ID
            </p>
            <p className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              {submissionId}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#dce2dc] bg-white/90 dark:border-[#24312b] dark:bg-[#111815]">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-[#5b6460] dark:text-[#aab4ae]">
              Reviews
            </p>
            <p className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              {loading ? "..." : (dossier?.reviews.length ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#dce2dc] bg-white/90 dark:border-[#24312b] dark:bg-[#111815]">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-[#5b6460] dark:text-[#aab4ae]">
              Revisores
            </p>
            <p className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              {loading ? "..." : (dossier?.reviewers.length ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[#dce2dc] bg-white/90 dark:border-[#24312b] dark:bg-[#111815]">
          <CardContent className="space-y-2 p-5">
            <p className="text-sm font-medium text-[#5b6460] dark:text-[#aab4ae]">
              Autores
            </p>
            <p className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              {loading ? "..." : (submission?.authors?.length ?? 0)}
            </p>
          </CardContent>
        </Card>
      </section>

      {!loading && !authenticated ? (
        <EmptyState
          title="Login necessário"
          description="O dossiê só pode ser aberto com uma sessão válida. Entre novamente para continuar."
          actionLabel="Ir para login"
          actionHref="/login"
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="bg-white/90 dark:bg-[#111815]">
          <CardHeader className="space-y-3 border-b border-[#e6ece6] bg-white/70 dark:border-[#24312b] dark:bg-[#101713]">
            <Badge variant="outline" className="w-fit">
              Submissão consolidada
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#0f172a] dark:text-[#f5f7f4]">
              {submission?.title ?? "Carregando dossiê..."}
            </CardTitle>
            <CardDescription>
              {submission?.abstract ||
                "Resumo não disponível no contrato atual."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                  <FileText className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                  Status
                </div>
                <p className="text-sm leading-6 text-[#54615b] dark:text-[#aab4ae]">
                  {submission?.status ?? "-"}
                </p>
              </div>
              <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                  <Clock3 className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                  Atualização
                </div>
                <p className="text-sm leading-6 text-[#54615b] dark:text-[#aab4ae]">
                  {formatDate(submission?.updatedAt)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                <UserRound className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                Autoria
              </div>

              {submission?.authors?.length ? (
                <div className="space-y-3">
                  {mainAuthor ? (
                    <div className="rounded-xl border border-[#dce7de] bg-[#f8faf7] p-3 dark:border-[#24312b] dark:bg-[#161f1a]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <ReviewerAvatar reviewer={mainAuthor.person} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="accent">Autor principal</Badge>
                              <span className="truncate text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                                {mainAuthor.person.name}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[#5f6d67] dark:text-[#aab4ae]">
                              {mainAuthor.person.email || "Sem e-mail"}
                            </p>
                            {mainAuthor.person.affiliation ? (
                              <p className="text-xs text-[#6f7d76] dark:text-[#94a19b]">
                                {mainAuthor.person.affiliation}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-full border border-[#c7d4cc] text-[#5a6f63] transition-colors hover:bg-[#edf4ef] hover:text-[#233b30] dark:border-[#274035] dark:text-[#9fb7ab] dark:hover:bg-[#18241f] dark:hover:text-[#d7e5de]"
                            onClick={() =>
                              setAuthorInfoOpen((current) => ({
                                ...current,
                                [mainAuthorKey ?? "main"]:
                                  !current[mainAuthorKey ?? "main"],
                              }))
                            }
                            aria-label="Abrir detalhes do autor principal"
                            title="Mais infos"
                          >
                            <Info className="size-3.5" />
                          </button>
                          {authorInfoOpen[mainAuthorKey ?? "main"] ? (
                            <AuthorInfoPopover author={mainAuthor.person} />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    {coauthors.map((author) => (
                      <div
                        key={getAuthorKey(author)}
                        className="flex items-start justify-between gap-3 rounded-xl bg-[#f8faf7] px-3 py-2 dark:bg-[#161f1a]"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <ReviewerAvatar reviewer={author.person} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#0f172a] dark:text-[#f5f7f4]">
                              {author.person.name}
                            </p>
                            <p className="truncate text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                              {author.person.email || "Sem e-mail"}
                            </p>
                          </div>
                        </div>
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-full border border-[#c7d4cc] text-[#5a6f63] transition-colors hover:bg-[#edf4ef] hover:text-[#233b30] dark:border-[#274035] dark:text-[#9fb7ab] dark:hover:bg-[#18241f] dark:hover:text-[#d7e5de]"
                            onClick={() =>
                              setAuthorInfoOpen((current) => ({
                                ...current,
                                [getAuthorKey(author)]:
                                  !current[getAuthorKey(author)],
                              }))
                            }
                            aria-label="Abrir detalhes do autor"
                            title="Mais infos"
                          >
                            <Info className="size-3.5" />
                          </button>
                          {authorInfoOpen[getAuthorKey(author)] ? (
                            <AuthorInfoPopover author={author.person} />
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {!coauthors.length && mainAuthor ? (
                      <p className="text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                        Nenhum coautor além do autor principal.
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-[#5f6d67] dark:text-[#aab4ae]">
                  O endpoint não retornou dados de autoria para esta submissão.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                  <FileText className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                  Trilha e tópicos
                </div>
                <p className="text-sm text-[#54615b] dark:text-[#aab4ae]">
                  Trilha: {submission?.trackName ?? submission?.trackId ?? "-"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {submission?.topics?.length ? (
                    submission.topics.map((topic) => (
                      <Badge key={topic.id} variant="outline">
                        {topic.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-[#5f6d67] dark:text-[#aab4ae]">
                      Sem tópicos.
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                  <Paperclip className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                  Arquivos da submissão
                </div>
                {submission?.files?.length ? (
                  <div className="space-y-2">
                    {submission.files.map((file) => (
                      <div
                        key={file.id}
                        className="rounded-xl bg-[#f8faf7] px-3 py-2 dark:bg-[#161f1a]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[#0f172a] dark:text-[#f5f7f4]">
                              {file.name}
                            </p>
                            <p className="text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                              {formatBytes(file.size)}
                              {file.pageCount
                                ? ` • ${file.pageCount} páginas`
                                : ""}
                              {file.required ? " • obrigatório" : ""}
                            </p>
                          </div>
                          {file.id ? (
                            <a
                              href={`/api/submissions/${submissionId}/files/${file.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonVariants({
                                variant: "outline",
                                size: "sm",
                              })}
                              title="Baixar arquivo"
                              aria-label={`Baixar ${file.name}`}
                            >
                              <Download className="size-4" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#5f6d67] dark:text-[#aab4ae]">
                    Nenhum arquivo encontrado.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e2e8e2] p-4 dark:border-[#24312b]">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0f172a] dark:text-[#f5f7f4]">
                <Users className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                Revisores por interesse
              </div>
              <div className="space-y-3">
                {reviewersTotal ? (
                  visibleReviewers.map((reviewer) => (
                    <div
                      key={reviewer.id}
                      className="flex items-start justify-between gap-4 rounded-xl bg-[#f8faf7] p-3 dark:bg-[#161f1a]"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <ReviewerAvatar reviewer={reviewer} />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-[#0f172a] dark:text-[#f5f7f4]">
                            {reviewer.name}
                          </div>
                          <div className="truncate text-sm text-[#5f6d67] dark:text-[#aab4ae]">
                            {reviewer.email || "Sem email"}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-[#6f7d76] dark:text-[#94a19b]">
                            {reviewer.affiliation ? (
                              <span>{reviewer.affiliation}</span>
                            ) : null}
                            {reviewer.country ? (
                              <span>{reviewer.country}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {reviewer.reviewCount ?? 0} reviews
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[#5f6d67] dark:text-[#aab4ae]">
                    Nenhum revisor normalizado foi retornado para este dossiê.
                  </p>
                )}

                {reviewersTotal > 5 ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                      <span>
                        Exibindo {visibleReviewers.length} de {reviewersTotal}
                        {reviewersExpanded
                          ? ` (página ${safeReviewersPage}/${reviewersTotalPages})`
                          : ""}
                      </span>
                      <button
                        type="button"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                        onClick={() => {
                          setReviewersExpanded((current) => {
                            const next = !current;

                            if (!next) {
                              setReviewersPage(1);
                            }

                            return next;
                          });
                        }}
                      >
                        {reviewersExpanded ? "Recolher" : "Expandir lista"}
                      </button>
                    </div>

                    {reviewersExpanded && reviewersTotalPages > 1 ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                          onClick={() =>
                            setReviewersPage((current) =>
                              Math.max(current - 1, 1),
                            )
                          }
                          disabled={safeReviewersPage === 1}
                        >
                          Anterior
                        </button>
                        <button
                          type="button"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                          onClick={() =>
                            setReviewersPage((current) =>
                              Math.min(current + 1, reviewersTotalPages),
                            )
                          }
                          disabled={safeReviewersPage === reviewersTotalPages}
                        >
                          Próxima
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#eef3ef] text-[#102018] shadow-[0_24px_80px_rgba(13,20,17,0.18)] dark:bg-[#0d1411] dark:text-[#f2f6f3] dark:shadow-[0_24px_80px_rgba(13,20,17,0.35)]">
          <CardHeader>
            <Badge variant="accent" className="w-fit">
              Reviews normalizados
            </Badge>
            <CardTitle className="font-serif text-3xl text-[#102018] dark:text-[#f7faf8]">
              Critérios de avaliação
            </CardTitle>
            <CardDescription className="text-[#4f6559] dark:text-[#b5c0ba]">
              Perguntas e respostas dos formulários de review, com leitura
              rápida no estado colapsado e detalhe completo ao expandir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-4 dark:border-[#223129] dark:bg-[#111815]">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#102018] dark:text-[#f5f7f4]">
                  <Sparkles className="size-4 text-[#3a6b4f] dark:text-[#90c6a1]" />
                  AI Insights
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                    onClick={() => {
                      setAiInsights(null);
                      void loadAiInsights({ force: true });
                    }}
                    disabled={aiInsightsLoading}
                  >
                    <RefreshCw
                      className={
                        aiInsightsLoading ? "size-4 animate-spin" : "size-4"
                      }
                    />
                    Regenerar
                  </button>
                  <button
                    type="button"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                    onClick={handleCopyAiInsights}
                    disabled={!aiInsights?.analysis}
                  >
                    <Copy className="size-4" />
                    {copiedAiInsights ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              {aiInsightsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-10/12" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-9/12" />
                  <Skeleton className="h-4 w-8/12" />
                  <p className="animate-pulse text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                    IA digitando parecer academico...
                  </p>
                </div>
              ) : aiInsightsError ? (
                <p className="text-sm text-[#7b1f1f] dark:text-[#ffd3d3]">
                  {aiInsightsError}
                </p>
              ) : insightMarkdownToRender ? (
                <div className="space-y-2">
                  {!aiInsightsExpanded ? (
                    <div className="rounded-2xl border border-[#d2dfd7] bg-[#eef6f0] p-4 text-[#102018] shadow-sm dark:border-[#223129] dark:bg-[#132019] dark:text-[#f5f7f4]">
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <span aria-hidden="true">🟢</span>
                        Parecer de Aceitação
                      </p>
                      <div className="text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ children }) => (
                              <h2 className="mt-3 text-base font-semibold text-[#102018] dark:text-[#f5f7f4]">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mt-2 text-sm font-semibold text-[#233b30] dark:text-[#cde0d6]">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                                {children}
                              </p>
                            ),
                            li: ({ children }) => (
                              <li className="ml-4 list-disc text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                                {children}
                              </li>
                            ),
                          }}
                        >
                          {acceptanceOpinionMarkdown || collapsedInsightPreview}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : null}

                  {!aiInsightsExpanded ? (
                    <div className="rounded-2xl border border-[#dce7de] bg-[#f8faf7] p-4 dark:border-[#24312b] dark:bg-[#111815]">
                      <p className="text-base font-semibold text-[#102018] dark:text-[#f5f7f4]">
                        Resumo Executivo
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                        {collapsedInsightPreview}
                      </p>
                    </div>
                  ) : null}

                  {aiInsightsExpanded ? (
                    <div className="space-y-2 rounded-2xl border border-[#d2dfd7] bg-[#eef6f0] p-4 text-[#102018] shadow-sm dark:border-[#223129] dark:bg-[#132019] dark:text-[#f5f7f4]">
                      <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <span aria-hidden="true">🟢</span>
                        Parecer de Aceitação
                      </p>
                      <div className="space-y-2 text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ children }) => (
                              <h2 className="mt-3 text-base font-semibold text-[#102018] dark:text-[#f5f7f4]">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mt-2 text-sm font-semibold text-[#233b30] dark:text-[#cde0d6]">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                                {children}
                              </p>
                            ),
                            li: ({ children }) => (
                              <li className="ml-4 list-disc text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                                {children}
                              </li>
                            ),
                          }}
                        >
                          {acceptanceOpinionMarkdown || collapsedInsightPreview}
                        </ReactMarkdown>
                      </div>

                      <div className="space-y-2 text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ children }) => (
                              <h2 className="mt-3 text-base font-semibold text-[#102018] dark:text-[#f5f7f4]">
                                {children}
                              </h2>
                            ),
                            h3: ({ children }) => (
                              <h3 className="mt-2 text-sm font-semibold text-[#233b30] dark:text-[#cde0d6]">
                                {children}
                              </h3>
                            ),
                            p: ({ children }) => (
                              <p className="text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                                {children}
                              </p>
                            ),
                            li: ({ children }) => (
                              <li className="ml-4 list-disc text-sm leading-6 text-[#2f4137] dark:text-[#d2ddd7]">
                                {children}
                              </li>
                            ),
                          }}
                        >
                          {insightMarkdownToRender}
                        </ReactMarkdown>
                        {isTypingInsight ? (
                          <span className="inline-block animate-pulse text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                            digitando...
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {aiInsightsExpanded ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6e7d76] dark:text-[#92a099]">
                        <span className="rounded-full bg-[#eef3ef] px-2.5 py-1 dark:bg-[#16201c]">
                          {aiInsights?.hasReviews
                            ? "Com reviews humanos"
                            : "Sem reviews humanos"}
                        </span>
                        <span className="rounded-full bg-[#eef3ef] px-2.5 py-1 dark:bg-[#16201c]">
                          {aiInsights?.usedPdfContext
                            ? "Leitura do PDF confirmada"
                            : "Leitura do PDF nao confirmada"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5f6d67] dark:text-[#aab4ae]">
                        Gerado em {formatDate(aiInsights?.generatedAt)}
                      </p>
                    </div>
                  ) : null}
                  {hasLongInsight ? (
                    <button
                      type="button"
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                      onClick={() =>
                        setAiInsightsExpanded((current) => !current)
                      }
                    >
                      {aiInsightsExpanded
                        ? "Recolher insight"
                        : "Expandir insight"}
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-[#5f6d67] dark:text-[#aab4ae]">
                  Insights ainda nao disponiveis.
                </p>
              )}
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-24 animate-pulse rounded-2xl bg-[#dce8e1] dark:bg-[#111815]" />
                <div className="h-24 animate-pulse rounded-2xl bg-[#dce8e1] dark:bg-[#111815]" />
              </div>
            ) : dossier?.reviews.length ? (
              dossier.reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-2xl border border-[#c9d7cf] bg-[#f8fbf9] p-3 dark:border-[#223129] dark:bg-[#111815]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {(() => {
                      const reviewerId =
                        review.reviewer?.id ??
                        (review.reviewerId !== "unknown"
                          ? review.reviewerId
                          : undefined);
                      const detailedReviewer = reviewerId
                        ? reviewerDetailsById[reviewerId]
                        : undefined;
                      const displayReviewer =
                        detailedReviewer ?? review.reviewer;
                      const isInfoLoading = reviewerId
                        ? Boolean(reviewerDetailsLoadingById[reviewerId])
                        : false;

                      return (
                        <div className="flex items-center gap-3">
                          <ReviewerAvatar reviewer={displayReviewer} />
                          <div className="relative">
                            <div className="flex items-center gap-1.5">
                              <div className="text-sm font-semibold text-[#102018] dark:text-[#f5f7f4]">
                                {displayReviewer?.name ??
                                  (review.reviewerId === "unknown"
                                    ? "Revisor anonimo"
                                    : review.reviewerId)}
                              </div>
                              <button
                                type="button"
                                className="inline-flex size-7 items-center justify-center rounded-full border border-[#c7d4cc] text-[#5a6f63] transition-colors hover:bg-[#edf4ef] hover:text-[#233b30] disabled:opacity-45 dark:border-[#274035] dark:text-[#9fb7ab] dark:hover:bg-[#18241f] dark:hover:text-[#d7e5de]"
                                onClick={() => {
                                  setReviewerInfoOpen((current) => ({
                                    ...current,
                                    [review.id]: !current[review.id],
                                  }));

                                  if (reviewerId) {
                                    void loadReviewerDetails(reviewerId);
                                  }
                                }}
                                disabled={!reviewerId}
                                aria-label="Abrir detalhes do revisor"
                                title="Mais infos"
                              >
                                <Info className="size-3.5" />
                              </button>
                            </div>
                            <div className="text-[11px] text-[#6f8378] dark:text-[#90a59a]">
                              {review.formName ?? "Formulario de review"}
                            </div>
                            {reviewerInfoOpen[review.id] ? (
                              <ReviewerInfoPopover
                                reviewer={displayReviewer}
                                loading={isInfoLoading}
                              />
                            ) : null}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{review.status}</Badge>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-[#c7d4cc] text-[#556b5f] transition-colors hover:bg-[#edf4ef] hover:text-[#233b30] dark:border-[#274035] dark:text-[#9fb7ab] dark:hover:bg-[#18241f] dark:hover:text-[#d7e5de]"
                        onClick={() =>
                          setExpandedReviews((current) => ({
                            ...current,
                            [review.id]: !current[review.id],
                          }))
                        }
                        aria-label={
                          expandedReviews[review.id]
                            ? "Recolher review"
                            : "Expandir review"
                        }
                        title={
                          expandedReviews[review.id] ? "Recolher" : "Expandir"
                        }
                      >
                        {expandedReviews[review.id] ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                    <Badge variant="outline">
                      Respondidos {review.answeredCriteriaCount}/
                      {review.criteriaCount}
                    </Badge>
                  </div>

                  <p className="mt-2 line-clamp-1 whitespace-pre-line text-[12px] leading-5 text-[#5b6f64] dark:text-[#c0cdc7]">
                    {review.summary || "Sem resumo textual disponível."}
                  </p>

                  {expandedReviews[review.id] ? (
                    <div className="mt-4 space-y-3 border-t border-[#d6dfd8] pt-4 dark:border-[#223129]">
                      <div className="flex flex-wrap gap-2 text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                        {review.assignedAt ? (
                          <Badge variant="outline">
                            Atribuido em {formatDate(review.assignedAt)}
                          </Badge>
                        ) : null}
                        {review.dueAt ? (
                          <Badge variant="outline">
                            Prazo {formatDate(review.dueAt)}
                          </Badge>
                        ) : null}
                        {review.completedAt ? (
                          <Badge variant="outline">
                            Concluido em {formatDate(review.completedAt)}
                          </Badge>
                        ) : null}
                      </div>

                      {review.criteria.length ? (
                        <div className="space-y-3">
                          {review.criteria.map((criterion) => {
                            const selectedChoiceIds = new Set(
                              criterion.answers
                                .map((answer) => answer.fieldChoiceId)
                                .filter((value): value is string =>
                                  Boolean(value),
                                ),
                            );
                            const isRadioType =
                              criterion.type.toUpperCase() === "RADIO";

                            return (
                              <div
                                key={criterion.fieldId}
                                className="rounded-xl border border-[#d6dfd8] bg-white/70 p-3 dark:border-[#223129] dark:bg-[#0f1613]"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <p className="flex items-start gap-1.5 text-sm font-semibold text-[#102018] dark:text-[#f5f7f4]">
                                    <HelpCircle className="mt-0.5 size-3.5 shrink-0 text-[#5f7a6b] dark:text-[#98b3a5]" />
                                    <span>{criterion.label}</span>
                                  </p>
                                  <Badge variant="outline">
                                    {criterion.type}
                                  </Badge>
                                </div>

                                {criterion.description ? (
                                  <p className="mt-1 text-xs leading-5 text-[#5f6d67] dark:text-[#aab4ae]">
                                    {criterion.description}
                                  </p>
                                ) : null}

                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#7a8a83] dark:text-[#889d93]">
                                  <span>Peso: {criterion.weight ?? "-"}</span>
                                  <span>Ordem: {criterion.order ?? "-"}</span>
                                  <span>
                                    Obrigatorio:{" "}
                                    {criterion.mandatory ? "sim" : "nao"}
                                  </span>
                                  <span>
                                    Oculto: {criterion.hidden ? "sim" : "nao"}
                                  </span>
                                </div>

                                {criterion.choices.length ? (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {criterion.choices.map((choice) => {
                                      const isSelected = selectedChoiceIds.has(
                                        choice.id,
                                      );

                                      return (
                                        <Badge
                                          key={choice.id}
                                          variant={
                                            isSelected ? "accent" : "outline"
                                          }
                                          className={
                                            isSelected ? "gap-1.5" : undefined
                                          }
                                        >
                                          {isSelected ? (
                                            <Check className="size-3.5" />
                                          ) : null}
                                          {choice.label}
                                          {typeof choice.weight === "number"
                                            ? ` (${choice.weight})`
                                            : ""}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                ) : null}

                                {!isRadioType ? (
                                  <div className="mt-2 space-y-1">
                                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#5f6d67] dark:text-[#aab4ae]">
                                      <MessageSquareText className="size-3.5" />
                                      Resposta
                                    </p>
                                    {criterion.answers.length ? (
                                      criterion.answers.map((answer) => (
                                        <div
                                          key={answer.id}
                                          className="rounded-lg border border-[#dbe5df] bg-[#f4f8f5] px-3 py-2 text-sm text-[#2f4137] dark:border-[#21322a] dark:bg-[#16221c] dark:text-[#d2ddd7]"
                                        >
                                          <p>
                                            {answer.value ??
                                              answer.fieldChoiceLabel ??
                                              "Sem valor"}
                                          </p>
                                          {answer.updatedAt ? (
                                            <p className="mt-1 text-[11px] opacity-75">
                                              Atualizado{" "}
                                              {formatDate(answer.updatedAt)}
                                            </p>
                                          ) : null}
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                                        Sem resposta registrada para este
                                        criterio.
                                      </p>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-[#5f6d67] dark:text-[#aab4ae]">
                          A API nao retornou criterios para esta review.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <EmptyState
                title="Sem reviews consolidados"
                description="Quando a API fornecer avaliações por submissão, elas aparecerão aqui em formato já preparado para a UI."
                actionLabel="Voltar à fila"
                actionHref="/submissions"
                className="border-[#c9d7cf] bg-[#f8fbf9] text-[#102018] dark:border-[#223129] dark:bg-[#111815] dark:text-[#f2f6f3]"
              />
            )}

            <div className="flex flex-wrap gap-3">
              <Link
                className={buttonVariants({ variant: "default" })}
                href="/submissions"
              >
                Voltar à fila
                <ArrowRight className="size-4" />
              </Link>
              <Link className={buttonVariants({ variant: "outline" })} href="/">
                Abrir dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
