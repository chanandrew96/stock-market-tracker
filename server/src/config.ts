import { config as loadEnv } from "dotenv";
import { z } from "zod";
import path from "path";

loadEnv();

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().optional(),
  POLL_INTERVAL_MS: z.coerce.number().default(60_000),
  DATABASE_PATH: z
    .string()
    .default(path.join(process.cwd(), "..", "data", "stock-tracker.db")),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

export const appConfig: AppConfig = ConfigSchema.parse({
  PORT: process.env.PORT,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
  POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
  DATABASE_PATH: process.env.DATABASE_PATH,
});

