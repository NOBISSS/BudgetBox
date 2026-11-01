import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export async function connectDatabase(): Promise<void> {
  await mongoose.connect(env.MONGODB_URI, {
    connectTimeoutMS: 10_000,
    serverSelectionTimeoutMS: 15_000,
    maxPoolSize: 30,
    minPoolSize: 0,
  });
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  );
  logger.info("MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function databaseReady(): boolean {
  return mongoose.connection.readyState === 1;
}
