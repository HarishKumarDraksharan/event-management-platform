import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as publicSlides } from "../app/api/hero-slides/route";
import { GET as adminSlides, POST as createSlide } from "../app/api/admin/hero-slides/route";
import { PATCH as updateSlide } from "../app/api/admin/hero-slides/[id]/route";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("homepage slide management with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  const emails: string[] = [];
  const slideIds: string[] = [];

  beforeAll(() => { prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) }); });

  afterAll(async () => {
    if (prisma && slideIds.length) await prisma.heroSlide.deleteMany({ where: { id: { in: slideIds } } });
    if (prisma && emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    if (prisma) await prisma.$disconnect();
  });

  async function signIn(role: "admin" | "user") {
    const email = "hero-slides-" + randomUUID() + "@example.org";
    emails.push(email);
    const user = await (await import("../lib/auth")).auth.api.createUser({ body: { email, name: "Hero Slide Test", password: "a-long-test-password-42", role } });
    if (!user) throw new Error("Test account creation failed");
    const response = await authPost(new Request(origin + "/api/auth/sign-in/email", { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": "198.51.100." + (Math.floor(Math.random() * 200) + 1) }, body: JSON.stringify({ email, password: "a-long-test-password-42" }) }));
    expect(response.status).toBe(200);
    const cookieValues = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
    return cookieValues.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
  }

  function jsonRequest(url: string, cookie: string, method: "POST" | "PATCH", body: unknown, requestOrigin = origin) {
    return new Request(origin + url, { method, headers: { origin: requestOrigin, cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  it("protects management APIs and requires same-origin writes", async () => {
    expect((await adminSlides(new Request(origin + "/api/admin/hero-slides"))).status).toBe(401);
    expect((await createSlide(jsonRequest("/api/admin/hero-slides", "", "POST", {}))).status).toBe(401);
    const userCookie = await signIn("user");
    expect((await adminSlides(new Request(origin + "/api/admin/hero-slides", { headers: { cookie: userCookie } }))).status).toBe(403);
    const adminCookie = await signIn("admin");
    expect((await createSlide(jsonRequest("/api/admin/hero-slides", adminCookie, "POST", {}, "https://attacker.example"))).status).toBe(403);
    expect((await createSlide(jsonRequest("/api/admin/hero-slides", adminCookie, "POST", { heading: "Invalid image", description: "This description is long enough.", buttonLabel: "Explore", destinationUrl: "/about", imageRef: "https://example.org/hero.jpg", sortOrder: 10 }))).status).toBe(400);
  });

  it("publishes only configured slides and sorts public results by display order", async () => {
    const cookie = await signIn("admin");
    const common = { description: "A meaningful moment, thoughtfully planned.", buttonLabel: "Explore", destinationUrl: "/contact", imageRef: "/images/gathering-study.svg" };
    const second = await createSlide(jsonRequest("/api/admin/hero-slides", cookie, "POST", { ...common, heading: "Later slide", sortOrder: 15 }));
    const first = await createSlide(jsonRequest("/api/admin/hero-slides", cookie, "POST", { ...common, heading: "Earlier slide", sortOrder: 10 }));
    expect([second.status, first.status]).toEqual([201, 201]);
    const secondSlide = (await second.json()).slide;
    const firstSlide = (await first.json()).slide;
    slideIds.push(secondSlide.id, firstSlide.id);

    const drafts = await publicSlides();
    expect((await drafts.json()).slides.some((slide: { id: string }) => slide.id === firstSlide.id || slide.id === secondSlide.id)).toBe(false);
    const publishedSecond = await updateSlide(jsonRequest("/api/admin/hero-slides/" + secondSlide.id, cookie, "PATCH", { isPublished: true }), { params: Promise.resolve({ id: secondSlide.id }) });
    const publishedFirst = await updateSlide(jsonRequest("/api/admin/hero-slides/" + firstSlide.id, cookie, "PATCH", { isPublished: true }), { params: Promise.resolve({ id: firstSlide.id }) });
    expect([publishedSecond.status, publishedFirst.status]).toEqual([200, 200]);

    const visible = (await (await publicSlides()).json()).slides as Array<{ id: string; sortOrder: number }>;
    const firstIndex = visible.findIndex((slide) => slide.id === firstSlide.id);
    const secondIndex = visible.findIndex((slide) => slide.id === secondSlide.id);
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);

    const unpublished = await updateSlide(jsonRequest("/api/admin/hero-slides/" + firstSlide.id, cookie, "PATCH", { isPublished: false, sortOrder: 20 }), { params: Promise.resolve({ id: firstSlide.id }) });
    expect(unpublished.status).toBe(200);
    const remaining = (await (await publicSlides()).json()).slides as Array<{ id: string }>;
    expect(remaining.some((slide) => slide.id === firstSlide.id)).toBe(false);
    expect(remaining.some((slide) => slide.id === secondSlide.id)).toBe(true);

    const adminList = (await (await adminSlides(new Request(origin + "/api/admin/hero-slides", { headers: { cookie } }))).json()).slides as Array<{ id: string }>;
    expect(adminList.some((slide) => slide.id === firstSlide.id)).toBe(true);
  });
});
