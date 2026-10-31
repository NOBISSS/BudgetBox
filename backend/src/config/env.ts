import "dotenv/config";
import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: z.string().min(4),
    JWT_EXPIRES_IN: z.string().default("1d"),
    BCRYPT_COST: z.coerce.number().int().min(10).max(14).default(12),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    TRUST_PROXY: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    SMTP_HOST: z.string().optional().default(""),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional().default(""),
    SMTP_PASS: z.string().optional().default(""),
    SMTP_FROM: z.string().default("BudgetBox <no-reply@budgetbox.app>"),
    DEMO_EMAIL: z.string().email().default("demo@budgetbox.app"),
    DEMO_PASSWORD: z.string().min(8).default("Demo@12345"),
  })
  .superRefine((values, context) => {
    const smtpValues = [values.SMTP_HOST, values.SMTP_USER, values.SMTP_PASS];
    const smtpHasAnyValue = smtpValues.some((value) => value.length > 0);
    const smtpIsComplete = smtpValues.every((value) => value.length > 0);
    if (
      (values.NODE_ENV === "production" || smtpHasAnyValue) &&
      !smtpIsComplete
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["SMTP_HOST"],
        message:
          "SMTP_HOST, SMTP_USER, and SMTP_PASS must all be configured together",
      });
    }
  });

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const errors = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${errors}`);
}

export const env = result.data;
