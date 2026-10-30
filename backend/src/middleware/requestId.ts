import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

export const requestId: RequestHandler = (request, response, next) => {
  const id = request.header("X-Request-Id")?.slice(0, 100) || randomUUID();
  response.setHeader("X-Request-Id", id);
  response.locals.requestId = id;
  next();
};
