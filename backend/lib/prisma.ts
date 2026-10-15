import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatabaseUrl() {
  if (process.env.NODE_ENV !== "test") return process.env.DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required when NODE_ENV=test.");

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(testUrl).pathname.slice(1));
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  if (databaseName !== "event_management_test") {
    throw new Error("Tests may connect only to the isolated event_management_test database.");
  }
  return testUrl;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: getDatabaseUrl() });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
