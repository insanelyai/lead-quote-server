import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ACCESS_TTL_MS } from "../config/constants.js";

export function generateAccessToken(
  id: string,
  role: "USER" | "ADMIN",
  companyId: string | null,
) {
  return jwt.sign(
    { id: id, role: role, companyId: companyId ?? null },
    env.access_secret,
    {
      expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
    },
  );
}
