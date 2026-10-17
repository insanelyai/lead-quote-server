import pino from "pino";
import { env, isProd } from "../config/env.js";

export const logger = pino({
  level: env.logLevel,
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true } } }),
});
