import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { defaultHomepageTestimonials, validateHomepageTestimonials, validateTestimonialRecord } from "../../../../lib/homepage-testimonials";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { logApiDatabaseError } from "../../../../lib/api-error-logging";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const [section, testimonials] = await Promise.all([
      prisma.homepageTestimonialsSection.findUnique({ where: { id: "home" } }),
      prisma.testimonial.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
    ]);

    const validIds = new Set(testimonials.map((testimonial) => testimonial.id));
    const testimonialIds = section ? section.testimonialIds.filter((id) => validIds.has(id)) : testimonials.filter((testimonial) => testimonial.isPublished).map((testimonial) => testimonial.id);
    return Response.json({
      section: section
        ? { eyebrow: section.eyebrow, heading: section.heading, description: section.description, isVisible: section.isVisible }
        : defaultHomepageTestimonials,
      testimonialIds,
      testimonials,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-testimonials", "admin-read", error);
    return Response.json({ error: "Homepage testimonials are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const input = validateTestimonialRecord(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });

  try {
    const testimonial = await prisma.testimonial.create({ data: input.value });
    return Response.json({ testimonial }, { status: 201 });
  } catch (error) {
    logApiDatabaseError("homepage-testimonials", "create", error);
    return Response.json({ error: "Testimonial could not be saved right now." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const input = validateHomepageTestimonials(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });

  try {
    const existingTestimonials = await prisma.testimonial.findMany({
      where: { id: { in: input.value.testimonialIds } },
      select: { id: true, isPublished: true },
    });
    if (existingTestimonials.length !== input.value.testimonialIds.length) {
      return Response.json({ error: "Choose only existing testimonials." }, { status: 400 });
    }
    const section = await prisma.homepageTestimonialsSection.upsert({
      where: { id: "home" },
      create: { id: "home", ...input.value },
      update: input.value,
    });
    return Response.json({ section: { eyebrow: section.eyebrow, heading: section.heading, description: section.description, isVisible: section.isVisible }, testimonialIds: section.testimonialIds });
  } catch (error) {
    logApiDatabaseError("homepage-testimonials", "admin-write", error);
    return Response.json({ error: "Homepage testimonials settings could not be saved right now." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const testimonialId = typeof body?.id === "string" ? body.id : null;
  if (!testimonialId) return Response.json({ error: "Choose a testimonial to update." }, { status: 400 });

  const payload: Record<string, unknown> | null = testimonialId && body && typeof body === "object"
    ? Object.fromEntries(Object.entries(body).filter(([key]) => key !== "id"))
    : null;
  const input = payload ? validateTestimonialRecord(payload) : null;
  if (!input || !input.ok) return Response.json({ error: body ? input?.message ?? "Testimonial fields are invalid." : "A valid JSON request is required." }, { status: 400 });

  try {
    const testimonial = await prisma.testimonial.update({
      where: { id: testimonialId },
      data: input.value,
    });
    return Response.json({ testimonial });
  } catch (error) {
    logApiDatabaseError("homepage-testimonials", "update", error);
    return Response.json({ error: "Testimonial could not be updated right now." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const testimonialId = typeof body?.id === "string" ? body.id : null;
  if (!testimonialId) return Response.json({ error: "Choose a testimonial to delete." }, { status: 400 });

  try {
    const section = await prisma.homepageTestimonialsSection.findUnique({ where: { id: "home" } });
    if (section) {
      await prisma.homepageTestimonialsSection.update({
        where: { id: "home" },
        data: { testimonialIds: section.testimonialIds.filter((id) => id !== testimonialId) },
      });
    }
    await prisma.testimonial.delete({ where: { id: testimonialId } });
    return Response.json({ ok: true });
  } catch (error) {
    logApiDatabaseError("homepage-testimonials", "delete", error);
    return Response.json({ error: "Testimonial could not be deleted right now." }, { status: 503 });
  }
}
