import { prisma } from "../../../../lib/prisma";
import { requireAdmin } from "../../../../lib/authorization";
import { readJsonObject, validateServiceInput } from "../../../../lib/catalog";
import { requireSameOrigin } from "../../../../lib/same-origin";

export async function GET(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const services = await prisma.service.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
    return Response.json({ services });
  } catch {
    return Response.json({ error: "Services are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const body = await readJsonObject(request);
  const input = validateServiceInput(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  try {
    const service = await prisma.service.create({ data: input.value });
    return Response.json({ service }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return Response.json({ error: "A service with that slug already exists." }, { status: 409 });
    }
    return Response.json({ error: "Service could not be saved right now." }, { status: 503 });
  }
}
