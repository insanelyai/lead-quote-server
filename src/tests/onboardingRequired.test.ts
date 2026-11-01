import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { onboardingRequired } from "../middlewares/onboardingRequired.js";

// The guard only reads res.locals.user, so this tiny app sets it from a header
// instead of going through requireAuth
const testApp = express();
testApp.get(
  "/guarded",
  (req, res, next) => {
    res.locals.user = JSON.parse(req.get("x-test-user") as string);
    next();
  },
  onboardingRequired,
  (_req, res) => {
    res.sendStatus(200);
  },
);

describe("onboardingRequired", () => {
  it("should return 403 ONBOARDING_REQUIRED when companyId is null", async () => {
    const res = await request(testApp)
      .get("/guarded")
      .set(
        "x-test-user",
        JSON.stringify({ id: "user-1", role: "USER", companyId: null }),
      );

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ONBOARDING_REQUIRED");
  });

  it("should let the request through when companyId is a UUID", async () => {
    const res = await request(testApp)
      .get("/guarded")
      .set(
        "x-test-user",
        JSON.stringify({
          id: "user-1",
          role: "USER",
          companyId: "c9ce9724-106f-4740-9591-5267804b8550",
        }),
      );

    expect(res.status).toBe(200);
  });
});
