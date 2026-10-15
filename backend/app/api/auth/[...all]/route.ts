import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../lib/auth";

const authHandler = toNextJsHandler(auth);
const allowedRoutes = new Set([
  "GET /api/auth/get-session",
  "POST /api/auth/sign-in/email",
  "POST /api/auth/sign-out",
]);
const maxBodyBytes = 16 * 1024;
const configuredOrigin = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : "";

function routeIsAllowed(request: Request) {
  return allowedRoutes.has(`${request.method} ${new URL(request.url).pathname}`);
}

function notFound() {
  return Response.json({ error: "Not found." }, { status: 404 });
}

export function GET(request: Request) {
  return routeIsAllowed(request) ? authHandler.GET(request) : notFound();
}

async function post(request: Request) {
  if (!routeIsAllowed(request)) return notFound();

  const origin = request.headers.get("origin");
  if (!origin || origin !== configuredOrigin) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > maxBodyBytes) {
    return Response.json({ error: "Request body is too large." }, { status: 413 });
  }

  if (new URL(request.url).pathname === "/api/auth/sign-in/email") {
    let body: unknown;
    try {
      const raw = await request.clone().text();
      if (new TextEncoder().encode(raw).byteLength > maxBodyBytes) {
        return Response.json({ error: "Request body is too large." }, { status: 413 });
      }
      body = JSON.parse(raw);
    } catch {
      return Response.json({ error: "A valid email and password are required." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "A valid email and password are required." }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.email !== "string" || typeof input.password !== "string") {
      return Response.json({ error: "A valid email and password are required." }, { status: 400 });
    }
    const email = input.email.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.password.length > 128 || input.password.length < 14) {
      return Response.json({ error: "A valid email and password are required." }, { status: 400 });
    }

    const headers = new Headers(request.headers);
    headers.delete("content-length");
    const normalizedRequest = new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...input, email }),
    });
    return authHandler.POST(normalizedRequest);
  }

  return authHandler.POST(request);
}

export const POST = post;
