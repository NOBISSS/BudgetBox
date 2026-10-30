import { Router } from "express";
import {
  change,
  forgotPassword,
  login,
  logout,
  me,
  register,
  reset,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../services/authSchemas.js";

export const authRouter = Router();
authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/login", validateBody(loginSchema), login);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", requireAuth, logout);
authRouter.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  forgotPassword,
);
authRouter.post("/reset-password", validateBody(resetPasswordSchema), reset);
authRouter.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  change,
);
