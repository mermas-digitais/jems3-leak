import { NextResponse } from "next/server";

import { getSessionContextFromCookie } from "../../../../lib/session";

export async function GET() {
  const { session } = await getSessionContextFromCookie();

  return NextResponse.json(session, { status: 200 });
}
