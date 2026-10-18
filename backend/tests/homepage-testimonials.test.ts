import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma, requireAdmin, requireSameOrigin } = vi.hoisted(() => ({
  prisma: {
    homepageTestimonialsSection: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    testimonial: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  requireAdmin: vi.fn(),
  requireSameOrigin: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma }));
vi.mock("../lib/authorization", () => ({ requireAdmin }));
vi.mock("../lib/same-origin", () => ({ requireSameOrigin }));

import { GET as publicGet } from "../app/api/homepage-testimonials/route";
import { GET as adminGet, POST as adminPost, PUT as adminPut, PATCH as adminPatch, DELETE as adminDelete } from "../app/api/admin/homepage-testimonials/route";
import { defaultHomepageTestimonials, validateHomepageTestimonials, validateTestimonialRecord } from "../lib/homepage-testimonials";

const firstId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const hiddenId = "00000000-0000-4000-8000-000000000003";
const sectionConfig = {
  id: "home",
  eyebrow: "Kind Words",
  heading: "Memories That Speak for Themselves",
  description: "The moments we create are best described by the people who experience them.",
  isVisible: true,
  testimonialIds: [hiddenId, firstId, secondId],
};
const testimonials = [
  { id: firstId, name: "Alicia", text: "Our celebration felt beautifully handled from start to finish.", eventType: "Wedding", eventDate: "May 2025", rating: 5, label: "Bride", imageRef: "/images/gathering-study.svg", isPublished: true, sortOrder: 1 },
  { id: secondId, name: "Daniel", text: "Every detail was calm, polished and personal for our team retreat.", eventType: "Corporate Event", eventDate: "April 2025", rating: 4, label: "Client", imageRef: "/images/table-study.svg", isPublished: true, sortOrder: 2 },
  { id: hiddenId, name: "Priya", text: "Helpful, thoughtful and incredibly responsive for our event planning.", eventType: "Birthday", eventDate: "March 2025", rating: 5, label: "Parent", imageRef: "/invalid.png", isPublished: true, sortOrder: 0 },
];

function request(method: string, body: unknown) {
  return new Request("http://localhost/api/admin/homepage-testimonials", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("homepage testimonials config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(null);
    prisma.homepageTestimonialsSection.findUnique.mockResolvedValue(sectionConfig);
    prisma.testimonial.findMany.mockResolvedValue(testimonials);
    prisma.homepageTestimonialsSection.upsert.mockResolvedValue({ ...sectionConfig });
    prisma.testimonial.create.mockResolvedValue({ ...testimonials[0], createdAt: new Date(), updatedAt: new Date() });
    prisma.testimonial.update.mockResolvedValue({ ...testimonials[0], updatedAt: new Date() });
    prisma.testimonial.delete.mockResolvedValue({ ...testimonials[0] });
  });

  it("returns only selected, published testimonials in the configured order and falls back to defaults when absent", async () => {
    const response = await publicGet();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.section).toEqual({ eyebrow: sectionConfig.eyebrow, heading: sectionConfig.heading, description: sectionConfig.description, isVisible: sectionConfig.isVisible });
    expect(body.testimonials.map((item: { id: string }) => item.id)).toEqual([firstId, secondId]);

    prisma.homepageTestimonialsSection.findUnique.mockResolvedValue(null);
    const defaultResponse = await publicGet();
    expect(defaultResponse.status).toBe(200);
    expect((await defaultResponse.json()).section).toEqual(defaultHomepageTestimonials);
  });

  it("filters invalid image references and respects admin publication controls", async () => {
    const invalidImage = { ...testimonials[1], imageRef: "/not-allowed.png" };
    prisma.testimonial.findMany.mockResolvedValue([testimonials[0], invalidImage]);
    const adminResponse = await adminGet(new Request("http://localhost/api/admin/homepage-testimonials"));
    expect(adminResponse.status).toBe(200);
    const adminJson = await adminResponse.json();
    expect(adminJson.testimonials.map((item: { id: string }) => item.id)).toEqual([firstId, secondId]);

    const response = await publicGet();
    const publicJson = await response.json();
    expect(publicJson.testimonials.map((item: { id: string }) => item.id)).toEqual([firstId]);
    expect(publicJson.testimonials.some((item: { imageRef: string | null }) => item.imageRef === "/not-allowed.png")).toBe(false);
  });

  it("requires administrator auth and same-origin checks for writes", async () => {
    requireAdmin.mockResolvedValue({ ok: false, response: Response.json({ error: "Authentication required." }, { status: 401 }) });
    expect((await adminPost(request("POST", { name: "Name", text: "This is a valid review for the site.", isPublished: true, sortOrder: 1 }))).status).toBe(401);
    expect((await adminPut(request("PUT", { eyebrow: "Kind Words", heading: "A heading", description: "Review section copy.", isVisible: true, testimonialIds: [firstId] }))).status).toBe(401);

    requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin-id", email: "admin@example.org", name: "Admin" } });
    requireSameOrigin.mockReturnValue(Response.json({ error: "Forbidden." }, { status: 403 }));
    expect((await adminPatch(request("PATCH", { id: firstId, name: "Updated name", text: "Updated review text with enough detail.", isPublished: true, sortOrder: 1 }))).status).toBe(403);
    expect((await adminDelete(request("DELETE", { id: firstId }))).status).toBe(403);
  });

  it("validates testimonial content, rating limits, duplicates, and item selection bounds", async () => {
    expect(validateHomepageTestimonials({ eyebrow: "A", heading: "b", description: "c", isVisible: true, testimonialIds: [firstId, firstId] }).ok).toBe(false);
    expect(validateHomepageTestimonials({ eyebrow: "Kind Words", heading: "Memories", description: "A description", isVisible: true, testimonialIds: ["invalid-id"] }).ok).toBe(false);
    expect(validateTestimonialRecord({ name: "A", text: "Need a longer review that is still valid.", isPublished: true, sortOrder: 0 }).ok).toBe(false);
    expect(validateTestimonialRecord({ name: "Alice", text: "This review is long enough to pass.", rating: 6, isPublished: true, sortOrder: 1 }).ok).toBe(false);
    expect(validateTestimonialRecord({ name: "Alice", text: "This review is long enough to pass.", imageRef: "/images/hero.svg", isPublished: true, sortOrder: 1 }).ok).toBe(true);
    expect(validateTestimonialRecord({ name: "Alice", text: "This review is long enough to pass.", imageRef: "/images/gathering-study.svg", isPublished: true, sortOrder: 1 }).ok).toBe(true);
  });

  it("creates, updates, deletes and reorders testimonials via the admin API", async () => {
    prisma.testimonial.create.mockResolvedValue({ ...testimonials[0], id: firstId, createdAt: new Date(), updatedAt: new Date() });
    const createResponse = await adminPost(request("POST", {
      name: "Alice",
      text: "This is a detailed testimonial that clearly qualifies for publication.",
      eventType: "Wedding",
      eventDate: "2025-05-11",
      rating: 5,
      label: "Bride",
      imageRef: "/images/gathering-study.svg",
      isPublished: true,
      sortOrder: 1,
    }));
    expect(createResponse.status).toBe(201);

    prisma.testimonial.findMany.mockResolvedValue([{ id: firstId, isPublished: true }, { id: secondId, isPublished: true }]);
    prisma.homepageTestimonialsSection.upsert.mockResolvedValue({ id: "home", eyebrow: "Kind Words", heading: "Memories", description: "Section copy", isVisible: true, testimonialIds: [firstId, secondId], updatedAt: new Date() });
    const putResponse = await adminPut(request("PUT", {
      eyebrow: "Kind Words",
      heading: "Memories That Speak for Themselves",
      description: "The moments we create are best described by the people who experience them.",
      isVisible: true,
      testimonialIds: [firstId, secondId],
    }));
    expect(putResponse.status).toBe(200);

    const patchResponse = await adminPatch(request("PATCH", {
      id: firstId,
      name: "Alice Updated",
      text: "This review has been updated to be a little more detailed and polished.",
      isPublished: true,
      sortOrder: 2,
    }));
    expect(patchResponse.status).toBe(200);

    prisma.homepageTestimonialsSection.update.mockResolvedValue({ id: "home", testimonialIds: [secondId], eyebrow: "Kind Words", heading: "Memories", description: "Section copy", isVisible: true, updatedAt: new Date() });
    const deleteResponse = await adminDelete(request("DELETE", { id: firstId }));
    expect(deleteResponse.status).toBe(200);
  });
});
