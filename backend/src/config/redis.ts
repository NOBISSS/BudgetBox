import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  connectTimeout: 10_000,
  commandTimeout: 5_000,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (attempt) => Math.min(250 * attempt, 5_000),
});
redis.on("error", (error: Error) =>
  logger.warn({ error }, "Redis connection error"),
);

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready") return;
  const connection = redis.connect();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      connection,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Redis connection timed out during startup")),
          15_000,
        );
      }),
    ]);
  } catch (error) {
    redis.disconnect();
    throw error;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status === "end") return;
  try {
    await redis.quit();
  } catch (error) {
    logger.warn({ error }, "Redis did not close cleanly; disconnecting socket");
    redis.disconnect();
  }
}

export function redisReady(): boolean {
  return redis.status === "ready";
}
