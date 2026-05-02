import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    FGA_API_URL: z.string().url().default("http://localhost:8080"),
    FGA_STORE_ID: z.string().optional(),
    FGA_AUTHORIZATION_MODEL_ID: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    FGA_API_URL: process.env.FGA_API_URL,
    FGA_STORE_ID: process.env.FGA_STORE_ID,
    FGA_AUTHORIZATION_MODEL_ID: process.env.FGA_AUTHORIZATION_MODEL_ID,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
