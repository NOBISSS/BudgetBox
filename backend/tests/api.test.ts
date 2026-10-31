import { createHash } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Express } from "express";
import { redis } from "../src/config/redis.js";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

const mailer = vi.hoisted(() => ({ sendMail: vi.fn() }));
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: mailer.sendMail }),
  },
}));

vi.mock("../src/config/redis.js", async () => {
  const RedisMock = (await import("ioredis-mock")).default;
  return {
    redis: new RedisMock(),
    connectRedis: vi.fn(),
    disconnectRedis: vi.fn(),
    redisReady: () => true,
  };
});

let mongo: MongoMemoryServer;
let app: Express;

const password = "StrongPass123";
const sample = (month: number, updatedAt: string, income = 1200) => ({
  month,
  year: 2025,
  income,
  bills: 200,
  food: 100,
  transport: 50,
  subscriptions: 25,
  miscellaneous: 10,
  updatedAt,
});

async function register(email: string) {
  const response = await request(app)
    .post("/api/auth/register")
    .send({ name: "Test User", email, password });
  expect(response.status).toBe(201);
  return response.body.data as { user: { id: string }; token: string };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const module = await import("../src/app.js");
  app = module.createApp();
});

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
  await redis.flushall();
  mailer.sendMail.mockReset();
  mailer.sendMail.mockResolvedValue({ messageId: "test-email-id" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await mongoose.disconnect();
  await redis.quit();
  await mongo?.stop();
});

describe("authentication", () => {
  it("exchanges a Google authorization code and creates a verified account", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "google-access-token" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            sub: "google-subject-1",
            email: "google@example.com",
            email_verified: true,
            name: "Google User",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await request(app)
      .post("/api/auth/google")
      .send({ code: "one-time-google-auth-code", redirectUri: "postmessage" });

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("google@example.com");
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "google@example.com",
        subject: "Welcome to BudgetBox",
      }),
    );
  });

  it("rejects Google profiles without a verified email", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ access_token: "google-access-token" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              sub: "google-subject-2",
              email: "unverified@example.com",
              email_verified: false,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        ),
    );

    const response = await request(app)
      .post("/api/auth/google")
      .send({ code: "one-time-google-auth-code", redirectUri: "postmessage" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("GOOGLE_EMAIL_UNVERIFIED");
  });

  it("registers, logs in, and rejects a blacklisted logout token", async () => {
    const user = await register("auth@example.com");
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "auth@example.com",
        subject: "Welcome to BudgetBox",
        text: expect.stringContaining("Welcome to BudgetBox"),
        html: expect.stringContaining("Welcome to BudgetBox"),
      }),
    );
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "auth@example.com", password });
    expect(login.status).toBe(200);
    const token = login.body.data.token as string;
    expect(
      (await request(app).get("/api/auth/me").set(auth(token))).status,
    ).toBe(200);
    expect(
      (await request(app).post("/api/auth/logout").set(auth(token))).status,
    ).toBe(200);
    expect(
      (await request(app).get("/api/auth/me").set(auth(token))).status,
    ).toBe(401);
    expect(user.user.id).toBe(login.body.data.user.id);
  });

  it("sends a generic reset response and accepts a reset token only once", async () => {
    await register("reset@example.com");
    const forgot = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "reset@example.com" });
    expect(forgot.status).toBe(200);
    expect(forgot.body.data.message).toContain("If an account exists");
    const resetMessage = mailer.sendMail.mock.calls.find(
      ([message]) => message.subject === "Reset your BudgetBox password",
    )?.[0];
    const text = String(resetMessage?.text);
    const token = text.match(/reset-password\/([a-f0-9]{64})/)?.[1];
    expect(token).toBeDefined();
    const first = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "UpdatedPass123" });
    expect(first.status).toBe(200);
    const second = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "UpdatedPass123" });
    expect(second.status).toBe(400);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "reset@example.com", password: "UpdatedPass123" });
    expect(login.status).toBe(200);
  });

  it("rate-limits the sixth wrong password attempt with Retry-After", async () => {
    await register("wrong@example.com");
    let response = await request(app);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      response = await request(app)
        .post("/api/auth/login")
        .send({ email: "wrong@example.com", password: "WrongPass123" });
    }
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBeDefined();
    expect(response.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("budget sync and cache", () => {
  it("handles create, newer, stale, idempotent, and concurrent writes", async () => {
    const { token } = await register("sync@example.com");
    const initial = await request(app)
      .post("/api/budget/sync")
      .set(auth(token))
      .send({ records: [sample(1, "2025-01-01T00:00:00.000Z")] });
    expect(initial.body.data.results[0].outcome).toBe("created");

    const newerRecord = sample(1, "2025-01-02T00:00:00.000Z", 1500);
    const newer = await request(app)
      .post("/api/budget/sync")
      .set(auth(token))
      .send({ records: [newerRecord] });
    expect(newer.body.data.results[0].outcome).toBe("updated");

    const stale = await request(app)
      .post("/api/budget/sync")
      .set(auth(token))
      .send({ records: [sample(1, "2025-01-01T12:00:00.000Z", 900)] });
    expect(stale.body.data.results[0].outcome).toBe("conflict_server_wins");

    const retry = await request(app)
      .post("/api/budget/sync")
      .set(auth(token))
      .send({ records: [newerRecord] });
    expect(retry.body.data.results[0].outcome).toBe("unchanged");

    const concurrent = await Promise.all([
      request(app)
        .post("/api/budget/sync")
        .set(auth(token))
        .send({ records: [sample(1, "2025-01-03T00:00:00.000Z", 1700)] }),
      request(app)
        .post("/api/budget/sync")
        .set(auth(token))
        .send({ records: [sample(1, "2025-01-04T00:00:00.000Z", 1900)] }),
    ]);
    expect(concurrent.every((result) => result.status === 200)).toBe(true);
    const final = await request(app).get("/api/budget/latest").set(auth(token));
    expect(final.body.data.income).toBe(1900);
  });

  it("caches latest until a write invalidates it and isolates users", async () => {
    const userA = await register("a@example.com");
    const userB = await register("b@example.com");
    await request(app)
      .post("/api/budget/sync")
      .set(auth(userA.token))
      .send({ records: [sample(2, "2025-02-01T00:00:00.000Z")] });
    expect(
      (await request(app).get("/api/budget/latest").set(auth(userA.token)))
        .headers["x-cache"],
    ).toBe("MISS");
    expect(
      (await request(app).get("/api/budget/latest").set(auth(userA.token)))
        .headers["x-cache"],
    ).toBe("HIT");
    expect(
      (await request(app).get("/api/budget/latest").set(auth(userB.token))).body
        .data,
    ).toBeNull();
    await request(app)
      .post("/api/budget/sync")
      .set(auth(userA.token))
      .send({ records: [sample(2, "2025-02-02T00:00:00.000Z", 1800)] });
    expect(
      (await request(app).get("/api/budget/latest").set(auth(userA.token)))
        .headers["x-cache"],
    ).toBe("MISS");
  });
});
