import { NextRequest, NextResponse } from "next/server";

import {
  authCookieMaxAge,
  authCookieName,
  getJems3ApiBaseUrl,
} from "../../../../lib/auth";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function unwrapPayload(value: unknown) {
  if (isRecord(value) && isRecord(value.data)) {
    return value.data;
  }

  return value;
}

function readMessage(input: unknown) {
  if (!isRecord(input)) {
    return undefined;
  }

  return (
    readString(input.message) ??
    readString(input.detail) ??
    readString(input.error) ??
    readString(input.non_field_errors)
  );
}

function extractToken(input: unknown): string | null {
  if (!isRecord(input)) {
    return null;
  }

  const directToken =
    readString(input.accessToken) ??
    readString(input.access) ??
    readString(input.token) ??
    readString(input.jwt) ??
    readString(input.authToken);

  if (directToken) {
    return directToken;
  }

  if (isRecord(input.tokens)) {
    return extractToken(input.tokens);
  }

  return null;
}

function extractUser(input: unknown) {
  if (!isRecord(input)) {
    return null;
  }

  const user = input.user ?? input.account ?? input.profile;

  if (isRecord(user)) {
    return user;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const baseUrl = getJems3ApiBaseUrl();

  if (!baseUrl) {
    return NextResponse.json(
      { message: "JEMS3_API_BASE_URL não configurada." },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { message: "Corpo inválido para autenticação." },
      { status: 400 },
    );
  }

  const identifier =
    typeof body.identifier === "string"
      ? body.identifier.trim()
      : typeof body.email === "string"
        ? body.email.trim()
        : "";
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!identifier || !password) {
    return NextResponse.json(
      { message: "Informe e-mail/identificador e senha." },
      { status: 400 },
    );
  }

  const loginPayload = identifier.includes("@")
    ? { email: identifier, password }
    : { identifier, password };

  const response = await fetch(`${baseUrl}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(loginPayload),
    cache: "no-store",
  });

  const rawData = await response.json().catch(() => null);
  const data = unwrapPayload(rawData);

  if (!response.ok) {
    return NextResponse.json(
      {
        message:
          readMessage(data) ??
          readMessage(rawData) ??
          "Falha ao autenticar no JEMS3.",
      },
      { status: response.status },
    );
  }

  const sessionToken = extractToken(data) ?? extractToken(rawData);

  if (!sessionToken) {
    return NextResponse.json(
      {
        message:
          readMessage(data) ??
          readMessage(rawData) ??
          "Login retornou sucesso sem token de sessão.",
        hasSession: false,
      },
      { status: 401 },
    );
  }

  const user = extractUser(data) ?? extractUser(rawData);

  const sessionCookie = NextResponse.json(
    {
      user,
      hasSession: true,
    },
    { status: 200 },
  );

  sessionCookie.cookies.set(authCookieName, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: authCookieMaxAge,
  });

  return sessionCookie;
}
