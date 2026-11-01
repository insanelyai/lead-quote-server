import jwt from "jsonwebtoken";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import { pool } from "../lib/database.js";
import { cookiesOf, newClient, resetDb } from "./helpers.js";

beforeEach(resetDb);
afterAll(() => pool.end());

describe("POST /company/onboarding", () => {
  let client: Awaited<ReturnType<typeof newClient>>;
  let csrf: string; // CSRF token of the logged-in session

  const company = {
    name: "Acme",
    email: "contact@acme.com",
    address: "1 Main St",
  };

  // Every test starts with a registered user who has no company yet
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
  });

  it("should return 401 ACCESS_TOKEN_MISSING when the user is not logged in", async () => {
    // a visitor with an anonymous session never receives an a.token cookie
    const visitor = await newClient();

    const res = await visitor.agent
      .post("/company/onboarding")
      .set("X-CSRF-Token", visitor.csrf)
      .send(company);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCESS_TOKEN_MISSING");
  });

  it("should return 400 BAD_REQUEST when the address is blank", async () => {
    const res = await client.agent
      .post("/company/onboarding")
      .set("X-CSRF-Token", csrf)
      .send({ ...company, address: "   " });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("BAD_REQUEST");
  });

  it("should create the company, make the user its ADMIN and return 201", async () => {
    const res = await client.agent
      .post("/company/onboarding")
      .set("X-CSRF-Token", csrf)
      .send(company);

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("ADMIN");

    const companies = await pool.query(
      "SELECT id, name, email, address FROM companies",
    );
    expect(companies.rows).toEqual([{ id: res.body.companyId, ...company }]);

    const users = await pool.query("SELECT role, company_id FROM users");
    expect(users.rows).toEqual([
      { role: "ADMIN", company_id: res.body.companyId },
    ]);
  });

  it("should set a new access token with the ADMIN role and the companyId", async () => {
    const res = await client.agent
      .post("/company/onboarding")
      .set("X-CSRF-Token", csrf)
      .send(company);

    expect(res.status).toBe(201);

    const access = cookiesOf(res).find((c) => c.startsWith("a.token="));
    expect(access).toBeDefined();
    const token = access!.split(";")[0].split("=")[1];

    const { rows } = await pool.query("SELECT id FROM companies");
    expect(jwt.verify(token, env.access_secret)).toMatchObject({
      role: "ADMIN",
      companyId: rows[0].id,
    });
  });

  it("should return 409 ALREADY_ONBOARDED and create no second company when the user already has one", async () => {
    const first = await client.agent
      .post("/company/onboarding")
      .set("X-CSRF-Token", csrf)
      .send(company);
    expect(first.status).toBe(201);

    const second = await client.agent
      .post("/company/onboarding")
      .set("X-CSRF-Token", csrf)
      .send(company);

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_ONBOARDED");

    const companies = await pool.query("SELECT 1 FROM companies");
    expect(companies.rows).toHaveLength(1);
  });
});
