import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, requireAdmin, requireSameOrigin } = vi.hoisted(() => ({
  prisma: {
    homepageGallerySection: { findUnique: vi.fn(), upsert: vi.fn() },
    portfolioEntry: { findMany: vi.fn() },
  },
  requireAdmin: vi.fn(),
  requireSameOrigin: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma }));
vi.mock("../lib/authorization", () => ({ requireAdmin }));
vi.mock("../lib/same-origin", () => ({ requireSameOrigin }));

import { GET as publicGet } from "../app/api/homepage-gallery/route";
import { GET as publicPortfolioGet } from "../app/api/portfolio/route";
import { GET as adminGet, PUT as adminPut } from "../app/api/admin/homepage-gallery/route";
import { defaultHomepageGallery, validateHomepageGallery } from "../lib/homepage-gallery";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const unpublishedId = "00000000-0000-4000-8000-000000000003";
const sampleId = "00000000-0000-4000-8000-000000000004";
const unselectedId = "00000000-0000-4000-8000-000000000005";
const entries = [
  { id: firstId, title: "First event", imageRef: "/images/gathering-study.svg", altText: "A celebration table", isPublished: true, isSample: false },
  { id: secondId, title: "Second event", imageRef: "/images/table-study.svg", altText: "An event table", isPublished: true, isSample: false },
  { id: unpublishedId, title: "Unpublished event", imageRef: "/images/colour-study.svg", altText: "An unpublished event", isPublished: false, isSample: false },
  { id: sampleId, title: "Sample artwork", imageRef: "/images/gathering-study.svg", altText: "Sample event artwork", isPublished: true, isSample: true },
  { id: unselectedId, title: "Unselected event", imageRef: "/images/table-study.svg", altText: "An unselected event", isPublished: true, isSample: false },
];
const sectionConfig = { ...defaultHomepageGallery, isVisible: true, entryIds: [sampleId, unpublishedId, secondId, firstId] };

function putRequest(body: unknown) {
  return new Request("http://localhost/api/admin/homepage-gallery", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("homepage Gallery configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(null);
    prisma.portfolioEntry.findMany.mockImplementation(async ({ where }: { where?: { isPublished?: boolean; id?: { in?: string[] } } }) => {
      if (where?.id?.in) return entries.filter((entry) => where.id!.in!.includes(entry.id));
      if (where?.isPublished === true) return entries.filter((entry) => entry.isPublished);
      return entries;
    });
  });

  it("returns only selected entries in saved order, including unpublished and sample entries", async () => {
    prisma.homepageGallerySection.findUnique.mockResolvedValue({ id: "home", ...sectionConfig });
    const response = await publicGet();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entries.map((entry: { id: string }) => entry.id)).toEqual(sectionConfig.entryIds);
    expect(body.entries.map((entry: { id: string }) => entry.id)).not.toContain(unselectedId);
    expect(prisma.portfolioEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: sectionConfig.entryIds } },
    }));

    prisma.homepageGallerySection.findUnique.mockResolvedValue(null);
    const defaults = await (await publicGet()).json();
    expect(defaults.section).toEqual(defaultHomepageGallery);
    expect(defaults.entries).toEqual([]);
  });

  it("omits selected entries with missing or invalid image references", async () => {
    const invalidImageId = "00000000-0000-4000-8000-000000000006";
    const ids = [firstId, invalidImageId, unpublishedId];
    prisma.homepageGallerySection.findUnique.mockResolvedValue({ id: "home", ...sectionConfig, entryIds: ids });
    prisma.portfolioEntry.findMany.mockResolvedValue([
      entries[0],
      { ...entries[1], id: invalidImageId, imageRef: "/not-an-approved-image.png" },
      { ...entries[2], imageRef: null },
    ]);

    const response = await publicGet();
    expect((await response.json()).entries.map((entry: { id: string }) => entry.id)).toEqual([firstId]);
  });

  it("keeps unpublished entries hidden from the main portfolio endpoint", async () => {
    const response = await publicPortfolioGet();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.entries.map((entry: { id: string }) => entry.id)).not.toContain(unpublishedId);
    expect(body.entries.map((entry: { id: string }) => entry.id)).toContain(sampleId);
    expect(prisma.portfolioEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true },
    }));
  });

  it("returns all valid-image entries, regardless of sample or publication status, to administrators", async () => {
    prisma.homepageGallerySection.findUnique.mockResolvedValue({ id: "home", ...sectionConfig });
    const response = await adminGet(new Request("http://localhost/api/admin/homepage-gallery"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ section: defaultHomepageGallery, entryIds: sectionConfig.entryIds, entries });
  });

  it("requires administrator authorization and same-origin checks for writes", async () => {
    requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Authentication required." }, { status: 401 }) });
    expect((await adminGet(new Request("http://localhost/api/admin/homepage-gallery"))).status).toBe(401);
    expect((await adminPut(putRequest(sectionConfig))).status).toBe(401);
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(Response.json({ error: "Forbidden." }, { status: 403 }));
    expect((await adminPut(putRequest(sectionConfig))).status).toBe(403);
    expect(prisma.homepageGallerySection.upsert).not.toHaveBeenCalled();
  });

  it("validates text lengths, duplicate and malformed IDs, and selection limits", async () => {
    expect(validateHomepageGallery({ ...sectionConfig, entryIds: [firstId, firstId] }).ok).toBe(false);
    expect(validateHomepageGallery({ ...sectionConfig, entryIds: ["invalid"] }).ok).toBe(false);
    expect(validateHomepageGallery({ ...sectionConfig, heading: "x".repeat(201) }).ok).toBe(false);
    expect(validateHomepageGallery({ ...sectionConfig, entryIds: Array.from({ length: 31 }, () => firstId) }).ok).toBe(false);
    expect((await adminPut(putRequest({ ...sectionConfig, heading: "" }))).status).toBe(400);
    expect(prisma.homepageGallerySection.upsert).not.toHaveBeenCalled();
  });

  it("accepts published, unpublished, and sample selections and persists their requested order", async () => {
    const selectedEntries = [sampleId, unpublishedId, secondId, firstId];
    prisma.portfolioEntry.findMany.mockResolvedValue(selectedEntries.map((id) => ({
      id,
      imageRef: entries.find((entry) => entry.id === id)!.imageRef,
    })));
    prisma.homepageGallerySection.upsert.mockImplementation(async ({ create }: { create: { id: string } }) => ({ ...create, updatedAt: new Date() }));
    const response = await adminPut(putRequest({ ...sectionConfig, entryIds: selectedEntries }));
    expect(response.status).toBe(200);
    expect((await response.json()).entryIds).toEqual(selectedEntries);
    expect(prisma.homepageGallerySection.upsert).toHaveBeenCalledWith({
      where: { id: "home" },
      create: { id: "home", ...sectionConfig, entryIds: selectedEntries },
      update: { ...sectionConfig, entryIds: selectedEntries },
    });
    expect(prisma.portfolioEntry.findMany).toHaveBeenLastCalledWith({
      where: { id: { in: selectedEntries } },
      select: { id: true, imageRef: true },
    });
  });

  it("rejects missing records and records with invalid image references", async () => {
    prisma.portfolioEntry.findMany.mockResolvedValue([{ id: firstId, imageRef: "/api/uploads/not-a-valid-upload.png" }]);
    expect((await adminPut(putRequest({ ...sectionConfig, entryIds: [firstId] }))).status).toBe(400);

    prisma.portfolioEntry.findMany.mockResolvedValue([]);
    expect((await adminPut(putRequest({ ...sectionConfig, entryIds: [firstId] }))).status).toBe(400);
  });
});
