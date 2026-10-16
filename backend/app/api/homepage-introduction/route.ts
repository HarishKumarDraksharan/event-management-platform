import { prisma } from "../../../lib/prisma";
import { defaultHomepageIntroduction } from "../../../lib/homepage-introduction";

export async function GET() {
  try {
    const introduction = await prisma.homepageIntroduction.findUnique({
      where: { id: "home" },
      select: { eyebrow: true, heading: true, highlight: true, description: true },
    });
    return Response.json({ introduction: introduction ?? defaultHomepageIntroduction }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Homepage introduction is temporarily unavailable." }, { status: 503 });
  }
}
