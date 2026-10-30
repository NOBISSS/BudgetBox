import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {
  clearFailedLogins,
  recordFailedLogin,
} from "../middleware/rateLimit.js";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
} from "../services/authService.js";

export const register: RequestHandler = asyncHandler(
  async (request, response) => {
    const result = await registerUser(
      request.body.name,
      request.body.email,
      request.body.password,
    );
    response.status(201).json({ success: true, data: result });
  },
);

export const login: RequestHandler = asyncHandler(async (request, response) => {
  const email = String(request.body.email);
  let result;
  try {
    result = await loginUser(email, request.body.password);
  } catch (error) {
    if (error instanceof ApiError && error.code === "INVALID_CREDENTIALS") {
      const limited = await recordFailedLogin(
        email,
        request.ip || "unknown",
        response,
      );
      if (limited) return;
    }
    throw error;
  }
  await clearFailedLogins(email, request.ip || "unknown");
  response.json({ success: true, data: result });
});

export const me: RequestHandler = asyncHandler(async (request, response) => {
  if (!request.user)
    throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
  response.json({
    success: true,
    data: { user: await getCurrentUser(request.user.id) },
  });
});

export const logout: RequestHandler = asyncHandler(
  async (request, response) => {
    if (!request.user)
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
    await logoutUser(request.user.jti, request.user.expiresAt);
    response.json({
      success: true,
      data: { message: "Signed out successfully" },
    });
  },
);

export const forgotPassword: RequestHandler = asyncHandler(
  async (request, response) => {
    await requestPasswordReset(request.body.email);
    response.json({
      success: true,
      data: {
        message:
          "If an account exists for this email, a reset link has been sent.",
      },
    });
  },
);

export const reset: RequestHandler = asyncHandler(async (request, response) => {
  await resetPassword(request.body.token, request.body.newPassword);
  response.json({
    success: true,
    data: { message: "Password updated successfully" },
  });
});

export const change: RequestHandler = asyncHandler(
  async (request, response) => {
    if (!request.user)
      throw new ApiError(401, "UNAUTHORIZED", "Authentication is required");
    await changePassword(
      request.user.id,
      request.body.currentPassword,
      request.body.newPassword,
    );
    response.json({
      success: true,
      data: { message: "Password updated successfully" },
    });
  },
);
