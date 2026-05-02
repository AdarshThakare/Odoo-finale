import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    RESEND_API_KEY: z.string().optional(),
    AUTH_RESEND_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    APP_URL: z.string().url().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    CLOUDINARY_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    FGA_API_URL: z.string().url().default("http://localhost:8080"),
    FGA_STORE_ID: z.string().optional(),
    FGA_AUTHORIZATION_MODEL_ID: z.string().optional(),
    FGA_CLIENT_ID: z.string().optional(),
    FGA_CLIENT_SECRET: z.string().optional(),
    FGA_API_TOKEN_ISSUER: z.string().optional(),
    FGA_API_AUDIENCE: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    APP_URL: process.env.APP_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    CLOUDINARY_NAME: process.env.CLOUDINARY_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    FGA_API_URL: process.env.FGA_API_URL,
    FGA_STORE_ID: process.env.FGA_STORE_ID,
    FGA_AUTHORIZATION_MODEL_ID: process.env.FGA_AUTHORIZATION_MODEL_ID,
    FGA_CLIENT_ID: process.env.FGA_CLIENT_ID,
    FGA_CLIENT_SECRET: process.env.FGA_CLIENT_SECRET,
    FGA_API_TOKEN_ISSUER: process.env.FGA_API_TOKEN_ISSUER,
    FGA_API_AUDIENCE: process.env.FGA_API_AUDIENCE,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
