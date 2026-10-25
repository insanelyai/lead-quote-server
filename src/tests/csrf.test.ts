import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../app.js";

describe("CSRF protection", () => {
  it("rejects a POST without a CSRF token", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "example@gmail.com", passowrd: "wahtever" });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CSRF_MISSING");
  });
});
