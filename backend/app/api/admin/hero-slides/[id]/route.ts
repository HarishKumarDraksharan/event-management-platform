import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/authorization";
import { readJsonObject } from "../../../../../lib/catalog";
import { validateHeroSlidePatch } from "../../../../../lib/hero-slides";
import { requireSameOrigin } from "../../../../../lib/same-origin";
import { consumeStagedGalleryImage, GalleryImageError, promoteStagedGalleryImage } from "../../../../../lib/gallery-image-storage";
import { lockGalleryImageReferences, scheduleGalleryImageCleanup } from "../../../../../lib/gallery-image-references";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Homepage slide not found." }, { status: 404 });
  const body = await readJsonObject(request);
  const uploadToken = body?.imageUploadToken;
  const expectedImageRef = body?.expectedImageRef;
  const patchBody = body ? { ...body } : null;
  if (patchBody) {
    delete patchBody.imageUploadToken;
    delete patchBody.expectedImageRef;
    if (uploadToken !== undefined) delete patchBody.imageRef;
  }
  const input = validateHeroSlidePatch(patchBody);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  if ((uploadToken !== undefined && typeof uploadToken !== "string")
    || (expectedImageRef !== undefined && (typeof expectedImageRef !== "string" || expectedImageRef.length > 200))
    || (uploadToken !== undefined && typeof expectedImageRef !== "string")) {
    return Response.json({ error: "Upload a valid slide image before saving." }, { status: 400 });
  }
  let managedImage: Awaited<ReturnType<typeof promoteStagedGalleryImage>> | undefined;
  try {
    let oldImageRef: string | undefined;
    const slide = typeof uploadToken === "string"
      ? await prisma.$transaction(async (transaction) => {
        await lockGalleryImageReferences(transaction);
        const current = await transaction.heroSlide.findUnique({ where: { id }, select: { imageRef: true } });
        if (!current || current.imageRef !== expectedImageRef) return null;
        managedImage = await promoteStagedGalleryImage(uploadToken);
        const changed = await transaction.heroSlide.updateMany({
          where: { id, imageRef: current.imageRef },
          data: { ...input.value, imageRef: managedImage.imageRef },
        });
        if (changed.count !== 1) return null;
        oldImageRef = current.imageRef;
        return transaction.heroSlide.findUnique({ where: { id } });
      })
      : "imageRef" in input.value
        ? await prisma.$transaction(async (transaction) => {
          await lockGalleryImageReferences(transaction);
          const current = await transaction.heroSlide.findUnique({ where: { id }, select: { imageRef: true } });
          if (!current || (typeof expectedImageRef === "string" && current.imageRef !== expectedImageRef)) return null;
          oldImageRef = current.imageRef;
          const changed = await transaction.heroSlide.updateMany({ where: { id, imageRef: current.imageRef }, data: input.value });
          return changed.count === 1 ? transaction.heroSlide.findUnique({ where: { id } }) : null;
        })
        : await prisma.heroSlide.update({ where: { id }, data: input.value });
    if (!slide) {
      if (managedImage) await cleanupImage(managedImage.imageRef, "remove-unreferenced-new-slide-image");
      const exists = await prisma.heroSlide.findUnique({ where: { id }, select: { id: true } });
      return exists
        ? Response.json({ error: "This slide changed while you were editing it. Reload and try again." }, { status: 409 })
        : Response.json({ error: "Homepage slide not found." }, { status: 404 });
    }
    if (typeof uploadToken === "string") await consumeStagedGalleryImage(uploadToken);
    if (oldImageRef && oldImageRef !== slide.imageRef) await cleanupImage(oldImageRef, "remove-unreferenced-old-slide-image");
    return Response.json({ slide });
  } catch (error) {
    if (managedImage) await cleanupImage(managedImage.imageRef, "remove-unreferenced-new-slide-image");
    if (error instanceof GalleryImageError) return Response.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return Response.json({ error: "Homepage slide not found." }, { status: 404 });
    }
    return Response.json({ error: "Homepage slide could not be updated right now." }, { status: 503 });
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
