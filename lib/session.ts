import { cookies } from "next/headers";

import { authCookieName } from "./auth";
import { getServerSession } from "./jems3";

export async function getSessionContextFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore.get(authCookieName)?.value ?? null;
  const session = await getServerSession(token);

  return {
    token,
    session,
  };
}
