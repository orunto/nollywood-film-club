import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle-sqlite",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
});
