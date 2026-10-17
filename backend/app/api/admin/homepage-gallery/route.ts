import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { defaultHomepageGallery, hasValidHomepageGalleryImage, validateHomepageGallery } from "../../../../lib/homepage-gallery";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { logApiDatabaseError } from "../../../../lib/api-error-logging";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const [section, entries] = await Promise.all([
      prisma.homepageGallerySection.findUnique({ where: { id: "home" } }),
      prisma.portfolioEntry.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: { id: true, title: true, imageRef: true, altText: true, isPublished: true, isSample: true },
      }),
    ]);
    const selectableEntries = entries.filter((entry) => hasValidHomepageGalleryImage(entry.imageRef));
    const knownEntryIds = new Set(selectableEntries.map((entry) => entry.id));
    const entryIds = section
      ? section.entryIds.filter((id) => knownEntryIds.has(id))
      : selectableEntries.filter((entry) => entry.isPublished && !entry.isSample).map((entry) => entry.id);
    return Response.json({
      section: section
        ? { eyebrow: section.eyebrow, heading: section.heading, isVisible: section.isVisible }
        : defaultHomepageGallery,
      entryIds,
      entries: selectableEntries,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logApiDatabaseError("homepage-gallery", "admin-read", error);
    return Response.json({ error: "Homepage Gallery settings are temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const input = validateHomepageGallery(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });

  try {
    const existingEntries = await prisma.portfolioEntry.findMany({
      where: { id: { in: input.value.entryIds } },
      select: { id: true, imageRef: true },
    });
    if (existingEntries.length !== input.value.entryIds.length
      || existingEntries.some((entry) => !hasValidHomepageGalleryImage(entry.imageRef))) {
      return Response.json({ error: "Choose only existing gallery entries with valid images." }, { status: 400 });
    }
    const section = await prisma.homepageGallerySection.upsert({
      where: { id: "home" },
      create: { id: "home", ...input.value },
      update: input.value,
    });
    return Response.json({
      section: { eyebrow: section.eyebrow, heading: section.heading, isVisible: section.isVisible },
      entryIds: section.entryIds,
    });
  } catch (error) {
    logApiDatabaseError("homepage-gallery", "admin-write", error);
    return Response.json({ error: "Homepage Gallery settings could not be saved right now." }, { status: 503 });
  }
}
