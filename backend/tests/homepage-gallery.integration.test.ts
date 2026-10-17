import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as publicHomepageGallery } from "../app/api/homepage-gallery/route";
import { GET as publicPortfolio } from "../app/api/portfolio/route";
import { GET as adminHomepageGallery, PUT as saveHomepageGallery } from "../app/api/admin/homepage-gallery/route";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("homepage Gallery configuration with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  let previousSection: Awaited<ReturnType<PrismaClient["homepageGallerySection"]["findUnique"]>> = null;
  const createdEntryIds: string[] = [];
  const emails: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
    previousSection = await prisma.homepageGallerySection.findUnique({ where: { id: "home" } });
  });

  afterAll(async () => {
    if (!prisma) return;
    if (previousSection) {
      await prisma.homepageGallerySection.upsert({
        where: { id: "home" },
        create: {
          id: "home",
          eyebrow: previousSection.eyebrow,
          heading: previousSection.heading,
          isVisible: previousSection.isVisible,
          entryIds: previousSection.entryIds,
        },
        update: {
          eyebrow: previousSection.eyebrow,
          heading: previousSection.heading,
          isVisible: previousSection.isVisible,
          entryIds: previousSection.entryIds,
        },
      });
    } else {
      await prisma.homepageGallerySection.deleteMany({ where: { id: "home" } });
    }
    if (createdEntryIds.length) await prisma.portfolioEntry.deleteMany({ where: { id: { in: createdEntryIds } } });
    if (emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    await prisma.$disconnect();
  });

  async function signInAdmin() {
    const email = `homepage-gallery-${randomUUID()}@example.org`;
    emails.push(email);
    const user = await (await import("../lib/auth")).auth.api.createUser({
      body: { email, name: "Homepage Gallery Test", password: "a-long-test-password-42", role: "admin" },
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

  it("persists selected ordering and exposes selected unpublished images only in the homepage gallery", async () => {
    if (!prisma) throw new Error("Test database is not connected.");
    const first = await prisma.portfolioEntry.create({ data: {
      title: "Homepage gallery integration one", description: "A test gallery record for homepage selection.", imageRef: "/images/gathering-study.svg",
      altText: "A celebration test image", isPublished: true, sortOrder: 900,
    } });
    createdEntryIds.push(first.id);
    const second = await prisma.portfolioEntry.create({ data: {
      title: "Homepage gallery integration two", description: "A second test gallery record for homepage selection.", imageRef: "/images/table-study.svg",
      altText: "A second celebration test image", isPublished: true, sortOrder: 901,
    } });
    createdEntryIds.push(second.id);
    const cookie = await signInAdmin();
    const settings = {
      eyebrow: "Recent moments",
      heading: "Celebrations together",
      isVisible: true,
      entryIds: [second.id, first.id],
    };
    const write = await saveHomepageGallery(new Request(`${origin}/api/admin/homepage-gallery`, {
      method: "PUT",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify(settings),
    }));
    expect(write.status).toBe(200);
    expect((await write.json()).entryIds).toEqual(settings.entryIds);

    const adminRead = await adminHomepageGallery(new Request(`${origin}/api/admin/homepage-gallery`, { headers: { cookie } }));
    expect(adminRead.status).toBe(200);
    expect((await adminRead.json()).entryIds).toEqual(settings.entryIds);
    const publicRead = await publicHomepageGallery();
    expect(publicRead.status).toBe(200);
    expect((await publicRead.json()).entries.map((entry: { id: string }) => entry.id)).toEqual(settings.entryIds);

    await prisma.portfolioEntry.update({ where: { id: first.id }, data: { isPublished: false } });
    const afterUnpublish = await publicHomepageGallery();
    expect((await afterUnpublish.json()).entries.map((entry: { id: string }) => entry.id)).toEqual(settings.entryIds);
    const portfolioRead = await publicPortfolio();
    expect((await portfolioRead.json()).entries.map((entry: { id: string }) => entry.id)).not.toContain(first.id);
    expect(await prisma.portfolioEntry.findUnique({ where: { id: first.id } })).not.toBeNull();
  });
});
