import { prisma } from "../../../../../lib/prisma";
import { requireAdmin } from "../../../../../lib/authorization";
import { readJsonObject, validateServicePatch } from "../../../../../lib/catalog";
import { requireSameOrigin } from "../../../../../lib/same-origin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authorization = await requireAdmin(request);
  if (!authorization.ok) return authorization.response;
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "Service not found." }, { status: 404 });
  const body = await readJsonObject(request);
  const input = validateServicePatch(body);
  if (!input.ok) return Response.json({ error: body ? input.message : "A valid JSON request is required." }, { status: 400 });
  try {
    const service = await prisma.service.update({ where: { id }, data: input.value });
    return Response.json({ service });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "P2002") return Response.json({ error: "A service with that slug already exists." }, { status: 409 });
      if (error.code === "P2025") return Response.json({ error: "Service not found." }, { status: 404 });
    }
    return Response.json({ error: "Service could not be updated right now." }, { status: 503 });
  }
}
