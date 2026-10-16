import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { validateHeroSlideInput } from "../../../../lib/hero-slides";
import { requireSameOrigin } from "../../../../lib/same-origin";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const slides = await prisma.heroSlide.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }] });
    return Response.json({ slides });
  } catch {
    return Response.json({ error: "Homepage slides are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const body = await readJsonObject(request);
  const input = validateHeroSlideInput(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  try {
    const slide = await prisma.heroSlide.create({ data: input.value });
    return Response.json({ slide }, { status: 201 });
  } catch {
    return Response.json({ error: "Homepage slide could not be saved right now." }, { status: 503 });
  }
}
