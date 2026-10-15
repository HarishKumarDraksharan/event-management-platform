import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSignInForm } from "../components/admin-sign-in-form";
import { AdminSignOutButton } from "../components/admin-sign-out-button";
import { AdminNavigation } from "../components/admin-navigation";
import { AdminServiceManager } from "../components/admin-service-manager";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("separate administrator navigation", () => {
  it("provides its own branded management navigation and sign-out control", () => {
    render(<AdminNavigation />);
    expect(screen.getByRole("link", { name: /TSG EVENTS ADMIN/i }).getAttribute("href")).toBe("/admin");
    const navigation = screen.getByRole("navigation", { name: "Admin navigation" });
    for (const label of ["Dashboard", "Enquiries", "Services", "Gallery / Portfolio"]) expect(within(navigation).getByRole("link", { name: label })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(2);
  });
});

describe("service editor field labels", () => {
  it("uses unique IDs for the create form and every service editor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ services: [
        { id: "service-one", slug: "weddings", title: "Weddings", kicker: "Kicker one", description: "Description one", detail: "Detail one", isActive: true, sortOrder: 1 },
        { id: "service-two", slug: "corporate", title: "Corporate", kicker: "Kicker two", description: "Description two", detail: "Detail two", isActive: true, sortOrder: 2 },
      ] }),
    }));

    render(<AdminServiceManager />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Corporate" })).toBeTruthy());

    const controls = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[id], textarea[id]")];
    const ids = controls.map((control) => control.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const control of controls) {
      expect(document.querySelector(`label[for="${control.id}"]`)).toBeTruthy();
    }
  });
});

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
