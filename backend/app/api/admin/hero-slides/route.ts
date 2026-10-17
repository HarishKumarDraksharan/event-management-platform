import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { validateHeroSlideInput } from "../../../../lib/hero-slides";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { consumeStagedGalleryImage, GalleryImageError, promoteStagedGalleryImage } from "../../../../lib/gallery-image-storage";
import { lockGalleryImageReferences, scheduleGalleryImageCleanup } from "../../../../lib/gallery-image-references";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const slides = await prisma.heroSlide.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
    return Response.json({ slides });
  } catch {
    return Response.json({ error: "Homepage slides are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const body = await readJsonObject(request);
  const uploadToken = body?.imageUploadToken;
  const inputBody = body ? { ...body } : null;
  if (inputBody) {
    delete inputBody.imageUploadToken;
    delete inputBody.expectedImageRef;
    if (uploadToken !== undefined) inputBody.imageRef = "/images/gathering-study.svg";
  }
  const input = validateHeroSlideInput(inputBody);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  if (uploadToken !== undefined && typeof uploadToken !== "string") return Response.json({ error: "Upload a valid slide image before saving." }, { status: 400 });
  let managedImage: Awaited<ReturnType<typeof promoteStagedGalleryImage>> | undefined;
  try {
    const slide = await prisma.$transaction(async (transaction) => {
      await lockGalleryImageReferences(transaction);
      if (typeof uploadToken === "string") {
        managedImage = await promoteStagedGalleryImage(uploadToken);
        return transaction.heroSlide.create({ data: { ...input.value, imageRef: managedImage.imageRef } });
      }
      return transaction.heroSlide.create({ data: input.value });
    });
    if (typeof uploadToken === "string") await consumeStagedGalleryImage(uploadToken);
    return Response.json({ slide }, { status: 201 });
  } catch (error) {
    if (managedImage) await cleanupImage(managedImage.imageRef, "remove-unreferenced-new-slide-image");
    if (error instanceof GalleryImageError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Homepage slide could not be saved right now." }, { status: 503 });
  }
}

async function cleanupImage(imageRef: string, operation: string) {
  try {
    await scheduleGalleryImageCleanup(imageRef);
  } catch (error) {
    console.error("[gallery-image] slide image cleanup failed", {
      operation,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
