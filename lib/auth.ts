export const authCookieName = "neo_academico_session";
export const authCookieMaxAge = 60 * 60 * 24 * 7;

export type InternalAuthSession = {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id?: string | number;
    name?: string;
    email?: string;
    avatar?: string;
    role?: string;
  };
};

export function getJems3ApiBaseUrl() {
  const value = process.env.JEMS3_API_BASE_URL?.trim();

  if (!value) {
    return null;
  }

  return value.replace(/\/$/, "");
}
