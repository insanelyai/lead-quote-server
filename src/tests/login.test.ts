import { cookiesOf, newClient, resetDb } from "./helpers.js";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { pool } from "../lib/database.js";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("POST /auth/login", () => {
  it("should return 401 when the user enters a wrong password", async () => {
    const { agent, csrf } = await newClient();

    const res = await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrf)
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.csrf_token).not.toBe(csrf);

    const cookies = cookiesOf(res);
    const refresh = cookies.find((c) => c.startsWith("r.token"));
    expect(cookies.some((c) => c.startsWith("a.token"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("sid="))).toBe(true);
    expect(refresh).toContain("HttpOnly");
    expect(refresh).toContain("Path=/auth/refresh");

    const login = await newClient();

    const res_login = await login.agent
      .post("/auth/login")
      .set("X-CSRF-Token", login.csrf)
      .send({ email: "test@example.com", password: "password1234" });

    expect(res_login.status).toBe(401);
    expect(res_login.body).toEqual({
      status: "failed",
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });

  it("should return 401 when the user does not exits", async () => {
    const { agent, csrf } = await newClient();

    const res = await agent
      .post("/auth/login")
      .set("X-CSRF-Token", csrf)
      .send({ email: "test@example.com", password: "password1234" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      status: "failed",
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
    });
  });

  it("should return 200 after a success login, delete the anonymous session and create a new session", async () => {
    const { agent, csrf } = await newClient();

    const res = await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrf)
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.csrf_token).not.toBe(csrf);

    const cookies = cookiesOf(res);
    const refresh = cookies.find((c) => c.startsWith("r.token"));
    expect(cookies.some((c) => c.startsWith("a.token"))).toBe(true);
    expect(cookies.some((c) => c.startsWith("sid="))).toBe(true);
    expect(refresh).toContain("HttpOnly");
    expect(refresh).toContain("Path=/auth/refresh");

    const login = await newClient();

    const res_login = await login.agent
      .post("/auth/login")
      .set("X-CSRF-Token", login.csrf)
      .send({ email: "test@example.com", password: "password123" });

    expect(res_login.status).toBe(200);
    expect(res_login.body.user.email).toBe("test@example.com");

    // Payload should not have password AND annonymous token should be deleted
    expect(res_login.body.user).not.toHaveProperty("password");
    expect(res_login.body.csrf_token).not.toBe(login.csrf);

    // Checking the session
    const sessions = await pool.query("SELECT 1 FROM session");
    expect(sessions.rows).toHaveLength(1);

    const cookies_login = cookiesOf(res_login);
    const refresh_login = cookies_login.find((c) => c.startsWith("r.token"));

    expect(cookies_login.some((c) => c.startsWith("a.token"))).toBe(true);
    expect(cookies_login.some((c) => c.startsWith("sid="))).toBe(true);
    expect(refresh_login).toContain("HttpOnly");
    expect(refresh_login).toContain("Path=/auth/refresh");
  });
});
