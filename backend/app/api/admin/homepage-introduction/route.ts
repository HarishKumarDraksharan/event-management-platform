import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { defaultHomepageIntroduction, validateHomepageIntroduction } from "../../../../lib/homepage-introduction";
import { requireSameOrigin } from "../../../../lib/same-origin";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const introduction = await prisma.homepageIntroduction.findUnique({ where: { id: "home" } });
    return Response.json({ introduction: introduction ?? { id: "home", ...defaultHomepageIntroduction } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Homepage introduction is temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const input = validateHomepageIntroduction(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });

  try {
    const introduction = await prisma.homepageIntroduction.upsert({
      where: { id: "home" },
      create: { id: "home", ...input.value },
      update: input.value,
    });
    return Response.json({ introduction });
  } catch {
    return Response.json({ error: "Homepage introduction could not be saved right now." }, { status: 503 });
  }
}
