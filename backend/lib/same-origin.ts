const configuredOrigin = process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : "";

export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin || origin !== configuredOrigin) {
    return Response.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  return null;
}
