import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const slides = await prisma.heroSlide.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { id: true, heading: true, description: true, buttonLabel: true, destinationUrl: true, imageRef: true, sortOrder: true },
    });
    return Response.json({ slides }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Homepage slides are temporarily unavailable." }, { status: 503 });
  }
}
