import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, title: true, kicker: true, description: true, detail: true, imageRef: true },
    });
    return Response.json({ services }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Services are temporarily unavailable." }, { status: 503 });
  }
}
