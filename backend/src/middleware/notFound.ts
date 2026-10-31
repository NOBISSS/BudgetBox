import type { RequestHandler } from "express";
import { ApiError } from "../utils/ApiError.js";

export const notFound: RequestHandler = (request, _response, next) =>
  next(
    new ApiError(
      404,
      "NOT_FOUND",
      `Route not found: ${request.method} ${request.path}`,
    ),
  );
