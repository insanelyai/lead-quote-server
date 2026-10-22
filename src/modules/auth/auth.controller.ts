import z from "zod";
import { NextFunction, Request, Response } from "express";
import { ANON_SESSION_TTL_MS } from "../../config/constants.js";
import { AuthServices } from "./auth.services.js";
import { EmailTakenError, InvalidCredentialsError } from "./auth.errors.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import {
  clearTokenCookies,
  setAuthCookies,
  setSessionCookie,
} from "./auth.cookies.js";

const AuthController = {
  getCsrfToken: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { csrfToken, sessionToken } = await AuthServices.getCsrfToken();

      setSessionCookie(res, sessionToken, ANON_SESSION_TTL_MS);
      res.set("Cache-Control", "no-store");
      res.status(201).json({ csrf_token: csrfToken });
    } catch (error) {
      next(error);
    }
  },
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = registerSchema.safeParse(req.body);

      if (parsedBody.error) {
        return res.status(400).json({
          code: "BAD_REQUEST",
          message: z.prettifyError(parsedBody.error),
          status: "failed",
        });
      }

      const result = await AuthServices.register({
        ...parsedBody.data,
        email: parsedBody.data.email.toLowerCase(),
        tempSessionId: res.locals.sessionId,
      });

      setAuthCookies(res, result);

      res.set("Cache-Control", "no-store");
      res.status(201).json({ user: result.user, csrf_token: result.csrfToken });
    } catch (error) {
      if (error instanceof EmailTakenError) {
        return res.status(409).json({
          status: "failed",
          code: "EMAIL_TAKEN",
          message: error.message,
        });
      }
      next(error);
    }
  },
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = loginSchema.safeParse(req.body);

      if (parsedBody.error) {
        return res.status(400).json({
          code: "BAD_REQUEST",
          message: z.prettifyError(parsedBody.error),
          status: "failed",
        });
      }

      const result = await AuthServices.login({
        ...parsedBody.data,
        email: parsedBody.data.email.toLowerCase(),
        tempSessionId: res.locals.sessionId,
      });

      setAuthCookies(res, result);

      res.set("Cache-Control", "no-store");
      res.status(200).json({ user: result.user, csrf_token: result.csrfToken });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return res.status(401).json({
          status: "failed",
          code: "INVALID_CREDENTIALS",
          message: error.message,
        });
      }
      next(error);
    }
  },
  logout: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { csrfToken, sessionToken } = await AuthServices.logout({
        sessionId: res.locals.sessionId,
      });

      clearTokenCookies(res);
      setSessionCookie(res, sessionToken, ANON_SESSION_TTL_MS);
      res.set("Cache-Control", "no-store");
      res.status(200).json({ csrf_token: csrfToken });
    } catch (error) {
      next(error);
    }
  },
};

export { AuthController };
