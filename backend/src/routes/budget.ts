import { Router } from "express";
import {
  changes,
  history,
  latest,
  sync,
} from "../controllers/budgetController.js";
import { requireAuth } from "../middleware/auth.js";
import { budgetSyncRateLimit } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { budgetSyncSchema } from "../services/budgetSchemas.js";

export const budgetRouter = Router();
budgetRouter.post(
  "/sync",
  requireAuth,
  budgetSyncRateLimit,
  validateBody(budgetSyncSchema),
  sync,
);
budgetRouter.get("/latest", requireAuth, latest);
budgetRouter.get("/history", requireAuth, history);
budgetRouter.get("/changes", requireAuth, changes);
