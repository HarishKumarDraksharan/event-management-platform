import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as publicAboutUs } from "../app/api/about-us/route";
import { GET as adminAboutUs, PUT as updateAboutUs } from "../app/api/admin/about-us/route";
import type { AboutUsInput } from "../lib/about-us";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("About Us management with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  let original: AboutUsInput | undefined;
  let updated = false;
  const emails: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
    const record = await prisma.aboutUsSection.findUnique({ where: { id: "home" } });
    if (!record) throw new Error("The About Us section migration must be applied to the isolated test database before integration tests.");
    original = {
      eyebrow: record.eyebrow,
      heading: record.heading,
      firstParagraph: record.firstParagraph,
      secondParagraph: record.secondParagraph,
      imageUrl: record.imageUrl,
      imageCaption: record.imageCaption,
      buttonLabel: record.buttonLabel,
      destinationUrl: record.destinationUrl,
      isVisible: record.isVisible,
    };
  });

  afterAll(async () => {
    if (prisma && original && updated) await prisma.aboutUsSection.update({ where: { id: "home" }, data: original });
    if (prisma && emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    if (prisma) await prisma.$disconnect();
  });

  async function signIn(role: "admin" | "user") {
    const email = `about-us-${randomUUID()}@example.org`;
    emails.push(email);
    const user = await (await import("../lib/auth")).auth.api.createUser({ body: { email, name: "About Us Test", password: "a-long-test-password-42", role } });
    if (!user) throw new Error("Test account creation failed");
    const response = await authPost(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` }, body: JSON.stringify({ email, password: "a-long-test-password-42" }) }));
    expect(response.status).toBe(200);
    const cookieValues = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
    return cookieValues.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
  }

  function request(method: "GET" | "PUT", cookie = "", body?: unknown, requestOrigin = origin) {
    const headers = new Headers({ cookie });
    if (method === "PUT") {
      headers.set("origin", requestOrigin);
      headers.set("content-type", "application/json");
    }
    return new Request(`${origin}/api/admin/about-us`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }

  it("requires administrator authorization and a same-origin write", async () => {
    expect((await adminAboutUs(request("GET"))).status).toBe(401);
    const userCookie = await signIn("user");
    expect((await adminAboutUs(request("GET", userCookie))).status).toBe(403);
    const adminCookie = await signIn("admin");
    expect((await updateAboutUs(request("PUT", adminCookie, original, "https://attacker.example"))).status).toBe(403);
  });

  it("validates edits, persists them, and serves the saved public content", async () => {
    const adminCookie = await signIn("admin");
    const content = {
      ...original!,
      eyebrow: "Our Chennai story",
      heading: "Thoughtful events across Chennai",
      firstParagraph: "We plan memorable events for families, couples, and businesses throughout Chennai.",
      secondParagraph: "Our team brings the venue, staging, lighting, catering, and logistics together.",
      imageUrl: "/images/table-study.svg",
      imageCaption: "A saved local event image",
      buttonLabel: "Learn about us",
      destinationUrl: "/about",
      isVisible: false,
    };
    const response = await updateAboutUs(request("PUT", adminCookie, content));
    expect(response.status).toBe(200);
    updated = true;
    expect((await response.json()).aboutUs).toMatchObject(content);
    expect((await (await publicAboutUs()).json()).aboutUs).toMatchObject(content);
    expect((await updateAboutUs(request("PUT", adminCookie, { ...content, destinationUrl: "javascript:alert(1)" }))).status).toBe(400);
    expect((await prisma!.aboutUsSection.findUnique({ where: { id: "home" } }))?.heading).toBe(content.heading);
  });
});
