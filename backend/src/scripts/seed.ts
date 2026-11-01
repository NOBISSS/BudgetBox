import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { BudgetModel } from "../models/Budget.js";
import { UserModel } from "../models/User.js";
import { logger } from "../utils/logger.js";

const developmentDemo = {
  email: "demo@budgetbox.app",
  password: "Demo@12345",
};

async function seed(): Promise<void> {
  if (
    env.NODE_ENV === "production" &&
    (!env.DEMO_EMAIL || !env.DEMO_PASSWORD)
  ) {
    throw new Error(
      "Production seeding requires explicit DEMO_EMAIL and DEMO_PASSWORD values",
    );
  }

  const email = (env.DEMO_EMAIL ?? developmentDemo.email).trim().toLowerCase();
  const password = env.DEMO_PASSWORD ?? developmentDemo.password;
  if (env.NODE_ENV === "production" && password.length < 12) {
    throw new Error("Production DEMO_PASSWORD must be at least 12 characters");
  }

  try {
    await connectDatabase();
    let user = await UserModel.findOne({ email });
    if (!user) {
      user = await UserModel.create({
        name: "BudgetBox Demo",
        email,
        passwordHash: await bcrypt.hash(password, env.BCRYPT_COST),
      });
      logger.info({ email }, "Demo user created");
    } else {
      logger.info(
        { email },
        "Demo user already exists; leaving credentials unchanged",
      );
    }

    const now = new Date();
    for (let offset = 2; offset >= 0; offset -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const month = monthDate.getMonth() + 1;
      const year = monthDate.getFullYear();
      await BudgetModel.updateOne(
        { userId: user._id, month, year },
        {
          $setOnInsert: {
            userId: user._id,
            month,
            year,
            income: 72_000,
            bills: 18_000,
            food: 9_500 + offset * 250,
            transport: 3_200,
            subscriptions: 1_400,
            miscellaneous: 2_800 + offset * 300,
            clientUpdatedAt: new Date(Date.UTC(year, month - 1, 1)),
            serverUpdatedAt: new Date(),
            version: 1,
            isDeleted: false,
            clientRecordId: `${year}-${String(month).padStart(2, "0")}`,
          },
        },
        { upsert: true },
      );
    }
    logger.info({ email, months: 3 }, "Demo budget data is ready");
  } finally {
    await disconnectDatabase();
  }
}

void seed().catch((error: unknown) => {
  logger.error({ error }, "Seed failed");
  process.exitCode = 1;
});
