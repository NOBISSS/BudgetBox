import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getBudgetChanges,
  getBudgetHistory,
  getLatestBudget,
  syncBudgets,
} from "../services/budgetService.js";
import {
  budgetChangesQuerySchema,
  budgetHistoryQuerySchema,
} from "../services/budgetSchemas.js";
import { getRecurringExpenseChanges, syncRecurringExpenses } from "../services/recurringExpenseService.js";
import { recurringChangesSchema } from "../services/recurringExpenseSchemas.js";

function authenticatedId(request: Parameters<RequestHandler>[0]): string {
  if (!request.user)
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  return request.user.id;
}

export const sync: RequestHandler = asyncHandler(async (request, response) => {
  const data = await syncBudgets(
    authenticatedId(request),
    request.body.records,
  );
  response.json({ success: true, data });
});

export const latest: RequestHandler = asyncHandler(
  async (request, response) => {
    const result = await getLatestBudget(authenticatedId(request));
    response.setHeader("X-Cache", result.cache);
    response.json({ success: true, data: result.record });
  },
);

export const history: RequestHandler = asyncHandler(
  async (request, response) => {
    const query = budgetHistoryQuerySchema.parse(request.query);
    const result = await getBudgetHistory(authenticatedId(request), query.year);
    response.setHeader("X-Cache", result.cache);
    response.json({ success: true, data: { records: result.records } });
  },
);

export const changes: RequestHandler = asyncHandler(
  async (request, response) => {
    const query = budgetChangesQuerySchema.parse(request.query);
    const records = await getBudgetChanges(
      authenticatedId(request),
      query.since,
    );
    response.json({ success: true, data: { records } });
  },
);

export const syncRecurring: RequestHandler = asyncHandler(async (request, response) => {
  const data = await syncRecurringExpenses(authenticatedId(request), request.body.records);
  response.json({ success: true, data });
});

export const recurringChanges: RequestHandler = asyncHandler(async (request, response) => {
  const query = recurringChangesSchema.parse(request.query);
  const records = await getRecurringExpenseChanges(authenticatedId(request), query.since);
  response.json({ success: true, data: { records } });
});
