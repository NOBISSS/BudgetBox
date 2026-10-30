import { randomBytes, randomUUID, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { UserModel } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../utils/logger.js";

const dummyHash = bcrypt.hash("BudgetBoxDummyPassword!1", env.BCRYPT_COST);
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const publicUser = (user: { _id: unknown; name: string; email: string }) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
});

function assertPassword(password: string): void {
  if (!passwordPattern.test(password)) {
    throw new ApiError(
      400,
      "WEAK_PASSWORD",
      "Password must be at least 8 characters and include upper-case, lower-case, and numeric characters",
    );
  }
}

function createToken(userId: string): string {
  const jti = randomUUID();
  return jwt.sign({ jti }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
) {
  assertPassword(password);
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await UserModel.exists({ email: normalizedEmail });
  if (existing)
    throw new ApiError(
      409,
      "EMAIL_IN_USE",
      "An account with this email already exists",
    );
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  try {
    const user = await UserModel.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });
    return { user: publicUser(user), token: createToken(String(user._id)) };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new ApiError(
        409,
        "EMAIL_IN_USE",
        "An account with this email already exists",
      );
    }
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  const user = await UserModel.findOne({
    email: email.toLowerCase().trim(),
  }).select("+passwordHash");
  const hash = user?.passwordHash ?? (await dummyHash);
  const matches = await bcrypt.compare(password, hash);
  if (!user || !matches)
    throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  return { user: publicUser(user), token: createToken(String(user._id)) };
}

export async function logoutUser(
  jti: string,
  expiresAt: number,
): Promise<void> {
  const remainingSeconds = Math.max(
    0,
    expiresAt - Math.floor(Date.now() / 1000),
  );
  if (remainingSeconds > 0)
    await redis.set(`jwt:blacklist:${jti}`, "1", "EX", remainingSeconds);
}

export async function getCurrentUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new ApiError(401, "SESSION_EXPIRED", "Please sign in again");
  return publicUser(user);
}

async function sendResetEmail(email: string, token: string): Promise<void> {
  const link = `${env.FRONTEND_URL}/reset-password/${token}`;
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: "Reset your BudgetBox password",
      text: `Use this link within 15 minutes to reset your password: ${link}`,
    });
    return;
  }
  if (env.NODE_ENV !== "production")
    logger.info(
      { email, link },
      "Password reset link (SMTP is not configured)",
    );
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (!user) return;
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  await redis.set(`pwreset:${hash}`, String(user._id), "EX", 900);
  try {
    await sendResetEmail(user.email, token);
  } catch (error) {
    logger.error({ error }, "Password reset email delivery failed");
  }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  assertPassword(newPassword);
  const hash = createHash("sha256").update(token).digest("hex");
  const key = `pwreset:${hash}`;
  const userId = await redis.get(key);
  if (!userId)
    throw new ApiError(
      400,
      "INVALID_RESET_TOKEN",
      "This password reset link is invalid or expired",
    );
  const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_COST);
  const result = await UserModel.updateOne(
    { _id: userId },
    { $set: { passwordHash, passwordChangedAt: new Date() } },
  );
  if (result.matchedCount === 0)
    throw new ApiError(
      400,
      "INVALID_RESET_TOKEN",
      "This password reset link is invalid or expired",
    );
  await redis.del(key);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  assertPassword(newPassword);
  const user = await UserModel.findById(userId).select("+passwordHash");
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new ApiError(
      400,
      "INVALID_CURRENT_PASSWORD",
      "Current password is incorrect",
    );
  }
  user.passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_COST);
  user.passwordChangedAt = new Date();
  await user.save();
}
