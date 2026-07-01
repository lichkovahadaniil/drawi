import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(24),
  BETTER_AUTH_URL: z.url(),
  LIVEKIT_URL: z.string().min(1),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  NEXT_PUBLIC_DRAWI_SYNC_URL: z.url(),
  SYNC_COOKIE_SECRET: z.string().min(24),
  SYNC_WORKER_ORIGIN: z.url().default("http://localhost:8787"),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getServerEnv() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }
  return cachedEnv;
}
