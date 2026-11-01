import { NextFunction, Request, Response } from "express";
import { unauthenticated } from "./requiredAuth.js";

export async function onboardingRequired(
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

    if (!user.companyId) {
      return res.status(403).json({
        status: "failed",
        code: "ONBOARDING_REQUIRED",
        message: "You have not onboarded with a company",
      });
    }
  } catch (error) {
    return next(error);
  }
  next();
}
