import { NextFunction, Request, Response } from "express";
import { unauthenticated } from "./requiredAuth.js";

export async function requiredAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = res.locals.user;
    if (!user) {
      return unauthenticated(
        res,
        "MISSING_USER_LOCAL",
        "User details are missing",
      );
    }

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        status: "failed",
        code: "ADMIN_ACCESS_REQUIRED",
        message: "You do not have the privileges for this operation",
      });
    }
  } catch (error) {
    return next(error);
  }
  next();
}
