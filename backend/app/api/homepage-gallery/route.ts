import { prisma } from "../../../lib/prisma";
import { logApiDatabaseError } from "../../../lib/api-error-logging";
import { defaultHomepageGallery, hasValidHomepageGalleryImage } from "../../../lib/homepage-gallery";

export async function GET() {
  try {
    const section = await prisma.homepageGallerySection.findUnique({ where: { id: "home" } });
    const entryIds = section?.entryIds ?? [];
    const selectedEntries = entryIds.length
      ? await prisma.portfolioEntry.findMany({
        where: { id: { in: entryIds } },
        select: { id: true, title: true, imageRef: true, altText: true },
      })
      : [];
    const entriesById = new Map(selectedEntries.map((entry) => [entry.id, entry]));
    const entries = entryIds.flatMap((id) => {
      const entry = entriesById.get(id);
      return entry && hasValidHomepageGalleryImage(entry.imageRef) ? [entry] : [];
    });
    return Response.json({
      section: section
        ? { eyebrow: section.eyebrow, heading: section.heading, isVisible: section.isVisible }
        : defaultHomepageGallery,
      entries,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-gallery", "public-read", error);
    return Response.json({ error: "Homepage Gallery is temporarily unavailable." }, { status: 503 });
  }
}
