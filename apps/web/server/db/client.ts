import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getServerEnv } from "../env/server";
import * as schema from "./schema";

let sqlClient: postgres.Sql | null = null;
let dbClient: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!sqlClient || !dbClient) {
    const env = getServerEnv();
    sqlClient = postgres(env.DATABASE_URL, {
      max: 10,
      prepare: false,
    });
    dbClient = drizzle(sqlClient, { schema });
  }

  return dbClient;
}
