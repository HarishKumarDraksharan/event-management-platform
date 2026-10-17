import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, requireAdmin, requireSameOrigin } = vi.hoisted(() => ({
  prisma: {
    homepageServicesSection: { findUnique: vi.fn(), upsert: vi.fn() },
    service: { findMany: vi.fn() },
  },
  requireAdmin: vi.fn(),
  requireSameOrigin: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma }));
vi.mock("../lib/authorization", () => ({ requireAdmin }));
vi.mock("../lib/same-origin", () => ({ requireSameOrigin }));

import { GET as getPublicHomepageServices } from "../app/api/homepage-services/route";
import { GET as getAdminHomepageServices, PUT as putAdminHomepageServices } from "../app/api/admin/homepage-services/route";
import { defaultHomepageServices, validateHomepageServices } from "../lib/homepage-services";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const config = { ...defaultHomepageServices, serviceIds: [secondId, firstId] };

function putRequest(body: unknown) {
  return new Request("http://localhost/api/admin/homepage-services", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("homepage services configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(null);
    prisma.service.findMany.mockResolvedValue([]);
  });

  it("provides the default public heading and falls back to the existing active services", async () => {
    prisma.homepageServicesSection.findUnique.mockResolvedValue(null);
    const response = await getPublicHomepageServices();
    expect(response.status).toBe(200);
    expect((await response.json()).section).toEqual({ ...defaultHomepageServices, serviceIds: null });
  });

  it("logs only safe metadata when a homepage services read fails", async () => {
    prisma.homepageServicesSection.findUnique.mockRejectedValue(Object.assign(new Error("password and connection data"), { code: "P2021" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await getPublicHomepageServices();
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledWith("[homepage-services] database operation failed", {
      operation: "public-read",
      errorName: "Error",
      errorCode: "P2021",
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain("password");
  });

  it("does not expose selected inactive service IDs in the public section configuration", async () => {
    prisma.homepageServicesSection.findUnique.mockResolvedValue({ ...config, id: "home" });
    prisma.service.findMany.mockResolvedValue([{ id: firstId }]);
    const response = await getPublicHomepageServices();
    expect(response.status).toBe(200);
    expect((await response.json()).section.serviceIds).toEqual([firstId]);
  });

  it("returns active service defaults for the admin editor without creating records", async () => {
    prisma.homepageServicesSection.findUnique.mockResolvedValue(null);
    prisma.service.findMany.mockResolvedValue([
      { id: firstId, slug: "first", title: "First", isActive: true, sortOrder: 1 },
      { id: secondId, slug: "second", title: "Second", isActive: false, sortOrder: 2 },
    ]);
    const response = await getAdminHomepageServices(new Request("http://localhost/api/admin/homepage-services"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ section: defaultHomepageServices, serviceIds: [firstId] });
    expect(prisma.homepageServicesSection.upsert).not.toHaveBeenCalled();
  });

  it("requires administrator authorization for reads and writes", async () => {
    requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Authentication required." }, { status: 401 }) });
    expect((await getAdminHomepageServices(new Request("http://localhost/api/admin/homepage-services"))).status).toBe(401);
    expect((await putAdminHomepageServices(putRequest(config))).status).toBe(401);
    expect(prisma.homepageServicesSection.upsert).not.toHaveBeenCalled();
  });

  it("rejects invalid settings, duplicate service IDs, and cross-origin writes", async () => {
    expect(validateHomepageServices({ ...config, serviceIds: [firstId, firstId] }).ok).toBe(false);
    expect((await putAdminHomepageServices(putRequest({ ...config, heading: "" }))).status).toBe(400);
    requireSameOrigin.mockReturnValue(Response.json({ error: "Forbidden." }, { status: 403 }));
    expect((await putAdminHomepageServices(putRequest(config))).status).toBe(403);
    expect(prisma.homepageServicesSection.upsert).not.toHaveBeenCalled();
  });

  it("persists the selected service IDs in the requested display order", async () => {
    prisma.service.findMany.mockResolvedValue([{ id: secondId }, { id: firstId }]);
    prisma.homepageServicesSection.upsert.mockImplementation(async ({ create }: { create: { id: string } }) => ({ ...create, updatedAt: new Date() }));
    const response = await putAdminHomepageServices(putRequest(config));
    expect(response.status).toBe(200);
    expect((await response.json()).serviceIds).toEqual([secondId, firstId]);
    expect(prisma.homepageServicesSection.upsert).toHaveBeenCalledWith({
      where: { id: "home" },
      create: { id: "home", ...config },
      update: config,
    });
  });

  it("rejects IDs that do not resolve to an existing service", async () => {
    prisma.service.findMany.mockResolvedValue([{ id: firstId }]);
    const response = await putAdminHomepageServices(putRequest(config));
    expect(response.status).toBe(400);
    expect(prisma.homepageServicesSection.upsert).not.toHaveBeenCalled();
  });
});
