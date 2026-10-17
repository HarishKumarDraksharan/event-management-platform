import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/authorization";
import { readJsonObject, validatePortfolioPatch } from "../../../../../lib/catalog";
import { requireSameOrigin } from "../../../../../lib/same-origin";
import { consumeStagedGalleryImage, GalleryImageError, promoteStagedGalleryImage } from "../../../../../lib/gallery-image-storage";
import { lockGalleryImageReferences, scheduleGalleryImageCleanup } from "../../../../../lib/gallery-image-references";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Portfolio entry not found." }, { status: 404 });
  const body = await readJsonObject(request);
  if (!body) return Response.json({ error: "A valid JSON request is required." }, { status: 400 });
  const uploadToken = body.imageUploadToken;
  const expectedImageRef = body.expectedImageRef;
  const patchBody = { ...body };
  delete patchBody.imageUploadToken;
  delete patchBody.expectedImageRef;
  if (uploadToken !== undefined) delete patchBody.imageRef;
  const input = validatePortfolioPatch(patchBody);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  if (uploadToken !== undefined && typeof uploadToken !== "string") {
    return Response.json({ error: "Upload a valid gallery image before saving." }, { status: 400 });
  }
  if (typeof uploadToken === "string" && (typeof expectedImageRef !== "string" || expectedImageRef.length > 200)) {
    return Response.json({ error: "Upload a valid gallery image before saving." }, { status: 400 });
  }
  let managedImage: Awaited<ReturnType<typeof promoteStagedGalleryImage>> | undefined;
  try {
    if (typeof uploadToken !== "string") {
      const imageChanged = "imageRef" in input.value;
      if (expectedImageRef !== undefined && (!imageChanged || typeof expectedImageRef !== "string" || expectedImageRef.length > 200)) {
        return Response.json({ error: "The portfolio image state is invalid." }, { status: 400 });
      }
      if (imageChanged) {
        const replacement = await prisma.$transaction(async (transaction) => {
          await lockGalleryImageReferences(transaction);
          const current = await transaction.portfolioEntry.findUnique({ where: { id }, select: { imageRef: true } });
          if (!current || (typeof expectedImageRef === "string" && current.imageRef !== expectedImageRef)) return null;
          const changed = await transaction.portfolioEntry.updateMany({
            where: { id, imageRef: current.imageRef },
            data: input.value,
          });
          if (changed.count !== 1) return null;
          return { entry: await transaction.portfolioEntry.findUnique({ where: { id } }), oldImageRef: current.imageRef };
        });
        if (!replacement) return Response.json({ error: "This portfolio entry changed while you were editing it. Reload and try again." }, { status: 409 });
        if (replacement.entry && replacement.oldImageRef !== replacement.entry.imageRef) await cleanOldImage(replacement.oldImageRef);
        return replacement.entry
          ? Response.json({ entry: replacement.entry })
          : Response.json({ error: "Portfolio entry not found." }, { status: 404 });
      }
      const entry = await prisma.portfolioEntry.update({ where: { id }, data: input.value });
      return Response.json({ entry });
    }

    if (typeof expectedImageRef !== "string") return Response.json({ error: "The portfolio image state is invalid." }, { status: 400 });
    const replacement = await prisma.$transaction(async (transaction) => {
      await lockGalleryImageReferences(transaction);
      const uploadedImage = await promoteStagedGalleryImage(uploadToken);
      managedImage = uploadedImage;
      const changed = await transaction.portfolioEntry.updateMany({
        where: { id, imageRef: expectedImageRef },
        data: { ...input.value, imageRef: uploadedImage.imageRef },
      });
      if (changed.count !== 1) return { entry: null, uploadedImage };
      return { entry: await transaction.portfolioEntry.findUnique({ where: { id } }), uploadedImage };
    });
    managedImage = replacement.uploadedImage;
    if (!replacement.entry) {
      await cleanUnreferencedNewImage(replacement.uploadedImage.imageRef);
      return Response.json({ error: "This portfolio entry changed while you were editing it. Reload and try again." }, { status: 409 });
    }
    await consumeStagedGalleryImage(uploadToken);
    if (replacement.entry.imageRef !== expectedImageRef) await cleanOldImage(expectedImageRef);
    return Response.json({ entry: replacement.entry });
  } catch (error) {
    if (managedImage) await cleanUnreferencedNewImage(managedImage.imageRef);
    if (error instanceof GalleryImageError) return Response.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return Response.json({ error: "Portfolio entry not found." }, { status: 404 });
    }
    const prismaError = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string";
    if (prismaError) {
      const meta = "meta" in error && typeof error.meta === "object" && error.meta !== null ? error.meta : null;
      const safeMeta = meta ? Object.fromEntries(
        Object.entries(meta).filter(([key]) => ["modelName", "target", "field_name", "constraint"].includes(key))
          .map(([key, value]) => [key, typeof value === "string" || typeof value === "number" || typeof value === "boolean" || Array.isArray(value) ? value : undefined])
          .filter(([, value]) => value !== undefined),
      ) : null;
      const message = "message" in error && typeof error.message === "string"
        ? error.message
          .replace(/(password|secret|token|authorization|cookie|credential)\s*[:=]\s*("[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1=[REDACTED]")
          .replace(/(postgres(?:ql)?:\/\/)[^@\s]+@/gi, "$1[REDACTED]@")
          .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
          .replace(/data:image\/[^,\s]+,[^\s]+/gi, "[IMAGE_DATA_REDACTED]")
          .replace(/\{[^{}]*\}/g, "[DETAILS_REDACTED]")
          .slice(0, 1000)
        : "";
      console.error("[gallery-image] portfolio update failed", { operation: "replace", errorName: error instanceof Error ? error.name : "UnknownError", code: error.code, meta: safeMeta, message });
    } else {
      console.error("[gallery-image] portfolio update failed", { operation: "replace", errorName: error instanceof Error ? error.name : "UnknownError" });
    }
    return Response.json({ error: "Portfolio entry could not be updated right now." }, { status: 503 });
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

async function cleanOldImage(imageRef: string) {
  try {
    await scheduleGalleryImageCleanup(imageRef);
  } catch (error) {
    console.error("[gallery-image] old image cleanup failed", {
      operation: "remove-unreferenced-old-image",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
