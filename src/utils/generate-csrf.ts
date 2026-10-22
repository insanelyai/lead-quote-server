import { createHash, randomBytes } from "node:crypto";

// Generates hashed CSRF token
// Hashing Algorithm: SHA256
// returns hashedCSRF_token as string
export function generateCSRF(): string {
  const csrf = randomBytes(32).toString("hex");
  return createHash("sha256").update(csrf).digest("hex");
}
