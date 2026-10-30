import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { logger } from "../utils/logger.js";

async function seed(): Promise<void> {
  await connectDatabase();
  logger.info(
    "Seed script will create its demo user after the data models are added",
  );
  await disconnectDatabase();
}

void seed().catch((error: unknown) => {
  logger.error({ error }, "Seed failed");
  process.exitCode = 1;
});
