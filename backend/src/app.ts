import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createRequire } from "node:module";
const pinoHttp: typeof import("pino-http").default = createRequire(
  import.meta.url,
)("pino-http") as typeof import("pino-http").default;
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { requestId } from "./middleware/requestId.js";
import { globalRateLimit } from "./middleware/rateLimit.js";
import { authRouter } from "./routes/auth.js";
import { budgetRouter } from "./routes/budget.js";
import { healthRouter } from "./routes/health.js";
import { logger } from "./utils/logger.js";

export function createApp() {
  const app = express();
  if (env.TRUST_PROXY) app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      exposedHeaders: [
        "Retry-After",
        "X-Cache",
        "RateLimit-Limit",
        "RateLimit-Remaining",
      ],
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use(requestId);
  app.use(pinoHttp({ logger }));
  app.use(globalRateLimit);
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/budget", budgetRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
