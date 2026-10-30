import { createHash } from "node:crypto";
import type { RequestHandler } from "express";
import {
  RateLimiterMemory,
  RateLimiterRedis,
  RateLimiterRes,
} from "rate-limiter-flexible";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

interface LimiterPair {
  redis: RateLimiterRedis;
  insurance: RateLimiterMemory;
  points: number;
}

function createLimiter(
  name: string,
  points: number,
  duration: number,
): LimiterPair {
  const insurance = new RateLimiterMemory({
    points,
    duration,
    blockDuration: duration,
  });
  const redisLimiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: `budgetbox:rate:${name}`,
    points,
    duration,
    blockDuration: duration,
    rejectIfRedisNotReady: true,
    insuranceLimiter: insurance,
  });
  return { redis: redisLimiter, insurance, points };
}

// Policies use budgetbox:rate:<policy>:<hashed-key> Redis buckets: global/IP 200 per 60s,
// register/IP 10 per hour, forgot/IP and forgot/email 3 per hour, failed-login/email+IP
// 5 per 15m, and sync/user 30 per minute. Failed-login buckets are consumed only after
// INVALID_CREDENTIALS; the request gate blocks the next (sixth) attempt for the remainder.
const globalLimiter = createLimiter("global", 200, 60);
const registerLimiter = createLimiter("register", 10, 3600);
const forgotIpLimiter = createLimiter("forgot:ip", 3, 3600);
const forgotEmailLimiter = createLimiter("forgot:email", 3, 3600);
const loginFailureLimiter = createLimiter("login:failed", 5, 900);
const syncLimiter = createLimiter("budget:sync", 30, 60);

function privacyKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function rejectRateLimited(
  response: Parameters<RequestHandler>[1],
  points: number,
  result: RateLimiterRes,
): void {
  const retryAfterSeconds = Math.max(1, Math.ceil(result.msBeforeNext / 1000));
  response.setHeader("Retry-After", String(retryAfterSeconds));
  response.setHeader("RateLimit-Limit", String(points));
  response.setHeader("RateLimit-Remaining", "0");
  response.status(429).json({
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: `Too many attempts. Try again in ${retryAfterSeconds} seconds`,
      retryAfterSeconds,
    },
  });
}

async function currentUsage(
  limiter: LimiterPair,
  key: string,
): Promise<RateLimiterRes | null> {
  try {
    return await limiter.redis.get(key);
  } catch (error) {
    logger.warn(
      { error, limiter: limiter.redis.keyPrefix },
      "Redis rate limit read failed; using in-memory insurance limiter",
    );
    return limiter.insurance.get(key);
  }
}

async function consume(
  limiter: LimiterPair,
  key: string,
): Promise<RateLimiterRes> {
  try {
    return await limiter.redis.consume(key);
  } catch (error) {
    if (error instanceof RateLimiterRes) throw error;
    logger.warn(
      { error, limiter: limiter.redis.keyPrefix },
      "Redis rate limit failed; using in-memory insurance limiter",
    );
    return limiter.insurance.consume(key);
  }
}

function rateLimit(
  limiter: LimiterPair,
  keyFor: (request: Parameters<RequestHandler>[0]) => string,
): RequestHandler {
  return (request, response, next) => {
    void consume(limiter, keyFor(request))
      .then((result) => {
        response.setHeader("RateLimit-Limit", String(limiter.points));
        response.setHeader(
          "RateLimit-Remaining",
          String(Math.max(0, result.remainingPoints)),
        );
        next();
      })
      .catch((error: unknown) => {
        if (error instanceof RateLimiterRes)
          rejectRateLimited(response, limiter.points, error);
        else next(error);
      });
  };
}

// Redis keys use a stable namespace per policy; email values are hashed before being used as key parts.
export const globalRateLimit = rateLimit(
  globalLimiter,
  (request) => request.ip || "unknown",
);
export const registerRateLimit = rateLimit(
  registerLimiter,
  (request) => request.ip || "unknown",
);
export const forgotPasswordIpLimit = rateLimit(
  forgotIpLimiter,
  (request) => request.ip || "unknown",
);
export const forgotPasswordEmailLimit = rateLimit(
  forgotEmailLimiter,
  (request) => privacyKey(String(request.body.email ?? "missing")),
);
export const budgetSyncRateLimit = rateLimit(
  syncLimiter,
  (request) => request.user?.id ?? request.ip ?? "unknown",
);

function loginKey(email: string, ip: string): string {
  return privacyKey(`${email}\u0000${ip}`);
}

export const loginAttemptLimit: RequestHandler = (request, response, next) => {
  const key = loginKey(
    String(request.body.email ?? ""),
    request.ip || "unknown",
  );
  void currentUsage(loginFailureLimiter, key)
    .then((usage) => {
      if (usage && usage.consumedPoints >= loginFailureLimiter.points) {
        rejectRateLimited(response, loginFailureLimiter.points, usage);
        return;
      }
      next();
    })
    .catch(next);
};

export async function recordFailedLogin(
  email: string,
  ip: string,
  response: Parameters<RequestHandler>[1],
): Promise<boolean> {
  try {
    await consume(loginFailureLimiter, loginKey(email, ip));
    return false;
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      rejectRateLimited(response, loginFailureLimiter.points, error);
      return true;
    }
    throw error;
  }
}

export async function clearFailedLogins(
  email: string,
  ip: string,
): Promise<void> {
  const key = loginKey(email, ip);
  try {
    await loginFailureLimiter.redis.delete(key);
  } catch (error) {
    logger.warn(
      { error },
      "Could not clear Redis login failure counter; clearing in-memory insurance counter",
    );
  }
  await loginFailureLimiter.insurance.delete(key);
}
