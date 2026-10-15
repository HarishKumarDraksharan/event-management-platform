import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const entries = await prisma.portfolioEntry.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, description: true, imageRef: true, altText: true, isSample: true },
    });
    return Response.json({ entries }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Portfolio entries are temporarily unavailable." }, { status: 503 });
  }
}
