import { requireAdmin } from "../../../../../lib/authorization";
import { requireSameOrigin } from "../../../../../lib/same-origin";
import { GalleryImageError, maxGalleryImageSizeBytes, removeExpiredStagedGalleryImages, stageGalleryImage } from "../../../../../lib/gallery-image-storage";
import { retryGalleryImageCleanup } from "../../../../../lib/gallery-image-references";

const multipartOverheadLimit = 256 * 1024;

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    return Response.json({}, {
      headers: {
        "Cache-Control": "no-store",
        "X-Max-Gallery-Image-Size-Bytes": String(maxGalleryImageSizeBytes()),
      },
    });
  } catch (error) {
    console.error("[gallery-image] upload configuration unavailable", {
      operation: "read-upload-limit",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Image upload is temporarily unavailable." }, { status: 503 });
  }
}

async function readLimitedBody(request: Request, maxBytes: number) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) throw new GalleryImageError("The image exceeds the upload size limit.", 413);
  if (!request.body) throw new GalleryImageError("Choose an image to upload.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    size += result.value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new GalleryImageError("The image exceeds the upload size limit.", 413);
    }
    chunks.push(result.value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), size);
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "multipart/form-data") return Response.json({ error: "Choose an image to upload." }, { status: 400 });

  try {
    const maxBytes = maxGalleryImageSizeBytes();
    const bytes = await readLimitedBody(request, maxBytes + multipartOverheadLimit);
    let data: FormData;
    try {
      data = await new Request(request.url, { method: "POST", headers: request.headers, body: bytes }).formData();
    } catch {
      return Response.json({ error: "Choose one valid image file to upload." }, { status: 400 });
    }
    const files = data.getAll("file");
    if (files.length !== 1 || !(files[0] instanceof File)) {
      return Response.json({ error: "Choose one image file to upload." }, { status: 400 });
    }
    const file = files[0];
    if (file.size > maxBytes) return Response.json({ error: "The image exceeds the upload size limit." }, { status: 413 });
    await retryGalleryImageCleanup();
    await removeExpiredStagedGalleryImages();
    const uploaded = await stageGalleryImage(new Uint8Array(await file.arrayBuffer()));
    return Response.json(uploaded, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof GalleryImageError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[gallery-image] upload failed", { operation: "stage", errorName: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "The image could not be uploaded right now." }, { status: 503 });
  }
}
