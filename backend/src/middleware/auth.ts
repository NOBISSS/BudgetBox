import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";

export const requireAuth: RequestHandler = (_request, _response, next) =>
  next(
    new ApiError(
      501,
      "NOT_IMPLEMENTED",
      "Authentication is not configured yet",
    ),
  );
