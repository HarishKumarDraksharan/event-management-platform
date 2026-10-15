import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as adminEnquiries } from "../app/api/admin/enquiries/route";
import { auth } from "../lib/auth";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const execFileAsync = promisify(execFile);

describe("authentication and admin authorization with PostgreSQL", () => {
  const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";
  let prisma: PrismaClient | undefined;
  const createdEmails: string[] = [];

  beforeAll(() => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) });
  });
  afterAll(async () => {
    if (prisma && createdEmails.length) await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    if (prisma) await prisma.$disconnect();
  });

  async function createUser(role: "admin" | "user") {
    const email = `phase4-${randomUUID()}@example.org`;
    createdEmails.push(email);
    const result = await auth.api.createUser({ body: { email, name: "Phase 4 Test", password: "a-long-test-password-42", role } });
    if (!result) throw new Error("Test user creation failed");
    return email;
  }

  async function signIn(email: string, password = "a-long-test-password-42", ipAddress?: string) {
    const clientIp = ipAddress ?? `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    return authPost(new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", "x-real-ip": clientIp },
      body: JSON.stringify({ email, password }),
    }));
  }

  function cookieFrom(response: Response) {
    const values = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
    return values.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
  }

  it("creates a server-managed admin session, authorizes the inbox, and invalidates it on sign-out", async () => {
    const email = await createUser("admin");
    const signInResponse = await signIn(email);
    expect(signInResponse.status).toBe(200);
    const setCookie = signInResponse.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie.toLowerCase()).not.toContain("; secure");
    const cookie = cookieFrom(signInResponse);
    expect(cookie).toContain("better-auth.session_token=");

    const authorized = await adminEnquiries(new Request(`${origin}/api/admin/enquiries?page=1`, { headers: { cookie } }));
    expect(authorized.status).toBe(200);
    const data = await authorized.json();
    expect(data.pageSize).toBe(20);
    expect(Array.isArray(data.enquiries)).toBe(true);

    const signOutResponse = await authPost(new Request(`${origin}/api/auth/sign-out`, {
      method: "POST",
      headers: { origin, cookie, "content-type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(signOutResponse.status).toBe(200);
    const revoked = await adminEnquiries(new Request(`${origin}/api/admin/enquiries`, { headers: { cookie } }));
    expect(revoked.status).toBe(401);
  });

  it("returns the same safe sign-in error for unknown users and invalid passwords", async () => {
    const email = await createUser("admin");
    const unknown = await signIn(`missing-${randomUUID()}@example.org`);
    const invalid = await signIn(email, "incorrect-password-42");
    expect(unknown.status).toBe(invalid.status);
    expect(await unknown.json()).toEqual(await invalid.json());
  });

  it("denies a signed-in customer and ignores any browser supplied admin role", async () => {
    const email = await createUser("user");
    const signedIn = await signIn(email);
    expect(signedIn.status).toBe(200);
    const cookie = cookieFrom(signedIn);
    const response = await adminEnquiries(new Request(`${origin}/api/admin/enquiries?role=admin`, { headers: { cookie } }));
    expect(response.status).toBe(403);
  });

  it("rejects invalid and expired database sessions", async () => {
    const database = prisma;
    if (!database) throw new Error("TEST_DATABASE_URL must be set for this test");
    const invalid = await adminEnquiries(new Request(`${origin}/api/admin/enquiries`, {
      headers: { cookie: "better-auth.session_token=invalid-session-token" },
    }));
    expect(invalid.status).toBe(401);

    const email = await createUser("admin");
    const signedIn = await signIn(email);
    const cookie = cookieFrom(signedIn);
    await database.session.updateMany({ where: { user: { email } }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await adminEnquiries(new Request(`${origin}/api/admin/enquiries`, { headers: { cookie } }));
    expect(expired.status).toBe(401);
  });

  it("limits sign-in attempts by the Nginx supplied client address", async () => {
    const ipAddress = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(await signIn(`unknown-${randomUUID()}@example.org`, "incorrect-password-42", ipAddress));
    }
    expect(responses.slice(0, 5).every((response) => response.status !== 429)).toBe(true);
    expect(responses[5].status).toBe(429);
  });

  it("limits admin enquiry results to twenty rows per page", async () => {
    const database = prisma;
    if (!database) throw new Error("TEST_DATABASE_URL must be set for this test");
    const email = await createUser("admin");
    const signedIn = await signIn(email);
    const cookie = cookieFrom(signedIn);
    const submissionKeys = Array.from({ length: 22 }, () => randomUUID());
    await database.enquiry.createMany({
      data: submissionKeys.map((submissionKey, index) => ({
        submissionKey,
        name: `Pagination test ${index}`,
        email: "phase4-pagination@example.org",
        eventType: "Wedding",
        message: "Temporary fixture used to verify bounded, paginated admin results.",
      })),
    });
    try {
      const first = await adminEnquiries(new Request(`${origin}/api/admin/enquiries?page=1`, { headers: { cookie } }));
      const second = await adminEnquiries(new Request(`${origin}/api/admin/enquiries?page=2`, { headers: { cookie } }));
      const firstPage = await first.json();
      const secondPage = await second.json();
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(firstPage.enquiries).toHaveLength(20);
      expect(firstPage.total).toBeGreaterThanOrEqual(22);
      expect(secondPage.enquiries.length).toBeGreaterThanOrEqual(2);
      expect(firstPage.enquiries.map((item: { id: string }) => item.id).some((id: string) => secondPage.enquiries.some((other: { id: string }) => other.id === id))).toBe(false);
    } finally {
      await database.enquiry.deleteMany({ where: { submissionKey: { in: submissionKeys } } });
    }
  });

  it("reruns admin bootstrap for the same email without creating another account", async () => {
    const database = prisma;
    if (!database) throw new Error("TEST_DATABASE_URL must be set for this test");
    const email = await createUser("admin");
    const result = await execFileAsync(process.execPath, ["scripts/bootstrap-admin.mjs", "--email", email], {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl, BETTER_AUTH_URL: origin },
      cwd: process.cwd(),
      timeout: 15_000,
    });
    expect(result.stdout).toContain("no changes were made");
    expect(result.stdout).not.toContain("password");
    expect(await database.user.count({ where: { email } })).toBe(1);
  }, 20_000);
});
