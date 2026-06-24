import "server-only";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { getDb } from "../db/client";
import * as schema from "../db/schema";
import { getServerEnv } from "../env/server";

export function getAuth() {
  const env = getServerEnv();
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    trustedOrigins: [env.APP_URL],
  });
}

export async function getServerSession() {
  return getAuth().api.getSession({
    headers: await headers(),
  });
}

export async function getRequiredUser() {
  const session = await getServerSession();
  if (!session?.user?.id) return null;
  return session.user;
}
