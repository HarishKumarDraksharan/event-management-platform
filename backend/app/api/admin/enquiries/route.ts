import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";

const pageSize = 20;
const maxPage = 500;

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;

  const rawPage = new URL(request.url).searchParams.get("page") ?? "1";
  if (!/^\d{1,3}$/.test(rawPage)) {
    return Response.json({ error: "Invalid page." }, { status: 400 });
  }
  const page = Number(rawPage);
  if (page < 1 || page > maxPage) {
    return Response.json({ error: "Invalid page." }, { status: 400 });
  }

  try {
    const [enquiries, total] = await Promise.all([
      prisma.enquiry.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          eventType: true,
          eventDate: true,
          guestCount: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.enquiry.count(),
    ]);
    return Response.json({ enquiries, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch {
    return Response.json({ error: "Enquiries are temporarily unavailable." }, { status: 503 });
  }
}
