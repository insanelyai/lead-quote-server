import { NextFunction, Request, Response } from "express";
import { companyInvite, companyOnboarding } from "./company.schema.js";
import z from "zod";
import { CompanyServices } from "./company.services.js";
import { setAccessCookie } from "../auth/auth.cookies.js";
import { AlreadyOnboarded } from "./company.errors.js";

const CompanyController = {
  company: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedBody = companyOnboarding.safeParse(req.body);
      if (parsedBody.error) {
        return res.status(400).json({
          code: "BAD_REQUEST",
          message: z.prettifyError(parsedBody.error),
          status: "failed",
        });
      }

      const { id, role, companyId, accessToken } =
        await CompanyServices.onboarding({
          ...parsedBody.data,
          cemail: parsedBody.data.email,
          userId: res.locals.user.id as string,
        });

      setAccessCookie(res, { accessToken });
      res.set("Cache-Control", "no-store");
      res.status(201).json({ id, role, companyId });
    } catch (error) {
      if (error instanceof AlreadyOnboarded) {
        return res.status(409).json({
          status: "failed",
          code: "ALREADY_ONBOARDED",
          message: error.message,
        });
      }
      next(error);
    }
  },
  invite: async (req: Request, res: Response, next: NextFunction) => {
    const parsedBody = companyInvite.safeParse(req.body);

    if (parsedBody.error) {
      return res.status(400).json({
        status: "failed",
        code: "BAD_REQUEST",
        message: z.prettifyError(parsedBody.error),
      });

      
    }
  },
};

export { CompanyController };
