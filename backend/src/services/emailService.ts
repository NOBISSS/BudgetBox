import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

interface WelcomeEmailInput {
  name: string;
  email: string;
}

let transporter: Transporter | undefined;

function smtpIsConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function getTransporter(): Transporter {
  if (!smtpIsConfigured()) {
    throw new Error("SMTP is not configured");
  }
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
  return transporter;
}

function frontendUrl(path: string): string {
  return `${env.FRONTEND_URL.replace(/\/+$/, "")}${path}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function deliver(
  message: SendMailOptions,
  developmentFallback: { text: string; link?: string },
): Promise<boolean> {
  if (!smtpIsConfigured()) {
    if (env.NODE_ENV === "production") {
      logger.error("SMTP is not configured; email could not be delivered");
      return false;
    }
    logger.info(
      { to: message.to, ...developmentFallback },
      "Email preview (SMTP is not configured)",
    );
    return true;
  }

  try {
    const result = await getTransporter().sendMail(message);
    logger.info(
      { messageId: result.messageId, to: message.to },
      "Email delivered",
    );
    return true;
  } catch (error) {
    logger.error({ error, to: message.to }, "Email delivery failed");
    return false;
  }
}

export function sendWelcomeEmail(user: WelcomeEmailInput): Promise<boolean> {
  const name = user.name.trim();
  const safeName = escapeHtml(name);
  const signInUrl = frontendUrl("/login");
  const text = `Hi ${name},\n\nWelcome to BudgetBox. Your account is ready. You can now plan your budget, save changes on this device, and sync them when you are online.\n\nSign in: ${signInUrl}\n\nThe BudgetBox team`;
  const message: SendMailOptions = {
    from: env.SMTP_FROM,
    to: user.email,
    subject: "Welcome to BudgetBox",
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h1>Welcome to BudgetBox</h1><p>Hi ${safeName},</p><p>Your account is ready. You can now plan your budget, save changes on this device, and sync them when you are online.</p><p><a href="${escapeHtml(signInUrl)}">Sign in to BudgetBox</a></p><p>The BudgetBox team</p></div>`,
  };
  return deliver(message, { text });
}

export function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<boolean> {
  const resetUrl = frontendUrl(`/reset-password/${encodeURIComponent(token)}`);
  const text = `We received a request to reset your BudgetBox password. Use this one-time link within 15 minutes:\n\n${resetUrl}\n\nIf you did not request this change, you can ignore this email.`;
  const message: SendMailOptions = {
    from: env.SMTP_FROM,
    to: email,
    subject: "Reset your BudgetBox password",
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h1>Reset your password</h1><p>We received a request to reset your BudgetBox password.</p><p><a href="${escapeHtml(resetUrl)}">Choose a new password</a></p><p>This one-time link expires in 15 minutes. If you did not request this change, you can ignore this email.</p></div>`,
  };
  return deliver(message, { text, link: resetUrl });
}
