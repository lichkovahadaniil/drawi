import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://drawi:drawi_dev_password@localhost:5432/drawi",
  },
  strict: true,
  verbose: true,
});
