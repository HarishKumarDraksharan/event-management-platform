import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { defaultAboutUs, validateAboutUs } from "../../../../lib/about-us";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { logAboutUsApiError } from "../../../../lib/about-us-api-logging";
import { consumeStagedGalleryImage, GalleryImageError, promoteStagedGalleryImage } from "../../../../lib/gallery-image-storage";
import { lockGalleryImageReferences, scheduleGalleryImageCleanup } from "../../../../lib/gallery-image-references";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const aboutUs = await prisma.aboutUsSection.findUnique({ where: { id: "home" } });
    return Response.json({ aboutUs: aboutUs ?? { id: "home", ...defaultAboutUs } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logAboutUsApiError("admin-read", error);
    return Response.json({ error: "About Us content is temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const uploadToken = body?.imageUploadToken;
  const expectedImageRef = body?.expectedImageRef;
  const inputBody = body ? { ...body } : null;
  if (inputBody) {
    delete inputBody.imageUploadToken;
    delete inputBody.expectedImageRef;
    if (uploadToken !== undefined) inputBody.imageUrl = defaultAboutUs.imageUrl;
  }
  const input = validateAboutUs(inputBody);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  if (uploadToken !== undefined && (typeof uploadToken !== "string" || typeof expectedImageRef !== "string" || expectedImageRef.length > 1000)) {
    return Response.json({ error: "Upload a valid About Us image before saving." }, { status: 400 });
  }
  if (uploadToken === undefined && expectedImageRef !== undefined && (typeof expectedImageRef !== "string" || expectedImageRef.length > 1000)) {
    return Response.json({ error: "The About Us image state is invalid." }, { status: 400 });
  }

  let managedImage: Awaited<ReturnType<typeof promoteStagedGalleryImage>> | undefined;
  try {
    let oldImageRef: string | undefined;
    const aboutUs = await prisma.$transaction(async (transaction) => {
      await lockGalleryImageReferences(transaction);
      const current = await transaction.aboutUsSection.findUnique({ where: { id: "home" }, select: { imageUrl: true } });
      if (typeof expectedImageRef === "string" && (current?.imageUrl ?? "") !== expectedImageRef) return null;
      oldImageRef = current?.imageUrl;
      const image = typeof uploadToken === "string" ? await promoteStagedGalleryImage(uploadToken) : null;
      managedImage = image ?? undefined;
      return transaction.aboutUsSection.upsert({
        where: { id: "home" },
        create: { id: "home", ...input.value, ...(image ? { imageUrl: image.imageRef } : {}) },
        update: { ...input.value, ...(image ? { imageUrl: image.imageRef } : {}) },
      });
    });
    if (!aboutUs) {
      if (managedImage) await cleanupManagedImage(managedImage.imageRef);
      return Response.json({ error: "The About Us image changed while you were editing it. Reload and try again." }, { status: 409 });
    }
    if (typeof uploadToken === "string") await consumeStagedGalleryImage(uploadToken);
    if (oldImageRef && oldImageRef !== aboutUs.imageUrl) await cleanupManagedImage(oldImageRef);
    return Response.json({ aboutUs });
  } catch (error) {
    if (managedImage) await cleanupManagedImage(managedImage.imageRef);
    if (error instanceof GalleryImageError) return Response.json({ error: error.message }, { status: error.status });
    logAboutUsApiError("admin-write", error);
    return Response.json({ error: "About Us content could not be saved right now." }, { status: 503 });
  }
}

async function cleanupManagedImage(imageRef: string) {
  try {
    await scheduleGalleryImageCleanup(imageRef);
  } catch (error) {
    console.error("[gallery-image] About Us image cleanup failed", {
      operation: "cleanup-about-us-image",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
