import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as publicWhyChooseUs } from "../app/api/homepage-why-choose-us/route";
import { GET as adminWhyChooseUs, PUT as saveWhyChooseUs } from "../app/api/admin/homepage-why-choose-us/route";
import { defaultHomepageWhyChooseUs } from "../lib/homepage-why-choose-us";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("homepage Why Choose Us configuration with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  let previousSection: Awaited<ReturnType<PrismaClient["homepageWhyChooseUsSection"]["findUnique"]>> = null;
  const emails: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
    previousSection = await prisma.homepageWhyChooseUsSection.findUnique({ where: { id: "home" } });
  });

  afterAll(async () => {
    if (!prisma) return;
    if (previousSection) {
      const featureCards = previousSection.featureCards;
      if (featureCards === null) throw new Error("Saved Why Choose Us feature cards cannot be null.");
      await prisma.homepageWhyChooseUsSection.upsert({
        where: { id: "home" },
        create: {
          id: "home",
          heading: previousSection.heading,
          supportingText: previousSection.supportingText,
          isVisible: previousSection.isVisible,
          featureCards,
        },
        update: {
          heading: previousSection.heading,
          supportingText: previousSection.supportingText,
          isVisible: previousSection.isVisible,
          featureCards,
        },
      });
    } else {
      await prisma.homepageWhyChooseUsSection.deleteMany({ where: { id: "home" } });
    }
    if (emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  async function signInAdmin() {
    const email = `homepage-why-choose-us-${randomUUID()}@example.org`;
    emails.push(email);
    const user = await (await import("../lib/auth")).auth.api.createUser({
      body: { email, name: "Homepage Why Choose Us Test", password: "a-long-test-password-42", role: "admin" },
    });
    if (!user) throw new Error("Test administrator creation failed.");
    const response = await authPost(new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", "x-real-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` },
      body: JSON.stringify({ email, password: "a-long-test-password-42" }),
    }));
    expect(response.status).toBe(200);
    return (response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""])
      .map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
  }

  it("persists edits and ordered cards, then exposes them to public and admin reads", async () => {
    if (!prisma) throw new Error("Test database is not connected.");
    const cookie = await signInAdmin();
    const settings = {
      ...defaultHomepageWhyChooseUs,
      heading: "Why this event team",
      isVisible: false,
      featureCards: [...defaultHomepageWhyChooseUs.featureCards].reverse().slice(0, 3),
    };
    const write = await saveWhyChooseUs(new Request(`${origin}/api/admin/homepage-why-choose-us`, {
      method: "PUT",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify(settings),
    }));
    expect(write.status).toBe(200);
    expect((await write.json()).section.featureCards.map((feature: { id: string }) => feature.id)).toEqual(settings.featureCards.map((feature) => feature.id));
    expect(await prisma.homepageWhyChooseUsSection.findUnique({ where: { id: "home" } })).toMatchObject(settings);
    expect((await adminWhyChooseUs(new Request(`${origin}/api/admin/homepage-why-choose-us`, { headers: { cookie } }))).status).toBe(200);
    expect((await (await publicWhyChooseUs()).json()).section).toMatchObject(settings);
  });
});
