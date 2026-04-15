import { NextResponse } from "next/server";

import { getSubmissionListForUser } from "../../../lib/jems3";
import { getSessionContextFromCookie } from "../../../lib/session";

export async function GET() {
  const { session, token } = await getSessionContextFromCookie();

  if (!session.user || !token) {
    return NextResponse.json(
      { message: "Sessão não encontrada.", authenticated: false },
      { status: 401 },
    );
  }

  try {
    const submissions = await getSubmissionListForUser(token, session.user.id);

    return NextResponse.json(
      {
        authenticated: true,
        user: session.user,
        submissions,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao carregar submissões.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
