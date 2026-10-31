import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cookiesOf, newClient, resetDb } from "./helpers.js";
import { pool } from "../lib/database.js";
import { hashToken } from "../utils/hash-token.js";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("POST /auth/refresh", () => {
  let client: Awaited<ReturnType<typeof newClient>>;
  let csrf: string; // CSRF token of the logged-in session
  let sessionId: string;

  // Every test starts with a registered, logged-in user
  beforeEach(async () => {
    client = await newClient();

    const registerRes = await client.agent
      .post("/auth/register")
      .set("X-CSRF-Token", client.csrf)
      .send({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

    csrf = registerRes.body.csrf_token;

    const { rows } = await pool.query("SELECT session_id FROM users");
    sessionId = rows[0].session_id;
  });

  it("should return 401 when there is no refresh token cookie", async () => {
    // a visitor with an anonymous session never receives an r.token cookie
    const visitor = await newClient();

    const refreshRes = await visitor.agent
      .post("/auth/refresh")
      .set("X-CSRF-Token", visitor.csrf);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toBe("Invalid refresh token");
  });

  it("should return 403 CSRF_EXPIRED when the refresh token is expired", async () => {
    // the refresh token lives as long as its session, and verifyCsrf rejects
    // an expired session before the refresh handler runs
    await pool.query(
      "UPDATE session SET expiry = now() - interval '1 minute' WHERE id = $1",
      [sessionId],
    );

    const refreshRes = await client.agent
      .post("/auth/refresh")
      .set("X-CSRF-Token", csrf);

    expect(refreshRes.status).toBe(403);
    expect(refreshRes.body.code).toBe("CSRF_EXPIRED");
  });

  it("should replace the refresh token in the DB, set new cookies and return 204", async () => {
    const refreshRes = await client.agent
      .post("/auth/refresh")
      .set("X-CSRF-Token", csrf);

    expect(refreshRes.status).toBe(204);

    const cookies = cookiesOf(refreshRes);
    const access = cookies.find((c) => c.startsWith("a.token="));
    const refresh = cookies.find((c) => c.startsWith("r.token="));
    expect(access).toBeDefined();
    expect(refresh).toBeDefined();

    // the DB now holds the hash of the refresh token sent in the cookie
    const newRefreshToken = refresh!.split(";")[0].split("=")[1];
    const { rows } = await pool.query(
      "SELECT refresh_token FROM session WHERE id = $1",
      [sessionId],
    );
    expect(rows[0].refresh_token).toBe(hashToken(newRefreshToken));
  });

  it("should return 401 when the refresh token is not in the DB", async () => {
    await pool.query("UPDATE session SET refresh_token = $1 WHERE id = $2", [
      "not-the-hash-of-the-cookie",
      sessionId,
    ]);

    const refreshRes = await client.agent
      .post("/auth/refresh")
      .set("X-CSRF-Token", csrf);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.message).toBe("Invalid refresh token");
  });

  it("should keep the same csrf token", async () => {
    const refreshRes = await client.agent
      .post("/auth/refresh")
      .set("X-CSRF-Token", csrf);
    expect(refreshRes.status).toBe(204);

    const { rows } = await pool.query(
      "SELECT csrf_token FROM session WHERE id = $1",
      [sessionId],
    );
    expect(rows[0].csrf_token).toBe(csrf);
  });

  it("should not change the session expiry", async () => {
    const before = await pool.query(
      "SELECT expiry FROM session WHERE id = $1",
      [sessionId],
    );

    const refreshRes = await client.agent
      .post("/auth/refresh")
      .set("X-CSRF-Token", csrf);
    expect(refreshRes.status).toBe(204);

    const after = await pool.query("SELECT expiry FROM session WHERE id = $1", [
      sessionId,
    ]);
    expect(after.rows[0].expiry).toEqual(before.rows[0].expiry);
  });
});
