import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { newClient, resetDb } from "./helpers.js";
import { app } from "../app.js";
import { pool } from "../lib/database.js";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("GET /auth/session", () => {
  it("should return 401 SESSION_INVALID when there is no session cookie", async () => {
    const sessionRes = await request(app).get("/auth/session");

    expect(sessionRes.status).toBe(401);
    expect(sessionRes.body.code).toBe("SESSION_INVALID");
  });

  it("should return 401 SESSION_INVALID when the session is expired", async () => {
    // GET requests skip verifyCsrf, so the endpoint rejects the session itself
    const { agent } = await newClient();
    await pool.query(
      "UPDATE session SET expiry = now() - interval '1 minute'",
    );

    const sessionRes = await agent.get("/auth/session");

    expect(sessionRes.status).toBe(401);
    expect(sessionRes.body.code).toBe("SESSION_INVALID");
  });

  it("should return 401 SESSION_INVALID when the session is not in the DB", async () => {
    // the sid cookie is a valid signed token, but its session row is gone
    const { agent } = await newClient();
    await pool.query("DELETE FROM session");

    const sessionRes = await agent.get("/auth/session");

    expect(sessionRes.status).toBe(401);
    expect(sessionRes.body.code).toBe("SESSION_INVALID");
  });

  it("should return 200 with the csrf_token and user", async () => {
    const { agent, csrf } = await newClient();

    const registerRes = await agent
      .post("/auth/register")
      .set("X-CSRF-Token", csrf)
      .send({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      });

    const sessionRes = await agent.get("/auth/session");

    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.csrf_token).toBe(registerRes.body.csrf_token);
    expect(sessionRes.body.user.email).toBe("test@example.com");
  });
});
