import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as publicHomepageServices } from "../app/api/homepage-services/route";
import { GET as adminHomepageServices, PUT as saveHomepageServices } from "../app/api/admin/homepage-services/route";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("homepage services configuration with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  let previousSection: Awaited<ReturnType<PrismaClient["homepageServicesSection"]["findUnique"]>> = null;
  const emails: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
    previousSection = await prisma.homepageServicesSection.findUnique({ where: { id: "home" } });
  });

  afterAll(async () => {
    if (!prisma) return;
    if (previousSection) {
      await prisma.homepageServicesSection.upsert({
        where: { id: "home" },
        create: previousSection,
        update: {
          eyebrow: previousSection.eyebrow,
          heading: previousSection.heading,
          highlight: previousSection.highlight,
          isVisible: previousSection.isVisible,
          serviceIds: previousSection.serviceIds,
        },
      });
    } else {
      await prisma.homepageServicesSection.deleteMany({ where: { id: "home" } });
    }
    if (emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  async function signInAdmin() {
    const email = `homepage-services-${randomUUID()}@example.org`;
    emails.push(email);
    const user = await (await import("../lib/auth")).auth.api.createUser({
      body: { email, name: "Homepage Services Test", password: "a-long-test-password-42", role: "admin" },
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

  it("persists settings and ordered selections, and returns them to public and admin reads", async () => {
    if (!prisma) throw new Error("Test database is not connected.");
    const services = await prisma.service.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 2, select: { id: true } });
    expect(services).toHaveLength(2);
    const selectedIds = services.map((service) => service.id).reverse();
    const cookie = await signInAdmin();
    const settings = {
      eyebrow: "What We Do",
      heading: "Top Event Planning Services in Chennai",
      highlight: "Event Planning Services",
      isVisible: false,
      serviceIds: selectedIds,
    };
    const write = await saveHomepageServices(new Request(`${origin}/api/admin/homepage-services`, {
      method: "PUT",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify(settings),
    }));
    expect(write.status).toBe(200);
    expect((await write.json()).serviceIds).toEqual(selectedIds);

    const adminRead = await adminHomepageServices(new Request(`${origin}/api/admin/homepage-services`, { headers: { cookie } }));
    expect(adminRead.status).toBe(200);
    expect((await adminRead.json()).serviceIds).toEqual(selectedIds);
    const publicRead = await publicHomepageServices();
    expect(publicRead.status).toBe(200);
    expect((await publicRead.json()).section).toMatchObject(settings);
  });
});
