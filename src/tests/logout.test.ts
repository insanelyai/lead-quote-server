import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { cookiesOf, newClient, resetDb } from "./helpers.js";
import { pool } from "../lib/database.js";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("POST /auth/logout", () => {
  let client: Awaited<ReturnType<typeof newClient>>;
  let loggedInCsrf: string;
  let oldSid: string | undefined;
  let oldSessionId: string;

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

    loggedInCsrf = registerRes.body.csrf_token;
    oldSid = cookiesOf(registerRes).find((c) => c.startsWith("sid="));

    const { rows } = await pool.query("SELECT session_id FROM users");
    oldSessionId = rows[0].session_id;
  });

  it("should create a new anonymous csrf token", async () => {
    const logoutRes = await client.agent
      .post("/auth/logout")
      .set("X-CSRF-Token", loggedInCsrf);

    expect(logoutRes.body.csrf_token).not.toBe(loggedInCsrf);

    const { rows } = await pool.query(
      "SELECT refresh_token FROM session WHERE csrf_token = $1",
      [logoutRes.body.csrf_token],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].refresh_token).toBeNull();
  });

  it("should delete the current session", async () => {
    await client.agent.post("/auth/logout").set("X-CSRF-Token", loggedInCsrf);

    const { rows } = await pool.query("SELECT 1 FROM session WHERE id = $1", [
      oldSessionId,
    ]);
    expect(rows).toHaveLength(0);
  });

  it("should override the sid cookie", async () => {
    const logoutRes = await client.agent
      .post("/auth/logout")
      .set("X-CSRF-Token", loggedInCsrf);

    const newSid = cookiesOf(logoutRes).find((c) => c.startsWith("sid="));
    expect(newSid).toBeDefined();
    expect(newSid).not.toBe(oldSid);
  });

  it("should delete the access and refresh cookies", async () => {
    const logoutRes = await client.agent
      .post("/auth/logout")
      .set("X-CSRF-Token", loggedInCsrf);

    const cookies = cookiesOf(logoutRes);
    const access = cookies.find((c) => c.startsWith("a.token="));
    const refresh = cookies.find((c) => c.startsWith("r.token="));

    // a cleared cookie has an empty value and an expiry in the past
    expect(access).toContain("a.token=;");
    expect(access).toContain("Expires=Thu, 01 Jan 1970");
    expect(refresh).toContain("r.token=;");
    expect(refresh).toContain("Expires=Thu, 01 Jan 1970");
  });

  it("should return 200 with the anonymous csrf token", async () => {
    const logoutRes = await client.agent
      .post("/auth/logout")
      .set("X-CSRF-Token", loggedInCsrf);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.csrf_token).toEqual(expect.any(String));
  });
});
