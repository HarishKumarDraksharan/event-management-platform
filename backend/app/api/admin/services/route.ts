import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject, validateServiceInput } from "../../../../lib/catalog";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { consumeStagedGalleryImage, GalleryImageError, promoteStagedGalleryImage } from "../../../../lib/gallery-image-storage";
import { lockGalleryImageReferences, scheduleGalleryImageCleanup } from "../../../../lib/gallery-image-references";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const services = await prisma.service.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
    return Response.json({ services });
  } catch {
    return Response.json({ error: "Services are temporarily unavailable." }, { status: 503 });
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
  const input = validateServiceInput(inputBody);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  if (uploadToken !== undefined && typeof uploadToken !== "string") return Response.json({ error: "Upload a valid service image before saving." }, { status: 400 });
  let managedImage: Awaited<ReturnType<typeof promoteStagedGalleryImage>> | undefined;
  try {
    const service = await prisma.$transaction(async (transaction) => {
      await lockGalleryImageReferences(transaction);
      if (typeof uploadToken === "string") {
        managedImage = await promoteStagedGalleryImage(uploadToken);
        return transaction.service.create({ data: { ...input.value, imageRef: managedImage.imageRef } });
      }
      return transaction.service.create({ data: input.value });
    });
    if (typeof uploadToken === "string") await consumeStagedGalleryImage(uploadToken);
    return Response.json({ service }, { status: 201 });
  } catch (error) {
    if (managedImage) await cleanupImage(managedImage.imageRef, "remove-unreferenced-new-service-image");
    if (error instanceof GalleryImageError) return Response.json({ error: error.message }, { status: error.status });
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ error: "A service with that slug already exists." }, { status: 409 });
    }
    return Response.json({ error: "Service could not be saved right now." }, { status: 503 });
  }
}

async function cleanupImage(imageRef: string, operation: string) {
  try {
    await scheduleGalleryImageCleanup(imageRef);
  } catch (error) {
    console.error("[gallery-image] service image cleanup failed", {
      operation,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
