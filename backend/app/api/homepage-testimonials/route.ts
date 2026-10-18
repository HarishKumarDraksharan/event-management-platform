import { prisma } from "../../../lib/prisma";
import { logApiDatabaseError } from "../../../lib/api-error-logging";
import { defaultHomepageTestimonials } from "../../../lib/homepage-testimonials";

function isValidImageRef(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 && /^(?:\/images\/.*|\/api\/uploads\/.*)$/i.test(value.trim());
}

export async function GET() {
  try {
    const section = await prisma.homepageTestimonialsSection.findUnique({ where: { id: "home" } });
    const testimonialIds = section?.testimonialIds ?? [];
    const selectedTestimonials = testimonialIds.length
      ? await prisma.testimonial.findMany({
        where: { id: { in: testimonialIds }, isPublished: true },
        select: { id: true, name: true, text: true, eventType: true, eventDate: true, rating: true, label: true, imageRef: true },
      })
      : [];

    const testimonialsById = new Map(selectedTestimonials.map((testimonial) => [testimonial.id, testimonial]));
    const testimonials = testimonialIds.flatMap((id) => {
      const testimonial = testimonialsById.get(id);
      if (!testimonial) return [];
      if (testimonial.imageRef && !isValidImageRef(testimonial.imageRef)) return [];
      return [testimonial];
    });

    return Response.json({
      section: section
        ? { eyebrow: section.eyebrow, heading: section.heading, description: section.description, isVisible: section.isVisible }
        : defaultHomepageTestimonials,
      testimonials,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-testimonials", "public-read", error);
    return Response.json({ error: "Homepage testimonials are temporarily unavailable." }, { status: 503 });
  }
}
