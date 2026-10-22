import { Router } from "express";
import { Options, rateLimit } from "express-rate-limit";
import { AuthController } from "./auth.controller.js";

const router = Router();

const authLimiter = (options: Partial<Options> = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    ...options,
  });

router.post("/register", authLimiter(), AuthController.register);
router.post(
  "/login",
  authLimiter({ skipSuccessfulRequests: true }),
  AuthController.login,
);

export { router as AuthRouter };
