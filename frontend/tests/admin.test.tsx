import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSignInForm } from "../components/admin-sign-in-form";
import { AdminSignOutButton } from "../components/admin-sign-out-button";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("administrator sign-in", () => {
  it("posts credentials to the same-origin backend and uses a generic failure message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSignInForm />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "admin@example.org" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "a-long-test-password-42" } });
    fireEvent.submit(screen.getByRole("button", { name: /sign in/i }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Check your details"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-in/email", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
    expect(fetchMock.mock.calls[0][1].body).toContain("admin@example.org");
  });
});

describe("administrator sign-out", () => {
  it("posts JSON with same-origin cookies and redirects after successful session revocation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminSignOutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/admin/sign-in"));
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/sign-out", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(router.refresh).toHaveBeenCalledOnce();
  });
});
