import { Router } from "express";
import { databaseReady } from "../config/db.js";
import { redisReady } from "../config/redis.js";

export const healthRouter = Router();
healthRouter.get("/", (_request, response) => {
  const mongo = databaseReady();
  const redis = redisReady();
  response.status(mongo && redis ? 200 : 503).json({
    success: true,
    data: {
      status: mongo && redis ? "ok" : "degraded",
      mongo: mongo ? "up" : "down",
      redis: redis ? "up" : "down",
    },
  });
});
