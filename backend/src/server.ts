import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  await connectDatabase();
  await connectRedis();
  const server = createServer(createApp());
  server.listen(env.PORT, () =>
    logger.info({ port: env.PORT }, "BudgetBox API listening"),
  );
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => {
      void Promise.all([disconnectDatabase(), disconnectRedis()]).then(() =>
        process.exit(0),
      );
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

void main().catch((error: unknown) => {
  logger.fatal({ error }, "Server startup failed");
  process.exit(1);
});
