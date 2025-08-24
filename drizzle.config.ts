import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./app/features/**/schema.ts"],
  out: "./app/sql/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.CODINGMENTO_DB_URL!,
  },
});
