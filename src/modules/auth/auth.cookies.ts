import { CookieOptions, Response } from "express";
import { env, isProd } from "../../config/env.js";
import { ACCESS_TTL_MS } from "../../config/constants.js";

export const COOKIE = {
  session: "sid",
  access: "a.token",
  refresh: "r.token",
} as const;

const REFRESH_PATH = "/auth/refresh";

const base: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
};

type AuthTokens = {
  sessionToken: string;
  accessToken: string;
  refreshToken: string;
};

export function setSessionCookie(res: Response, token: string, maxAge: number) {
  res.cookie(COOKIE.session, token, { ...base, maxAge });
}

export function setAuthCookies(res: Response, tokens: AuthTokens) {
  setSessionCookie(res, tokens.sessionToken, env.session_ttl_ms);
  res.cookie(COOKIE.access, tokens.accessToken, {
    ...base,
    maxAge: ACCESS_TTL_MS,
  });
  res.cookie(COOKIE.refresh, tokens.refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: env.session_ttl_ms,
  });
}

// Flags and path must match how each cookie was set, or the browser keeps it
export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE.session, base);
  res.clearCookie(COOKIE.access, base);
  res.clearCookie(COOKIE.refresh, { ...base, path: REFRESH_PATH });
}
