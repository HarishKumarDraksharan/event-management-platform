import { requireAdmin } from "../../../../../../lib/authorization";
import { requireSameOrigin } from "../../../../../../lib/same-origin";
import { deleteStagedGalleryImage, readStagedGalleryImage } from "../../../../../../lib/gallery-image-storage";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const { token } = await params;
  try {
    const image = await readStagedGalleryImage(token);
    if (!image) return Response.json({ error: "The uploaded image is no longer available." }, { status: 404 });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[gallery-image] staged preview failed", { operation: "read-staged", errorName: error instanceof Error ? error.name : "UnknownError" });
    return Response.json({ error: "The uploaded image is temporarily unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { token } = await params;
  try {
    const deleted = await deleteStagedGalleryImage(token);
    return deleted
      ? Response.json({ deleted: true })
      : Response.json({ error: "The staged image is no longer available." }, { status: 404 });
  } catch {
    return Response.json({ error: "The staged image could not be removed right now." }, { status: 503 });
  }
}
