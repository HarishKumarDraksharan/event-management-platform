import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createEnquiryHandler } from "../lib/enquiries";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;

describe("POST /api/enquiries with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  beforeAll(() => { prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) }); });
  afterAll(async () => { if (prisma) await prisma.$disconnect(); });

  it("persists an enquiry and makes a retried idempotency key safe", async () => {
    const database = prisma;
    if (!database) throw new Error("TEST_DATABASE_URL must be set for this test");
    const submissionKey = randomUUID();
    const handler = createEnquiryHandler((key, enquiry) => database.enquiry.upsert({
      where: { submissionKey: key }, update: {}, create: { submissionKey: key, ...enquiry },
    }));
    const body = {
      name: "Integration Test",
      email: "test@example.org",
      phone: null,
      eventType: "Private celebration",
      eventDate: "2027-06-10",
      guestCount: "24",
      message: "A test enquiry confirms PostgreSQL persistence and retry handling.",
    };
    const makeRequest = () => new Request("http://localhost/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": submissionKey },
      body: JSON.stringify(body),
    });
    try {
      const firstResponse = await handler(makeRequest());
      const retryResponse = await handler(makeRequest());
      expect(firstResponse.status).toBe(201);
      expect(retryResponse.status).toBe(201);
      expect(await database.enquiry.count({ where: { submissionKey } })).toBe(1);
      expect(await database.enquiry.findUnique({ where: { submissionKey } })).toMatchObject({
        name: "Integration Test", email: "test@example.org", eventType: "Private celebration", guestCount: 24,
      });
    } finally {
      await database.enquiry.deleteMany({ where: { submissionKey } });
    }
  });
});
