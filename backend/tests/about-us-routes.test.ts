import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, requireAdmin, requireSameOrigin } = vi.hoisted(() => ({
  prisma: {
    aboutUsSection: { findUnique: vi.fn(), findFirst: vi.fn(), upsert: vi.fn() },
    portfolioEntry: { findFirst: vi.fn() },
    heroSlide: { findFirst: vi.fn() },
    service: { findFirst: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  requireAdmin: vi.fn(),
  requireSameOrigin: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma }));
vi.mock("../lib/authorization", () => ({ requireAdmin }));
vi.mock("../lib/same-origin", () => ({ requireSameOrigin }));

import { GET as getPublicAboutUs } from "../app/api/about-us/route";
import { GET as getAdminAboutUs, PUT as putAdminAboutUs } from "../app/api/admin/about-us/route";
import { defaultAboutUs } from "../lib/about-us";

describe("About Us API handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(null);
    prisma.$executeRaw.mockResolvedValue(1);
    prisma.aboutUsSection.findUnique.mockResolvedValue({ id: "home", imageUrl: defaultAboutUs.imageUrl });
    prisma.$transaction.mockImplementation((callback) => callback({
      $executeRaw: prisma.$executeRaw,
      aboutUsSection: prisma.aboutUsSection,
      portfolioEntry: prisma.portfolioEntry,
      heroSlide: prisma.heroSlide,
      service: prisma.service,
    }));
  });

  it("reads public About Us content from Prisma", async () => {
    prisma.aboutUsSection.findUnique.mockResolvedValue({ id: "home", ...defaultAboutUs });
    const response = await getPublicAboutUs();
    expect(response.status).toBe(200);
    expect((await response.json()).aboutUs).toMatchObject(defaultAboutUs);
    expect(prisma.aboutUsSection.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "home" } }));
  });

  it("returns a logged 503 if the generated Prisma client lacks the About Us delegate", async () => {
    const delegate = prisma.aboutUsSection;
    Object.defineProperty(prisma, "aboutUsSection", { configurable: true, value: undefined });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await getPublicAboutUs();
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledWith("[about-us] database operation failed", {
      operation: "public-read",
      errorName: "TypeError",
    });
    Object.defineProperty(prisma, "aboutUsSection", { configurable: true, value: delegate });
  });

  it("logs only safe error metadata for database failures", async () => {
    const unsafeError = Object.assign(new Error("failed using postgresql://secret:password@database"), { code: "P2021" });
    prisma.aboutUsSection.findUnique.mockRejectedValue(unsafeError);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await getPublicAboutUs();
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledWith("[about-us] database operation failed", {
      operation: "public-read",
      errorName: "Error",
      errorCode: "P2021",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("password");
  });

  it("requires admin authorization for management reads and writes", async () => {
    requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Authentication required." }, { status: 401 }) });
    expect((await getAdminAboutUs(new Request("http://localhost/api/admin/about-us"))).status).toBe(401);
    expect((await putAdminAboutUs(new Request("http://localhost/api/admin/about-us", { method: "PUT" }))).status).toBe(401);
    expect(prisma.aboutUsSection.findUnique).not.toHaveBeenCalled();
    expect(prisma.aboutUsSection.upsert).not.toHaveBeenCalled();
  });

  it("upserts valid content and reports a logged 503 on write failure", async () => {
    const saved = { id: "home", ...defaultAboutUs };
    prisma.aboutUsSection.upsert.mockResolvedValue(saved);
    const request = () => new Request("http://localhost/api/admin/about-us", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(defaultAboutUs),
    });
    const response = await putAdminAboutUs(request());
    expect(response.status).toBe(200);
    expect((await response.json()).aboutUs).toMatchObject(defaultAboutUs);
    expect(prisma.aboutUsSection.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "home" },
      create: expect.objectContaining(defaultAboutUs),
      update: expect.objectContaining(defaultAboutUs),
    }));

    prisma.aboutUsSection.upsert.mockRejectedValue(new Error("sensitive connection string"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failedResponse = await putAdminAboutUs(request());
    expect(failedResponse.status).toBe(503);
    expect(log).toHaveBeenCalledWith("[about-us] database operation failed", { operation: "admin-write", errorName: "Error" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive");
  });

  it("logs management read failures with an operation-only identifier", async () => {
    prisma.aboutUsSection.findUnique.mockRejectedValue(new Error("session token must not be logged"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await getAdminAboutUs(new Request("http://localhost/api/admin/about-us"));
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledWith("[about-us] database operation failed", { operation: "admin-read", errorName: "Error" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("session token");
  });
});
