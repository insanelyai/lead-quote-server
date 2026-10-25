import request from "supertest";
import { app } from "../app.js";
import { pool } from "../lib/database.js";

// Every test starts from empty tables. CASCADE also clears tables that
// reference users (leads, quotes, ...), which is fine in the test database.
export async function resetDb() {
  await pool.query("TRUNCATE users, session CASCADE");
}

// Acts like a fresh browser tab: it keeps cookies between requests and has
// already fetched an anonymous session + CSRF token, as the UI does on load.
export async function newClient() {
  const agent = request.agent(app);
  const res = await agent.get("/auth/csrf");
  return { agent, csrf: res.body.csrf_token as string };
}

// supertest types set-cookie loosely; it is always an array of header lines
export function cookiesOf(res: request.Response): string[] {
  return (res.headers["set-cookie"] ?? []) as unknown as string[];
}
