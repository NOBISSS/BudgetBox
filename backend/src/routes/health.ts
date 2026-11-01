import { Router } from "express";
import { databaseReady } from "../config/db.js";
import { redisReady } from "../config/redis.js";

export const healthRouter = Router();
healthRouter.get("/", (_request, response) => {
  const mongo = databaseReady();
  const redis = redisReady();
  if (!mongo || !redis) {
    response.status(503).json({
      success: false,
      error: {
        code: "DEPENDENCY_UNAVAILABLE",
        message: "One or more service dependencies are unavailable",
        details: { mongo: mongo ? "up" : "down", redis: redis ? "up" : "down" },
      },
    });
    return;
  }
  response
    .status(200)
    .json({ success: true, data: { status: "ok", mongo: "up", redis: "up" } });
});
