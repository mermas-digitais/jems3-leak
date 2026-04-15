import { NextResponse } from "next/server";

import { getJems3ApiBaseUrl } from "../../../../../../../lib/auth";
import { fetchJems3Json } from "../../../../../../../lib/jems3";
import { getSessionContextFromCookie } from "../../../../../../../lib/session";

type RouteContext = {
  params: Promise<{ id: string; fileId: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export async function GET(_: Request, context: RouteContext) {
  const { session, token } = await getSessionContextFromCookie();

  if (!session.user || !token) {
    return NextResponse.json(
      { message: "Sessao nao encontrada.", authenticated: false },
      { status: 401 },
    );
  }

  const baseUrl = getJems3ApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "JEMS3_API_BASE_URL nao configurada." },
      { status: 500 },
    );
  }

  try {
    const { id, fileId } = await context.params;
    const { response, payload } = await fetchJems3Json(`/submission/${id}/`, {
      token,
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Falha ao carregar submissao para download." },
        { status: response.status },
      );
    }

    const source =
      isRecord(payload) && isRecord(payload.data) ? payload.data : payload;

    if (!isRecord(source) || !Array.isArray(source.files)) {
      return NextResponse.json(
        { message: "Submissao sem lista de arquivos." },
        { status: 404 },
      );
    }

    const file = source.files.find(
      (entry) => isRecord(entry) && String(entry.id) === fileId,
    );

    if (!isRecord(file)) {
      return NextResponse.json(
        { message: "Arquivo nao encontrado para a submissao." },
        { status: 404 },
      );
    }

    const upstreamResponse = await fetch(
      `${baseUrl}/submission/downloadFile/${encodeURIComponent(fileId)}`,
      {
        method: "GET",
        headers: {
          Accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      return NextResponse.json(
        { message: "Falha ao baixar arquivo no provedor." },
        { status: upstreamResponse.status || 502 },
      );
    }

    const fileName = readString(file.name) ?? `arquivo-${fileId}`;
    const contentType =
      upstreamResponse.headers.get("content-type") ??
      "application/octet-stream";
    const contentDisposition =
      upstreamResponse.headers.get("content-disposition") ??
      `attachment; filename="${fileName}"`;

    return new NextResponse(upstreamResponse.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao baixar arquivo.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
