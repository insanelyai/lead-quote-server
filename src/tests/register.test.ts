import { afterAll, beforeEach, expect, it } from "vitest";
import { cookiesOf, newClient, resetDb } from "./helpers.js";
import { pool } from "../lib/database.js";

import { describe } from "vitest";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("POST /auth/register", () => {
  it("creates the user and sets the auth cookies", async () => {
    const { agent, csrf } = await newClient();

    const res = await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrf)
      .send({ email: "Test@Example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.csrf_token).not.toBe(csrf); // as we are creating a new session, the old csrf must be deleted

    const cookies = cookiesOf(res);
    const refresh = cookies.find((c) => c.startsWith("r.token"));
    expect(cookies.some((c) => c.startsWith("a.token"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("sid="))).toBe(true);
    expect(refresh).toContain("HttpOnly");
    expect(refresh).toContain("Path=/auth/refresh");
  });

  it("stores a hashed password and replaces the anonymous sessoin", async () => {
    const { agent, csrf } = await newClient();

    await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrf)
      .send({ email: "Test@Example.com", password: "password123" });

    const users = await pool.query("SELECT password FROM users");
    expect(users.rows).toHaveLength(1);
    expect(users.rows[0].password).not.toBe("password123");

    const sessions = await pool.query("SELECT 1 FROM session");
    expect(sessions.rows).toHaveLength(1);
  });

  it("returns 409 when the email is already taken", async () => {
    const first = await newClient();
    await first.agent
      .post("/auth/register")
      .set("X-CSRF-Token", first.csrf)
      .send({ email: "test@example.com", password: "password123" });

    const second = await newClient();
    const res = await second.agent
      .post("/auth/register")
      .set("X-CSRF-Token", second.csrf)
      .send({ email: "Test@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_TAKEN");
  });

  it("returns 400 for a password that is too short", async () => {
    const { agent, csrf } = await newClient();
    const res = await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrf)
      .send({ email: "test@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });
});
