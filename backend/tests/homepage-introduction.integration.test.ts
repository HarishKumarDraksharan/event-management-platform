import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as publicIntroduction } from "../app/api/homepage-introduction/route";
import { GET as adminIntroduction, PUT as updateIntroduction } from "../app/api/admin/homepage-introduction/route";
import type { HomepageIntroductionInput } from "../lib/homepage-introduction";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("homepage introduction with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  let original: HomepageIntroductionInput | undefined;
  let updated = false;
  const emails: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
    const record = await prisma.homepageIntroduction.findUnique({ where: { id: "home" } });
    if (!record) throw new Error("The homepage introduction migration must be applied to the isolated test database before integration tests.");
    original = { eyebrow: record.eyebrow, heading: record.heading, highlight: record.highlight, description: record.description };
  });

  afterAll(async () => {
    if (prisma && original && updated) await prisma.homepageIntroduction.update({ where: { id: "home" }, data: original });
    if (prisma && emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    if (prisma) await prisma.$disconnect();
  });

  async function signIn(role: "admin" | "user") {
    const email = `homepage-intro-${randomUUID()}@example.org`;
    emails.push(email);
    const user = await (await import("../lib/auth")).auth.api.createUser({ body: { email, name: "Homepage Introduction Test", password: "a-long-test-password-42", role } });
    if (!user) throw new Error("Test account creation failed");
    const response = await authPost(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` }, body: JSON.stringify({ email, password: "a-long-test-password-42" }) }));
    expect(response.status).toBe(200);
    const cookieValues = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
    return cookieValues.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
  }

  function request(url: string, method: "GET" | "PUT", cookie = "", body?: unknown, requestOrigin = origin) {
    const headers = new Headers({ cookie });
    if (method === "PUT") {
      headers.set("origin", requestOrigin);
      headers.set("content-type", "application/json");
    }
    return new Request(`${origin}${url}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  }

  it("requires admin authorization and same-origin writes", async () => {
    expect((await adminIntroduction(request("/api/admin/homepage-introduction", "GET"))).status).toBe(401);
    const userCookie = await signIn("user");
    expect((await adminIntroduction(request("/api/admin/homepage-introduction", "GET", userCookie))).status).toBe(403);
    const adminCookie = await signIn("admin");
    expect((await updateIntroduction(request("/api/admin/homepage-introduction", "PUT", adminCookie, original, "https://attacker.example"))).status).toBe(403);
  });

  it("persists validated edits and serves the saved public introduction", async () => {
    const adminCookie = await signIn("admin");
    const content = { ...original!, heading: "A test introduction", highlight: "saved safely.", description: "A test description for the introduction section." };
    const response = await updateIntroduction(request("/api/admin/homepage-introduction", "PUT", adminCookie, content));
    expect(response.status).toBe(200);
    updated = true;
    expect((await response.json()).introduction).toMatchObject(content);
    expect((await (await publicIntroduction()).json()).introduction).toMatchObject(content);
    expect((await updateIntroduction(request("/api/admin/homepage-introduction", "PUT", adminCookie, { ...content, description: "short" }))).status).toBe(400);
  });
});
