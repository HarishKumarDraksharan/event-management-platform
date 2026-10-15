import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function datasourceUrl() {
  if (process.env.NODE_ENV !== "test") return env("DATABASE_URL");
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required when running Prisma with NODE_ENV=test.");
  try {
    if (decodeURIComponent(new URL(testUrl).pathname.slice(1)) !== "event_management_test") throw new Error();
  } catch {
    throw new Error("Prisma tests and migrations are restricted to the isolated event_management_test database.");
  }
  return testUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: datasourceUrl() },
});
