import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { env } from "../config/env.js";
import { requireAuth } from "../middlewares/requiredAuth.js";
import { COOKIE } from "../modules/auth/auth.cookies.js";

// requireAuth is not mounted on a real route yet, so test it on a tiny app
// whose handler echoes what the middleware put on res.locals
const testApp = express();
testApp.use(cookieParser());
testApp.get("/protected", requireAuth, (_req, res) => {
  res.status(200).json({ user: res.locals.user });
});

describe("requireAuth", () => {
  it("should return 401 ACCESS_TOKEN_MISSING when there is no access token cookie", async () => {
    const res = await request(testApp).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCESS_TOKEN_MISSING");
  });

  // These tokens are correctly signed and not expired, so only the payload
  // check can reject them
  it.each([
    ["the payload is a string", jwt.sign("just-a-string", env.access_secret)],
    [
      "payload.id is not a string",
      jwt.sign({ id: 123, role: "USER" }, env.access_secret, {
        expiresIn: "15m",
      }),
    ],
    [
      "payload.role is not USER or ADMIN",
      jwt.sign({ id: "user-1", role: "HACKER" }, env.access_secret, {
        expiresIn: "15m",
      }),
    ],
  ])(
    "should return 401 ACCESS_TOKEN_INVALID when %s",
    async (_description, token) => {
      const res = await request(testApp)
        .get("/protected")
        .set("Cookie", `${COOKIE.access}=${token}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("ACCESS_TOKEN_INVALID");
    },
  );

  it.each([
    ["null", null],
    ["a UUID", "c9ce9724-106f-4740-9591-5267804b8550"],
  ])(
    "should attach the user to res.locals when the token is valid and companyId is %s",
    async (_description, companyId) => {
      const token = jwt.sign(
        { id: "user-1", role: "ADMIN", companyId },
        env.access_secret,
        { expiresIn: "15m" },
      );

      const res = await request(testApp)
        .get("/protected")
        .set("Cookie", `${COOKIE.access}=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({ id: "user-1", role: "ADMIN", companyId });
    },
  );

  it("should return 401 ACCESS_TOKEN_EXPIRED when the token is expired", async () => {
    const token = jwt.sign(
      {
        id: "user-1",
        role: "USER",
        exp: Math.floor(Date.now() / 1000) - 60, // expired a minute ago
      },
      env.access_secret,
    );

    const res = await request(testApp)
      .get("/protected")
      .set("Cookie", `${COOKIE.access}=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCESS_TOKEN_EXPIRED");
  });

  it("should return 401 ACCESS_TOKEN_INVALID when the token is not valid", async () => {
    // a well-formed token signed with a different secret
    const token = jwt.sign(
      { id: "user-1", role: "USER" },
      "some-other-secret",
      {
        expiresIn: "15m",
      },
    );

    const res = await request(testApp)
      .get("/protected")
      .set("Cookie", `${COOKIE.access}=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("ACCESS_TOKEN_INVALID");
  });
});
