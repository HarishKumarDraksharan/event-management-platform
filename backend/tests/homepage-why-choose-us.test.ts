import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, requireAdmin, requireSameOrigin } = vi.hoisted(() => ({
  prisma: { homepageWhyChooseUsSection: { findUnique: vi.fn(), upsert: vi.fn() } },
  requireAdmin: vi.fn(),
  requireSameOrigin: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma }));
vi.mock("../lib/authorization", () => ({ requireAdmin }));
vi.mock("../lib/same-origin", () => ({ requireSameOrigin }));

import { GET as publicGet } from "../app/api/homepage-why-choose-us/route";
import { GET as adminGet, PUT as adminPut } from "../app/api/admin/homepage-why-choose-us/route";
import { defaultHomepageWhyChooseUs, validateHomepageWhyChooseUs } from "../lib/homepage-why-choose-us";

function putRequest(body: unknown) {
  return new Request("http://localhost/api/admin/homepage-why-choose-us", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("homepage Why Choose Us configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(null);
  });

  it("returns saved public content and supplies initial values only when no row exists", async () => {
    prisma.homepageWhyChooseUsSection.findUnique.mockResolvedValue({ id: "home", ...defaultHomepageWhyChooseUs });
    expect((await (await publicGet()).json()).section).toEqual(defaultHomepageWhyChooseUs);
    prisma.homepageWhyChooseUsSection.findUnique.mockResolvedValue(null);
    expect((await (await publicGet()).json()).section).toEqual(defaultHomepageWhyChooseUs);
    expect((await (await adminGet(new Request("http://localhost/api/admin/homepage-why-choose-us"))).json()).section).toEqual(defaultHomepageWhyChooseUs);
  });

  it("requires administrator access and same-origin protection for writes", async () => {
    requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Authentication required." }, { status: 401 }) });
    expect((await adminGet(new Request("http://localhost/api/admin/homepage-why-choose-us"))).status).toBe(401);
    expect((await adminPut(putRequest(defaultHomepageWhyChooseUs))).status).toBe(401);
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(Response.json({ error: "Forbidden." }, { status: 403 }));
    expect((await adminPut(putRequest(defaultHomepageWhyChooseUs))).status).toBe(403);
    expect(prisma.homepageWhyChooseUsSection.upsert).not.toHaveBeenCalled();
  });

  it("rejects unsupported icons, invalid fields, duplicate IDs, and invalid card counts", async () => {
    expect(validateHomepageWhyChooseUs({
      ...defaultHomepageWhyChooseUs,
      featureCards: [{ ...defaultHomepageWhyChooseUs.featureCards[0], icon: "script" }],
    }).ok).toBe(false);
    expect(validateHomepageWhyChooseUs({
      ...defaultHomepageWhyChooseUs,
      featureCards: [defaultHomepageWhyChooseUs.featureCards[0], defaultHomepageWhyChooseUs.featureCards[0]],
    }).ok).toBe(false);
    expect(validateHomepageWhyChooseUs({ ...defaultHomepageWhyChooseUs, featureCards: [] }).ok).toBe(false);
    expect(validateHomepageWhyChooseUs({ ...defaultHomepageWhyChooseUs, heading: "x".repeat(201) }).ok).toBe(false);
    expect(validateHomepageWhyChooseUs({
      ...defaultHomepageWhyChooseUs,
      featureCards: [{ ...defaultHomepageWhyChooseUs.featureCards[0], title: "x".repeat(101) }],
    }).ok).toBe(false);
    expect(validateHomepageWhyChooseUs({
      ...defaultHomepageWhyChooseUs,
      featureCards: Array.from({ length: 13 }, (_, index) => ({ ...defaultHomepageWhyChooseUs.featureCards[0], id: `card-${index}` })),
    }).ok).toBe(false);
    expect((await adminPut(putRequest({ ...defaultHomepageWhyChooseUs, featureCards: [{ ...defaultHomepageWhyChooseUs.featureCards[0], icon: "script" }] }))).status).toBe(400);
    expect(prisma.homepageWhyChooseUsSection.upsert).not.toHaveBeenCalled();
  });

  it("persists new card content and configured order", async () => {
    const input = {
      ...defaultHomepageWhyChooseUs,
      heading: "A newly edited heading",
      featureCards: [...defaultHomepageWhyChooseUs.featureCards].reverse(),
    };
    prisma.homepageWhyChooseUsSection.upsert.mockImplementation(async ({ create }: { create: { id: string } }) => ({ ...create, updatedAt: new Date() }));
    const response = await adminPut(putRequest(input));
    expect(response.status).toBe(200);
    const responseSection = (await response.json()).section;
    expect(responseSection.featureCards.map((feature: { id: string }) => feature.id)).toEqual(input.featureCards.map((feature) => feature.id));
    expect(responseSection.id).toBeUndefined();
    expect(responseSection.updatedAt).toBeUndefined();
    expect(prisma.homepageWhyChooseUsSection.upsert).toHaveBeenCalledWith({
      where: { id: "home" },
      create: { id: "home", ...input },
      update: input,
    });
  });

  it("returns a safe error when the database fails", async () => {
    prisma.homepageWhyChooseUsSection.findUnique.mockRejectedValue(Object.assign(new Error("private connection string"), { code: "P2021" }));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await publicGet();
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("Homepage content is temporarily unavailable.");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private connection string");
  });
});
