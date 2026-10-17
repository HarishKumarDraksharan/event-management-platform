import { prisma } from "../../../lib/prisma";
import { logApiDatabaseError } from "../../../lib/api-error-logging";
import { defaultHomepageWhyChooseUs } from "../../../lib/homepage-why-choose-us";

export async function GET() {
  try {
    const section = await prisma.homepageWhyChooseUsSection.findUnique({ where: { id: "home" } });
    return Response.json({
      section: section
        ? { heading: section.heading, supportingText: section.supportingText, isVisible: section.isVisible, featureCards: section.featureCards }
        : defaultHomepageWhyChooseUs,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-why-choose-us", "public-read", error);
    return Response.json({ error: "Homepage content is temporarily unavailable." }, { status: 503 });
  }
}
