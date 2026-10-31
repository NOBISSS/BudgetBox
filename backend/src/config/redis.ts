import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});
redis.on("error", (error: Error) =>
  logger.warn({ error }, "Redis connection error"),
);

export async function connectRedis(): Promise<void> {
  if (redis.status === "ready") return;
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis.status !== "end") await redis.quit();
}

export function redisReady(): boolean {
  return redis.status === "ready";
}
