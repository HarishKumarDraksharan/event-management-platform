import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { defaultHomepageServices, validateHomepageServices } from "../../../../lib/homepage-services";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { logApiDatabaseError } from "../../../../lib/api-error-logging";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const [section, services] = await Promise.all([
      prisma.homepageServicesSection.findUnique({ where: { id: "home" } }),
      prisma.service.findMany({
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        select: { id: true, slug: true, title: true, isActive: true, sortOrder: true },
      }),
    ]);
    return Response.json({
      section: section
        ? { eyebrow: section.eyebrow, heading: section.heading, highlight: section.highlight, isVisible: section.isVisible }
        : defaultHomepageServices,
      serviceIds: section ? section.serviceIds : services.filter((service) => service.isActive).map((service) => service.id),
      services,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-services", "admin-read", error);
    return Response.json({ error: "Homepage services are temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const input = validateHomepageServices(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });

  try {
    const existingServices = await prisma.service.findMany({
      where: { id: { in: input.value.serviceIds } },
      select: { id: true },
    });
    if (existingServices.length !== input.value.serviceIds.length) {
      return Response.json({ error: "Choose only existing services." }, { status: 400 });
    }
    const section = await prisma.homepageServicesSection.upsert({
      where: { id: "home" },
      create: { id: "home", ...input.value },
      update: input.value,
    });
    return Response.json({
      section: { eyebrow: section.eyebrow, heading: section.heading, highlight: section.highlight, isVisible: section.isVisible },
      serviceIds: section.serviceIds,
    });
  } catch (error) {
    logApiDatabaseError("homepage-services", "admin-write", error);
    return Response.json({ error: "Homepage services could not be saved right now." }, { status: 503 });
  }
}
