import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import { onboardingRequired } from "../middlewares/onboardingRequired.js";
import { requiredAdmin } from "../middlewares/requiredAdmin.js";
import { requireAuth } from "../middlewares/requiredAuth.js";
import { COOKIE } from "../modules/auth/auth.cookies.js";

// The invite route will use this chain, but it does not exist yet, so test the
// chain itself on a tiny app with real signed tokens
const testApp = express();
testApp.use(cookieParser());
testApp.get(
  "/guarded",
  requireAuth,
  onboardingRequired,
  requiredAdmin,
  (_req, res) => {
    res.sendStatus(200);
  },
);

describe("requireAuth -> onboardingRequired -> requiredAdmin", () => {
  it("should return 401 ACCESS_TOKEN_MISSING when there is no access token", async () => {
    const res = await request(testApp).get("/guarded");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCESS_TOKEN_MISSING");
  });

  // This user is neither onboarded nor an ADMIN, so the code shows which guard
  // runs first
  it("should return 403 ONBOARDING_REQUIRED when the user has no company", async () => {
    const token = jwt.sign(
      { id: "user-1", role: "USER", companyId: null },
      env.access_secret,
      { expiresIn: "15m" },
    );

    const res = await request(testApp)
      .get("/guarded")
      .set("Cookie", `${COOKIE.access}=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ONBOARDING_REQUIRED");
  });

  it("should return 403 ADMIN_ACCESS_REQUIRED when the user has a company but is not an ADMIN", async () => {
    const token = jwt.sign(
      {
        id: "user-1",
        role: "USER",
        companyId: "c9ce9724-106f-4740-9591-5267804b8550",
      },
      env.access_secret,
      { expiresIn: "15m" },
    );

    const res = await request(testApp)
      .get("/guarded")
      .set("Cookie", `${COOKIE.access}=${token}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ADMIN_ACCESS_REQUIRED");
  });

  it("should let an ADMIN with a company through", async () => {
    const token = jwt.sign(
      {
        id: "user-1",
        role: "ADMIN",
        companyId: "c9ce9724-106f-4740-9591-5267804b8550",
      },
      env.access_secret,
      { expiresIn: "15m" },
    );

    const res = await request(testApp)
      .get("/guarded")
      .set("Cookie", `${COOKIE.access}=${token}`);

    expect(res.status).toBe(200);
  });
});
