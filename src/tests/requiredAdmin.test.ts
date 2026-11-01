import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { requiredAdmin } from "../middlewares/requiredAdmin.js";

// The guard only reads res.locals.user, so this tiny app sets it from a header
// instead of going through requireAuth
const testApp = express();
testApp.get(
  "/guarded",
  (req, res, next) => {
    res.locals.user = JSON.parse(req.get("x-test-user") as string);
    next();
  },
  requiredAdmin,
  (_req, res) => {
    res.sendStatus(200);
  },
);

describe("requiredAdmin", () => {
  it("should return 403 ADMIN_ACCESS_REQUIRED when the role is USER", async () => {
    const res = await request(testApp)
      .get("/guarded")
      .set("x-test-user", JSON.stringify({ id: "user-1", role: "USER" }));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ADMIN_ACCESS_REQUIRED");
  });

  it("should let the request through when the role is ADMIN", async () => {
    const res = await request(testApp)
      .get("/guarded")
      .set("x-test-user", JSON.stringify({ id: "user-1", role: "ADMIN" }));

    expect(res.status).toBe(200);
  });
});
