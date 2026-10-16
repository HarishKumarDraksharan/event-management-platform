import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject } from "../../../../lib/catalog";
import { defaultAboutUs, validateAboutUs } from "../../../../lib/about-us";
import { requireSameOrigin } from "../../../../lib/same-origin";
import { logAboutUsApiError } from "../../../../lib/about-us-api-logging";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const aboutUs = await prisma.aboutUsSection.findUnique({ where: { id: "home" } });
    return Response.json({ aboutUs: aboutUs ?? { id: "home", ...defaultAboutUs } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logAboutUsApiError("admin-read", error);
    return Response.json({ error: "About Us content is temporarily unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJsonObject(request);
  const input = validateAboutUs(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });

  try {
    const aboutUs = await prisma.aboutUsSection.upsert({
      where: { id: "home" },
      create: { id: "home", ...input.value },
      update: input.value,
    });
    return Response.json({ aboutUs });
  } catch (error) {
    logAboutUsApiError("admin-write", error);
    return Response.json({ error: "About Us content could not be saved right now." }, { status: 503 });
  }
}
