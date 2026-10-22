import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { ACCESS_TTL_MS } from "../config/constants.js";

export function generateAccessToken(id: string, role: "USER" | "ADMIN") {
  return jwt.sign({ id: id, role: role }, env.access_secret, {
    expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
  });
}
