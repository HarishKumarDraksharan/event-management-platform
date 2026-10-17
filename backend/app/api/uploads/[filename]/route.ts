import { readManagedGalleryImage } from "../../../../lib/gallery-image-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  try {
    const image = await readManagedGalleryImage(filename);
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[gallery-image] public image read failed", { operation: "read-managed", errorName: error instanceof Error ? error.name : "UnknownError" });
    return new Response(null, { status: 503 });
  }
}
