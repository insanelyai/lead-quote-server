import { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { pool } from "../lib/database.js";
import { COOKIE } from "../modules/auth/auth.cookies.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// CSRF_EXPIRED is the only code the client may recover from by refetching
// a token and retrying; the others mean a client bug or a bad request.
type CsrfErrorCode = "CSRF_MISSING" | "CSRF_EXPIRED" | "CSRF_INVALID";

function fail(res: Response, code: CsrfErrorCode) {
  return res.status(403).json({ error: "CSRF validation failed", code });
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function verifyCsrf(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (SAFE_METHODS.has(req.method)) return next();

  try {
    const sessionCookie = req.cookies?.[COOKIE.session];
    const headerToken = req.get("x-csrf-token");
    if (!headerToken) return fail(res, "CSRF_MISSING");
    // The browser drops the cookie once its maxAge passes
    if (!sessionCookie) return fail(res, "CSRF_EXPIRED");

    const payload = jwt.verify(sessionCookie, env.csrf_secret, {
      algorithms: ["HS256"],
    }) as { id: string };

    const { rows } = await pool.query(
      "SELECT csrf_token FROM session WHERE id=$1 AND expiry > now()",
      [payload.id],
    );

    if (!rows[0]) return fail(res, "CSRF_EXPIRED");
    if (!safeEqual(rows[0].csrf_token, headerToken)) {
      return fail(res, "CSRF_INVALID");
    }

    res.locals.sessionId = payload.id;

    next();
  } catch (error) {
    // TokenExpiredError extends JsonWebTokenError, so check it first
    if (error instanceof jwt.TokenExpiredError) {
      return fail(res, "CSRF_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return fail(res, "CSRF_INVALID");
    }
    next(error);
  }
}
