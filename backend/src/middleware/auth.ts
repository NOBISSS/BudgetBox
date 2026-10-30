import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { UserModel } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const requireAuth: RequestHandler = asyncHandler(
  async (request, _response, next) => {
    const authorization = request.header("Authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";
    if (!token)
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");

    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      throw new ApiError(401, "SESSION_EXPIRED", "Please sign in again");
    }
    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      typeof decoded.jti !== "string" ||
      typeof decoded.iat !== "number" ||
      typeof decoded.exp !== "number"
    ) {
      throw new ApiError(401, "INVALID_TOKEN", "Please sign in again");
    }

    if (await redis.exists(`jwt:blacklist:${decoded.jti}`)) {
      throw new ApiError(401, "SESSION_EXPIRED", "Please sign in again");
    }
    const user = await UserModel.findById(decoded.sub).select(
      "passwordChangedAt",
    );
    if (!user)
      throw new ApiError(401, "SESSION_EXPIRED", "Please sign in again");
    if (
      user.passwordChangedAt &&
      user.passwordChangedAt.getTime() > decoded.iat * 1000
    ) {
      throw new ApiError(401, "SESSION_EXPIRED", "Please sign in again");
    }

    request.user = {
      id: String(user._id),
      jti: decoded.jti,
      issuedAt: decoded.iat,
      expiresAt: decoded.exp,
    };
    next();
  },
);
