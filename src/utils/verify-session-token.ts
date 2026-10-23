import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function verifySessionToken(token: string): string {
  const payload = jwt.verify(token, env.csrf_secret, {
    algorithms: ["HS256"],
  });
  if (typeof payload === "string" || typeof payload.id !== "string") {
    throw new jwt.JsonWebTokenError("Invalid session payload");
  }
  return payload.id;
}
