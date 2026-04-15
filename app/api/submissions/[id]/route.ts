import { NextResponse } from "next/server";

import { getSubmissionDossier } from "../../../../lib/jems3";
import { getSessionContextFromCookie } from "../../../../lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { session, token } = await getSessionContextFromCookie();

  if (!session.user || !token) {
    return NextResponse.json(
      { message: "Sessão não encontrada.", authenticated: false },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const dossier = await getSubmissionDossier(token, id);

    return NextResponse.json(
      {
        authenticated: true,
        user: session.user,
        dossier,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar dossiê.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
