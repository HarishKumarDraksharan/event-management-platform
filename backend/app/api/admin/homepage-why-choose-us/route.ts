import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { defaultHomepageWhyChooseUs, validateHomepageWhyChooseUs } from "../../../../lib/homepage-why-choose-us";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { logApiDatabaseError } from "../../../../lib/api-error-logging";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const section = await prisma.homepageWhyChooseUsSection.findUnique({ where: { id: "home" } });
    return Response.json({
      section: section
        ? { heading: section.heading, supportingText: section.supportingText, isVisible: section.isVisible, featureCards: section.featureCards }
        : defaultHomepageWhyChooseUs,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-why-choose-us", "admin-read", error);
    return Response.json({ error: "Homepage content is temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const input = validateHomepageWhyChooseUs(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });

  try {
    const section = await prisma.homepageWhyChooseUsSection.upsert({
      where: { id: "home" },
      create: { id: "home", ...input.value },
      update: input.value,
    });
    return Response.json({
      section: { heading: section.heading, supportingText: section.supportingText, isVisible: section.isVisible, featureCards: section.featureCards },
    });
  } catch (error) {
    logApiDatabaseError("homepage-why-choose-us", "admin-write", error);
    return Response.json({ error: "Homepage content could not be saved right now." }, { status: 503 });
  }
}
