import cors from "cors";
import express from "express";
import type { ErrorRequestHandler } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { AuthController } from "./modules/auth/auth.controller.js";
import { AuthRouter } from "./modules/auth/auth.route.js";
import { verifyCsrf } from "./middlewares/csrf.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-TOKEN"],
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));

const csrfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.get("/auth/csrf", csrfLimiter, AuthController.getCsrfToken);
app.use(verifyCsrf);
app.use("/auth", AuthRouter);
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);
