import { createServer } from "node:http";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

async function listen(port: number): Promise<ReturnType<typeof createServer>> {
  const server = createServer(createApp());
  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 5_000;

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "0.0.0.0");
  });
  return server;
}

async function main(): Promise<void> {
  await connectDatabase();
  await connectRedis();
  const server = await listen(env.PORT);
  logger.info({ port: env.PORT }, "BudgetBox API listening");

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "Graceful shutdown started");
    const forceExit = setTimeout(() => {
      logger.error(
        { signal },
        "Graceful shutdown timed out; closing open connections",
      );
      server.closeAllConnections();
      process.exit(1);
    }, 15_000);
    forceExit.unref();

    server.close((serverError) => {
      void Promise.allSettled([disconnectDatabase(), disconnectRedis()]).then(
        (results) => {
          const failures = results.filter(
            (result) => result.status === "rejected",
          );
          if (serverError)
            logger.error({ error: serverError }, "HTTP server close failed");
          if (failures.length)
            logger.error({ failures }, "A dependency failed to close cleanly");
          clearTimeout(forceExit);
          process.exitCode = serverError || failures.length ? 1 : 0;
          process.exit();
        },
      );
    });
    server.closeIdleConnections();
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

void main().catch((error: unknown) => {
  logger.fatal({ error }, "Server startup failed");
  process.exit(1);
});
