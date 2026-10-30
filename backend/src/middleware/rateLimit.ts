import type { RequestHandler } from "express";

export const globalRateLimit: RequestHandler = (_request, _response, next) =>
  next();
