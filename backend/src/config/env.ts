import "dotenv/config";
import { z } from "zod";

function isMongoUri(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ["mongodb:", "mongodb+srv:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isRedisUri(value: string): boolean {
  try {
    const parsed = new URL(value);
    return ["redis:", "rediss:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function isLoopback(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return (
    host === "localhost" ||
    host === "::1" ||
    host === "0.0.0.0" ||
    host.startsWith("127.")
  );
}

function hostnameOf(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z
      .string()
      .min(1)
      .refine(isMongoUri, "Use a valid mongodb:// or mongodb+srv:// URI"),
    REDIS_URL: z
      .string()
      .min(1)
      .refine(isRedisUri, "Use a valid redis:// or rediss:// URI"),
    JWT_SECRET: z.string().min(4),
    JWT_EXPIRES_IN: z
      .string()
      .regex(
        /^[1-9]\d*(ms|s|m|h|d|w|y)$/,
        "Use a duration such as 15m, 1d, or 2w",
      )
      .default("1d"),
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
    GOOGLE_CLIENT_ID: z.string().optional().default(""),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
    DEMO_EMAIL: z.string().email().optional(),
    DEMO_PASSWORD: z.string().min(8).optional(),
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

    if (values.NODE_ENV === "production") {
      if (
        values.JWT_SECRET.length < 32 ||
        values.JWT_SECRET.includes("replace-this")
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "Set a unique secret with at least 32 characters",
        });
      }

      try {
        const frontend = new URL(values.FRONTEND_URL);
        if (frontend.protocol !== "https:") {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["FRONTEND_URL"],
            message: "Production frontend origin must use HTTPS",
          });
        }
        if (
          frontend.pathname !== "/" ||
          frontend.search ||
          frontend.hash ||
          values.FRONTEND_URL !== frontend.origin
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["FRONTEND_URL"],
            message:
              "Set FRONTEND_URL to the origin only, with no path or query",
          });
        }
        if (isLoopback(frontend.hostname)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["FRONTEND_URL"],
            message: "Production FRONTEND_URL cannot be localhost",
          });
        }
      } catch {
        // z.string().url() reports malformed frontend origins.
      }

      for (const [key, value] of [
        ["MONGODB_URI", values.MONGODB_URI],
        ["REDIS_URL", values.REDIS_URL],
      ] as const) {
        if (isLoopback(hostnameOf(value))) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: "Production services cannot use a loopback hostname",
          });
        }
      }
    }

    if (values.DEMO_EMAIL && !values.DEMO_PASSWORD) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DEMO_PASSWORD"],
        message: "Set DEMO_PASSWORD when DEMO_EMAIL is configured",
      });
    }
    if (values.DEMO_PASSWORD && !values.DEMO_EMAIL) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DEMO_EMAIL"],
        message: "Set DEMO_EMAIL when DEMO_PASSWORD is configured",
      });
    }

    const googleCredentials = [
      values.GOOGLE_CLIENT_ID,
      values.GOOGLE_CLIENT_SECRET,
    ];
    if (googleCredentials.some(Boolean) && !googleCredentials.every(Boolean)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["GOOGLE_CLIENT_SECRET"],
        message:
          "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together",
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
