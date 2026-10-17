import { prisma } from "../../../lib/prisma";
import { logApiDatabaseError } from "../../../lib/api-error-logging";
import { defaultHomepageServices } from "../../../lib/homepage-services";

export async function GET() {
  try {
    const [section, activeServices] = await Promise.all([
      prisma.homepageServicesSection.findUnique({ where: { id: "home" } }),
      prisma.service.findMany({ where: { isActive: true }, select: { id: true } }),
    ]);
    const activeServiceIds = new Set(activeServices.map((service) => service.id));
    return Response.json({
      section: section
        ? { eyebrow: section.eyebrow, heading: section.heading, highlight: section.highlight, isVisible: section.isVisible, serviceIds: section.serviceIds.filter((id) => activeServiceIds.has(id)) }
        : { ...defaultHomepageServices, serviceIds: null },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-services", "public-read", error);
    return Response.json({ error: "Homepage services are temporarily unavailable." }, { status: 503 });
  }
}
