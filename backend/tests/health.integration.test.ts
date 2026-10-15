import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHealthHandler } from "../lib/health";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("GET /api/health with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(() => {
    if (!testDatabaseUrl) return;
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it("reports connected when Prisma can query PostgreSQL", async () => {
    const database = prisma;
    if (!database) throw new Error("TEST_DATABASE_URL must be set for the integration test");
    const response = await createHealthHandler(() => database.$queryRaw`SELECT 1`)();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "connected" });
  });
});
