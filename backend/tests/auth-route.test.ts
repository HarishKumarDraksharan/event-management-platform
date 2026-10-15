import { describe, expect, it } from "vitest";
import { POST } from "../app/api/auth/[...all]/route";
import { GET as adminEnquiries } from "../app/api/admin/enquiries/route";

const origin = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";

describe("authentication and admin route boundaries", () => {
  it("rejects cross-origin sign-in and sign-out requests", async () => {
    const response = await POST(new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST", headers: { origin: "https://attacker.example", "content-type": "application/json" }, body: "{}",
    }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Request origin is not allowed." });
  });

  it("rejects malformed sign-in payloads before calling the auth library", async () => {
    const response = await POST(new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST", headers: { origin, "content-type": "application/json" }, body: "not-json",
    }));
    expect(response.status).toBe(400);
  });

  it("rejects unknown authentication routes", async () => {
    const response = await POST(new Request(`${origin}/api/auth/admin/create-user`, { method: "POST", headers: { origin } }));
    expect(response.status).toBe(404);
  });

  it("does not allow a client supplied role to authorize enquiry access", async () => {
    const response = await adminEnquiries(new Request(`${origin}/api/admin/enquiries?role=admin`));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
  });
});
