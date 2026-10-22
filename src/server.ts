import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./lib/database.js";
import { logger } from "./lib/logger.js";

const server = app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`);
});

const cleanupExpiredSessions = async () => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM session WHERE expiry < now()",
    );
    if (rowCount) logger.info(`Deleted ${rowCount} expired sessions`);
  } catch (err) {
    logger.error({ err }, "Session cleanup failed");
  }
};
const cleanupTimer = setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
cleanupTimer.unref();

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  clearInterval(cleanupTimer);
  server.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "Error closing database pool");
      process.exit(1);
    }
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
