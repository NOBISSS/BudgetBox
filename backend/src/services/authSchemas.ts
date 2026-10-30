import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, "Include a lower-case letter")
  .regex(/[A-Z]/, "Include an upper-case letter")
  .regex(/\d/, "Include a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password,
});
export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({
  token: z.string().length(64),
  newPassword: password,
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});
