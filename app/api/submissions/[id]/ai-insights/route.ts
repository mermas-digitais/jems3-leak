import { NextResponse } from "next/server";

import { fetchJems3Json, getSubmissionDossier } from "../../../../../lib/jems3";
import { getSessionContextFromCookie } from "../../../../../lib/session";
import type { NormalizedSubmissionDossier } from "../../../../../types/jems3";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type GroqChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const PDF_CONTEXT_TARGET_CHARS = 18000;
const PDF_CONTEXT_SEGMENT_CHARS = 5000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getFileId(value: unknown) {
  const fileId = readString(value) ?? String(value ?? "").trim();

  return fileId || null;
}

function unwrapPayload(value: unknown) {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }

  return value;
}

function buildCriteriaDigest(dossier: NormalizedSubmissionDossier) {
  const criteriaByField = new Map<
    string,
    {
      label: string;
      type: string;
      description?: string;
      mentions: number;
      answers: string[];
    }
  >();

  for (const review of dossier.reviews) {
    for (const criterion of review.criteria) {
      const current = criteriaByField.get(criterion.fieldId) ?? {
        label: criterion.label,
        type: criterion.type,
        description: criterion.description,
        mentions: 0,
        answers: [],
      };

      current.mentions += 1;

      for (const answer of criterion.answers) {
        const text =
          answer.value ?? answer.fieldChoiceLabel ?? answer.fieldChoiceId;

        if (text && current.answers.length < 8) {
          current.answers.push(text);
        }
      }

      criteriaByField.set(criterion.fieldId, current);
    }
  }

  return Array.from(criteriaByField.values())
    .slice(0, 30)
    .map((entry, index) => {
      const sampledAnswers = entry.answers.length
        ? ` | respostas: ${entry.answers.slice(0, 4).join(" ; ")}`
        : "";

      return `${index + 1}. ${entry.label} [${entry.type}]${
        entry.description ? ` - ${entry.description}` : ""
      }${sampledAnswers}`;
    })
    .join("\n");
}

function buildReviewsDigest(dossier: NormalizedSubmissionDossier) {
  if (!dossier.reviews.length) {
    return "Sem revisoes humanas registradas ate o momento.";
  }

  return dossier.reviews
    .map((review, index) => {
      const reviewer = review.reviewer?.name ?? `Revisor ${review.reviewerId}`;
      const textCriteria = review.criteria
        .filter((criterion) =>
          ["TEXT", "LONGTEXT", "LONG_TEXT"].includes(
            criterion.type.toUpperCase(),
          ),
        )
        .flatMap((criterion) =>
          criterion.answers
            .map((answer) => answer.value)
            .filter((value): value is string => Boolean(value))
            .slice(0, 2)
            .map((value) => `${criterion.label}: ${value}`),
        )
        .slice(0, 4);

      const scores = review.scores
        .filter((score) => score.value)
        .slice(0, 6)
        .map((score) => `${score.label}: ${score.value}`)
        .join(" | ");

      return [
        `${index + 1}. ${reviewer} (${review.status})`,
        scores ? `Pontuacoes: ${scores}` : "Pontuacoes: sem dados.",
        textCriteria.length
          ? `Observacoes: ${textCriteria.join(" || ")}`
          : "Observacoes: sem comentario textual.",
      ].join("\n");
    })
    .join("\n\n");
}

function buildPdfContextFromText(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return null;
  }

  if (normalizedText.length <= PDF_CONTEXT_TARGET_CHARS) {
    return normalizedText;
  }

  const segmentLength = Math.min(
    PDF_CONTEXT_SEGMENT_CHARS,
    Math.floor(PDF_CONTEXT_TARGET_CHARS / 3),
  );
  const middleStart = Math.max(
    Math.floor((normalizedText.length - segmentLength) / 2),
    segmentLength,
  );

  const startSegment = normalizedText.slice(0, segmentLength);
  const middleSegment = normalizedText.slice(
    middleStart,
    middleStart + segmentLength,
  );
  const endSegment = normalizedText.slice(-segmentLength);

  return [
    "[Trecho inicial do PDF]",
    startSegment,
    "",
    "[Trecho central do PDF]",
    middleSegment,
    "",
    "[Trecho final do PDF]",
    endSegment,
  ].join("\n");
}

function isLikelyPdfFile(entry: unknown) {
  if (!isRecord(entry)) {
    return false;
  }

  const filePath = readString(entry.file) ?? "";
  const contentType = (readString(entry.contentType) ?? "").toLowerCase();
  const name = (readString(entry.name) ?? "").toLowerCase();

  return (
    filePath.toLowerCase().endsWith(".pdf") ||
    contentType.includes("pdf") ||
    name.endsWith(".pdf")
  );
}

function getSubmissionFileCandidates(files: unknown[]) {
  const prioritized = files.filter(isLikelyPdfFile);
  const fallback = files;
  const seen = new Set<string>();

  return [...prioritized, ...fallback].flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }

    const fileId = getFileId(entry.id);

    if (!fileId || seen.has(fileId)) {
      return [];
    }

    seen.add(fileId);

    return [{ fileId, name: readString(entry.name) ?? "arquivo" }];
  });
}

async function downloadAndParsePdf(
  request: Request,
  submissionId: string,
  fileId: string,
) {
  const downloadUrl = new URL(
    `/api/submissions/${encodeURIComponent(submissionId)}/files/${encodeURIComponent(fileId)}/download`,
    request.url,
  );

  const upstreamResponse = await fetch(downloadUrl, {
    method: "GET",
    headers: {
      Accept: "application/pdf,*/*",
      cookie: request.headers.get("cookie") ?? "",
    },
    cache: "no-store",
  });

  if (!upstreamResponse.ok) {
    return null;
  }

  const buffer = Buffer.from(await upstreamResponse.arrayBuffer());

  if (!buffer.length) {
    return null;
  }

  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();

    return buildPdfContextFromText(parsed.text);
  } catch {
    return null;
  }
}

function buildPrompt(
  dossier: NormalizedSubmissionDossier,
  pdfExcerpt?: string,
) {
  const submission = dossier.submission;
  const hasReviews = dossier.reviews.length > 0;
  const hasAbstract = Boolean(submission.abstract?.trim());
  const hasPdf = Boolean(pdfExcerpt?.trim());
  const hasArticleContext = hasAbstract || hasPdf;

  const submissionContext = [
    `Titulo: ${submission.title}`,
    `Resumo: ${submission.abstract || "Nao informado"}`,
    `Status: ${submission.status}`,
    `Trilha: ${submission.trackName ?? submission.trackId ?? "Nao informada"}`,
    `Topicos: ${
      submission.topics?.map((topic) => topic.name).join("; ") ||
      "Nao informados"
    }`,
    `Arquivos: ${
      submission.files
        ?.map(
          (file) =>
            `${file.name} (${file.pageCount ?? "?"} paginas, ${
              file.contentType ?? "tipo desconhecido"
            })`,
        )
        .join("; ") || "Nao informados"
    }`,
  ].join("\n");

  const criteriaDigest = buildCriteriaDigest(dossier);
  const reviewsDigest = buildReviewsDigest(dossier);

  return [
    "Voce e um revisor academico experiente de comite de programa.",
    "Produza analise tecnica em tom formal, objetivo, com foco em rigor metodologico, clareza, contribuicao cientifica e aderencia ao escopo.",
    "A resposta DEVE ser em Markdown valido e bem estruturado.",
    "Se houver PDF, trate-o como o arquivo original anexado da submissao, obtido diretamente do download do anexo oficial; nao trate esse contexto como apenas resumo, titulo ou metadados.",
    "",
    `Contexto da submissao:\n${submissionContext}`,
    "",
    `Criterios de avaliacao inferidos dos formularios:\n${criteriaDigest || "Sem criterios identificados."}`,
    "",
    `Sintese das revisoes humanas:\n${reviewsDigest}`,
    "",
    pdfExcerpt
      ? `Conteudo extraido do PDF original anexado (amostra):\n${pdfExcerpt}`
      : "Conteudo do PDF original anexado: nao disponivel.",
    "",
    "Instrucoes de saida (obrigatorias):",
    "1) Estruture a resposta com estes titulos Markdown de nivel 2 (##), exatamente nesta ordem:",
    "- ## Parecer de Aceitacao",
    "- ## Resumo Executivo",
    "- ## Parecer IA Independente",
    "- ## Discussao das Avaliacoes Humanas",
    "- ## Convergencias e Divergencias",
    "- ## Riscos para Aceitacao",
    "- ## Recomendacoes Acionaveis",
    "- ## Veredito Provisorio",
    "2) Diferencie explicitamente o que e avaliacao propria da IA (secao Parecer IA Independente) e o que e leitura critica dos pareceres humanos (secao Discussao das Avaliacoes Humanas).",
    "3) A secao 'Parecer de Aceitacao' deve ser independente do Resumo Executivo, destacada com emoji no inicio e conter uma frase curta e direta com o veredito.",
    "4) O veredito dessa secao deve usar exatamente um dos seguintes status padronizados, sem sinonimos: Aceitar, Aceitar com ressalvas, Rejeitar, Rejeitar com ressalvas, Fortemente aceitar, Fortemente rejeitar.",
    "5) Sempre prefira refletir o status de aceitacao a partir das avaliacoes e criterios disponiveis; quando houver conflito entre sinais, explique a divergencia de forma breve na mesma secao.",
    "6) O Resumo Executivo deve sintetizar em 2 a 4 paragrafos o julgamento geral, sem repetir integralmente a secao de aceitação.",
    "7) Quando NAO houver revisoes humanas, deixe isso claro na secao Discussao das Avaliacoes Humanas e use 'Nao ha revisoes humanas disponiveis ate o momento'.",
    "8) Quando houver PDF disponivel, use o conteudo extraido dele como fonte primaria do artigo original para resumir objetivo, metodologia, resultados, contribuicoes, limitacoes e conclusao.",
    "9) Quando NAO houver contexto de artigo (sem PDF e sem resumo util), declare insuficiencia de evidencia e evite inferencias fortes. Priorize riscos, lacunas e pedidos de informacao.",
    "10) Quando houver PDF disponivel, deixe claro se a leitura foi feita a partir do texto integral extraido do anexo oficial, e nao apenas do resumo ou do titulo.",
    "11) Quando houver revisoes humanas, sintetize convergencias e divergencias e compare com os criterios.",
    "12) Inclua um bloco final curto chamado '### Confianca da Analise' com nivel (Alta/Media/Baixa) e justificativa em 1-2 frases.",
    "13) Responda em portugues do Brasil.",
    "14) Pode usar emojis de forma moderada (no maximo 1-3 em toda resposta), apenas para sinalizar tom/empatia, sem perder rigor tecnico e criticidade.",
    "15) Evite linguagem promocional e hiperbolica.",
    `16) Estado atual: hasReviews=${hasReviews ? "true" : "false"}; hasArticleContext=${hasArticleContext ? "true" : "false"}; hasPdf=${hasPdf ? "true" : "false"}; hasAbstract=${hasAbstract ? "true" : "false"}.`,
  ].join("\n");
}

async function extractPdfExcerpt(
  request: Request,
  token: string,
  submissionId: string,
) {
  const { response, payload } = await fetchJems3Json(
    `/submission/${submissionId}/`,
    {
      token,
    },
  );

  if (!response.ok) {
    return { text: null, usedPdfContext: false };
  }

  const source = unwrapPayload(payload);

  if (!isRecord(source) || !Array.isArray(source.files)) {
    return { text: null, usedPdfContext: false };
  }

  const candidates = getSubmissionFileCandidates(source.files);

  if (!candidates.length) {
    return { text: null, usedPdfContext: false };
  }

  for (const candidate of candidates) {
    const pdfContext = await downloadAndParsePdf(
      request,
      submissionId,
      candidate.fileId,
    );

    if (pdfContext) {
      return {
        text: pdfContext,
        usedPdfContext: true,
      };
    }
  }

  return { text: null, usedPdfContext: false };
}

async function generateGroqAnalysis(prompt: string) {
  const apiKey = process.env.GROQ_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GROQ_API_KEY nao configurada.");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.25,
        max_completion_tokens: 1400,
        messages: [
          {
            role: "system",
            content:
              "Voce atua como parecerista academico em Ciencias da Computacao, com escrita tecnica, imparcial e orientada a decisao editorial.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Falha na Groq (${response.status}): ${errorBody.slice(0, 240)}`,
    );
  }

  const payload = (await response.json()) as GroqChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("Groq retornou resposta vazia.");
  }

  return content;
}

export async function GET(request: Request, context: RouteContext) {
  const { session, token } = await getSessionContextFromCookie();

  if (!session.user || !token) {
    return NextResponse.json(
      { message: "Sessao nao encontrada.", authenticated: false },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const dossier = await getSubmissionDossier(token, id);
    const { text: pdfExcerpt, usedPdfContext } = await extractPdfExcerpt(
      request,
      token,
      id,
    );
    const prompt = buildPrompt(dossier, pdfExcerpt ?? undefined);
    const analysis = await generateGroqAnalysis(prompt);

    return NextResponse.json(
      {
        analysis,
        hasReviews: dossier.reviews.length > 0,
        usedPdfContext,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao gerar AI Insights.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
