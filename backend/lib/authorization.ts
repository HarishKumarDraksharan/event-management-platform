import { auth } from "./auth";

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
};

export type AuthorizationResult =
  | { ok: true; admin: AdminSession }
  | { ok: false; response: Response };

export async function requireAdmin(request: Request): Promise<AuthorizationResult> {
  let session;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
      query: { disableCookieCache: true },
    });
  } catch {
    return {
      ok: false,
      response: Response.json({ error: "Authentication is temporarily unavailable." }, { status: 503 }),
    };
  }

  if (!session) {
    return { ok: false, response: Response.json({ error: "Authentication required." }, { status: 401 }) };
  }
  if (session.user.role !== "admin") {
    return { ok: false, response: Response.json({ error: "Administrator access required." }, { status: 403 }) };
  }

  return {
    ok: true,
    admin: { userId: session.user.id, email: session.user.email, name: session.user.name },
  };
}
