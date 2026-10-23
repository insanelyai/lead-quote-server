import { NextFunction, Request, Response } from "express";
import { COOKIE } from "../modules/auth/auth.cookies.js";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { env } from "../config/env.js";

const unauthenticated = (res: Response, code: string, message: string) => {
  res.status(401).json({ status: "failed", code, message });
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const accessCookie = req.cookies?.[COOKIE.access];
    if (!accessCookie)
      return unauthenticated(
        res,
        "ACCESS_TOKEN_MISSING",
        "You are not authenticated",
      );

    const payload = jwt.verify(accessCookie, env.access_secret, {
      algorithms: ["HS256"],
    }) as { id: string; role: "USER" | "ADMIN" };

    if (
      typeof payload === "string" ||
      typeof payload.id !== "string" ||
      (payload.role !== "USER" && payload.role !== "ADMIN")
    ) {
      return res.status(401).json({
        status: "failed",
        code: "ACCESS_TOKEN_INVALID",
        message: "The access token is not valid",
      });
    }
    res.locals.user = { id: payload.id, role: payload.role };
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return unauthenticated(
        res,
        "ACCESS_TOKEN_EXPIRED",
        "The access token is not valid",
      );
    }
    if (error instanceof JsonWebTokenError) {
      return unauthenticated(
        res,
        "ACCESS_TOKEN_INVALID",
        "this access token is not valid",
      );
    }
    next(error);
  }
  next();
}
