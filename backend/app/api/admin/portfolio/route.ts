import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject, validatePortfolioInput } from "../../../../lib/catalog";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { consumeStagedGalleryImage, GalleryImageError, maxGalleryImageSizeBytes, promoteStagedGalleryImage } from "../../../../lib/gallery-image-storage";
import { lockGalleryImageReferences, scheduleGalleryImageCleanup } from "../../../../lib/gallery-image-references";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const entries = await prisma.portfolioEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    return Response.json({ entries }, { headers: { "X-Max-Gallery-Image-Size-Bytes": String(maxGalleryImageSizeBytes()) } });
  } catch {
    return Response.json({ error: "Portfolio entries are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const body = await readJsonObject(request);
  const uploadToken = body?.imageUploadToken;
  const input = validatePortfolioInput(uploadToken === undefined ? body : { ...body, imageRef: "/images/gathering-study.svg" });
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  if (uploadToken !== undefined && typeof uploadToken !== "string") {
    return Response.json({ error: "Upload a valid gallery image before saving." }, { status: 400 });
  }

  let managedImage: Awaited<ReturnType<typeof promoteStagedGalleryImage>> | undefined;
  try {
    const entry = typeof uploadToken === "string"
      ? await prisma.$transaction(async (transaction) => {
        await lockGalleryImageReferences(transaction);
        managedImage = await promoteStagedGalleryImage(uploadToken);
        return transaction.portfolioEntry.create({
          data: { ...input.value, imageRef: managedImage.imageRef, isSample: false, isPublished: false },
        });
      })
      : await prisma.portfolioEntry.create({ data: { ...input.value, isSample: false, isPublished: false } });
    if (typeof uploadToken === "string") await consumeStagedGalleryImage(uploadToken);
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    if (managedImage) await cleanUnreferencedNewImage(managedImage.imageRef);
    if (error instanceof GalleryImageError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[gallery-image] portfolio create failed", { operation: "create", errorName: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "Portfolio entry could not be saved right now." }, { status: 503 });
  }
}

async function cleanUnreferencedNewImage(imageRef: string) {
  try {
    await scheduleGalleryImageCleanup(imageRef);
  } catch (error) {
    console.error("[gallery-image] new image cleanup failed", {
      operation: "remove-unreferenced-new-image",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
