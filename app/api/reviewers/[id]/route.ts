import { NextResponse } from "next/server";

import { getReviewerDetails } from "../../../../lib/jems3";
import { getSessionContextFromCookie } from "../../../../lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { session, token } = await getSessionContextFromCookie();

  if (!session.user || !token) {
    return NextResponse.json(
      { message: "Sessao nao encontrada.", authenticated: false },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const reviewer = await getReviewerDetails(token, id);

    if (!reviewer) {
      return NextResponse.json(
        { message: "Detalhes do revisor nao encontrados." },
        { status: 404 },
      );
    }

    return NextResponse.json({ reviewer }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao carregar detalhes do revisor.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
