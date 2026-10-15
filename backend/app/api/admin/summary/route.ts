import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const [enquiries, activeServices, publishedPortfolio] = await Promise.all([
      prisma.enquiry.count(),
      prisma.service.count({ where: { isActive: true } }),
      prisma.portfolioEntry.count({ where: { isPublished: true } }),
    ]);
    return Response.json({ enquiries, activeServices, publishedPortfolio });
  } catch {
    return Response.json({ error: "Dashboard summary is temporarily unavailable." }, { status: 503 });
  }
}
