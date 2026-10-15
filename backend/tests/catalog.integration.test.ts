import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { POST as authPost } from "../app/api/auth/[...all]/route";
import { GET as publicServices } from "../app/api/services/route";
import { GET as publicPortfolio } from "../app/api/portfolio/route";
import { GET as adminServices, POST as createService } from "../app/api/admin/services/route";
import { PATCH as updateService } from "../app/api/admin/services/[id]/route";
import { GET as adminPortfolio, POST as createPortfolio } from "../app/api/admin/portfolio/route";
import { PATCH as updatePortfolio } from "../app/api/admin/portfolio/[id]/route";

const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("service and portfolio management with PostgreSQL", () => {
  let prisma: PrismaClient | undefined;
  const emails: string[] = [];
  const serviceIds: string[] = [];
  const portfolioIds: string[] = [];
  beforeAll(() => { prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl }) }); });
  afterAll(async () => {
    if (prisma && serviceIds.length) await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
    if (prisma && portfolioIds.length) await prisma.portfolioEntry.deleteMany({ where: { id: { in: portfolioIds } } });
    if (prisma && emails.length) await prisma.user.deleteMany({ where: { email: { in: emails } } });
    if (prisma) await prisma.$disconnect();
  });

  async function signIn(role: "admin" | "user") {
    const email = `catalog-${randomUUID()}@example.org`;
    emails.push(email);
    const user = await (await import("../lib/auth")).auth.api.createUser({ body: { email, name: "Catalog Test", password: "a-long-test-password-42", role } });
    if (!user) throw new Error("Test account creation failed");
    const response = await authPost(new Request(`${origin}/api/auth/sign-in/email`, { method: "POST", headers: { origin, "content-type": "application/json", "x-real-ip": `198.51.100.${Math.floor(Math.random() * 200) + 1}` }, body: JSON.stringify({ email, password: "a-long-test-password-42" }) }));
    expect(response.status).toBe(200);
    const cookieValues = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
    const cookie = cookieValues.map((value) => value.split(";", 1)[0]).filter(Boolean).join("; ");
    return cookie;
  }

  function jsonRequest(url: string, cookie: string, method: "POST" | "PATCH", body: unknown, requestOrigin = origin) {
    return new Request(`${origin}${url}`, { method, headers: { origin: requestOrigin, cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
  }

  it("rejects unauthenticated requests to every admin catalog collection", async () => {
    const serviceList = await adminServices(new Request(`${origin}/api/admin/services`));
    const serviceCreate = await createService(jsonRequest("/api/admin/services", "", "POST", {}));
    const portfolioList = await adminPortfolio(new Request(`${origin}/api/admin/portfolio`));
    const portfolioCreate = await createPortfolio(jsonRequest("/api/admin/portfolio", "", "POST", {}));
    expect([serviceList.status, serviceCreate.status, portfolioList.status, portfolioCreate.status]).toEqual([401, 401, 401, 401]);
  });

  it("rejects non-admin management and cross-origin writes", async () => {
    const cookie = await signIn("user");
    expect((await adminServices(new Request(`${origin}/api/admin/services`, { headers: { cookie } }))).status).toBe(403);
    expect((await adminPortfolio(new Request(`${origin}/api/admin/portfolio`, { headers: { cookie } }))).status).toBe(403);
    expect((await createService(jsonRequest("/api/admin/services", cookie, "POST", { slug: "blocked", title: "Blocked", kicker: "Not allowed", description: "This description is long enough to validate.", detail: "This detail is long enough to validate." }, "https://attacker.example"))).status).toBe(403);
  });

  it("creates, edits, and activates services while public reads include only active entries", async () => {
    const cookie = await signIn("admin");
    const slug = `test-${randomUUID()}`;
    const input = { slug, title: "Test service", kicker: "A test kicker", description: "A test description that is long enough.", detail: "A test detail that is long enough.", sortOrder: 10 };
    const created = await createService(jsonRequest("/api/admin/services", cookie, "POST", input));
    expect(created.status).toBe(201);
    const createdData = await created.json();
    const service = createdData.service;
    serviceIds.push(service.id);
    const edited = await updateService(jsonRequest(`/api/admin/services/${service.id}`, cookie, "PATCH", { title: "Edited test service" }), { params: Promise.resolve({ id: service.id }) });
    expect(edited.status).toBe(200);
    expect((await edited.json()).service.title).toBe("Edited test service");
    const activeRead = await publicServices();
    expect((await activeRead.json()).services.some((item: { id: string }) => item.id === service.id)).toBe(true);
    const deactivated = await updateService(jsonRequest(`/api/admin/services/${service.id}`, cookie, "PATCH", { isActive: false }), { params: Promise.resolve({ id: service.id }) });
    expect(deactivated.status).toBe(200);
    const inactiveRead = await publicServices();
    expect((await inactiveRead.json()).services.some((item: { id: string }) => item.id === service.id)).toBe(false);
    const activated = await updateService(jsonRequest(`/api/admin/services/${service.id}`, cookie, "PATCH", { isActive: true }), { params: Promise.resolve({ id: service.id }) });
    expect(activated.status).toBe(200);
  });

  it("creates, edits, validates, and publishes gallery entries", async () => {
    const cookie = await signIn("admin");
    const invalid = await createPortfolio(jsonRequest("/api/admin/portfolio", cookie, "POST", { title: "Unsafe", description: "A description long enough to test.", imageRef: "https://example.org/image.jpg", altText: "Remote image", sortOrder: 0 }));
    expect(invalid.status).toBe(400);
    const created = await createPortfolio(jsonRequest("/api/admin/portfolio", cookie, "POST", { title: "Integration sample", description: "A test gallery description long enough.", imageRef: "/images/gathering-study.svg", altText: "Sample gathering artwork", sortOrder: 20 }));
    expect(created.status).toBe(201);
    const entry = (await created.json()).entry;
    portfolioIds.push(entry.id);
    expect(entry.isPublished).toBe(false);
    const beforePublish = await publicPortfolio();
    expect((await beforePublish.json()).entries.some((item: { id: string }) => item.id === entry.id)).toBe(false);
    const edited = await updatePortfolio(jsonRequest(`/api/admin/portfolio/${entry.id}`, cookie, "PATCH", { title: "Edited sample" }), { params: Promise.resolve({ id: entry.id }) });
    expect(edited.status).toBe(200);
    expect((await edited.json()).entry.title).toBe("Edited sample");
    const published = await updatePortfolio(jsonRequest(`/api/admin/portfolio/${entry.id}`, cookie, "PATCH", { isPublished: true }), { params: Promise.resolve({ id: entry.id }) });
    expect(published.status).toBe(200);
    const afterPublish = await publicPortfolio();
    expect((await afterPublish.json()).entries.some((item: { id: string }) => item.id === entry.id)).toBe(true);
    const unpublished = await updatePortfolio(jsonRequest(`/api/admin/portfolio/${entry.id}`, cookie, "PATCH", { isPublished: false }), { params: Promise.resolve({ id: entry.id }) });
    expect(unpublished.status).toBe(200);
    expect((await (await publicPortfolio()).json()).entries.some((item: { id: string }) => item.id === entry.id)).toBe(false);
  });
});
