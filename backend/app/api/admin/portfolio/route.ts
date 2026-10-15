import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject, validatePortfolioInput } from "../../../../lib/catalog";
import { requireSameOrigin } from "../../../../lib/same-origin";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const entries = await prisma.portfolioEntry.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    return Response.json({ entries });
  } catch {
    return Response.json({ error: "Portfolio entries are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const body = await readJsonObject(request);
  const input = validatePortfolioInput(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  try {
    const entry = await prisma.portfolioEntry.create({ data: { ...input.value, isSample: false, isPublished: false } });
    return Response.json({ entry }, { status: 201 });
  } catch {
    return Response.json({ error: "Portfolio entry could not be saved right now." }, { status: 503 });
  }
}
