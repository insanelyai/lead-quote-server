import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Signed JWT carrying the session id; this is what the sid cookie holds
export function generateSessionToken(sessionId: string, ttlMs: number) {
  return jwt.sign({ id: sessionId }, env.csrf_secret, {
    expiresIn: Math.floor(ttlMs / 1000),
  });
}
