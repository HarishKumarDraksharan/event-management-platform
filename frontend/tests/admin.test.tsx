import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSignInForm } from "../components/admin-sign-in-form";
import { AdminSignOutButton } from "../components/admin-sign-out-button";
import { AdminNavigation } from "../components/admin-navigation";
import { AdminServiceManager } from "../components/admin-service-manager";
import { AdminPortfolioManager } from "../components/admin-portfolio-manager";
import { AdminHeroSlideManager } from "../components/admin-hero-slide-manager";
import { AdminHomepageIntroductionManager } from "../components/admin-homepage-introduction-manager";
import AdminDashboard from "../app/(panel)/admin/page";
import AdminHomepagePage from "../app/(panel)/admin/homepage/page";
import AdminAboutUsPage from "../app/(panel)/admin/about-us/page";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn(), refresh: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("separate administrator navigation", () => {
  it("provides its own branded management navigation and sign-out control", () => {
    render(<AdminNavigation />);
    expect(screen.getByRole("link", { name: /TSG EVENTS ADMIN/i }).getAttribute("href")).toBe("/admin");
    const navigation = screen.getByRole("navigation", { name: "Admin navigation" });
    expect([...navigation.querySelectorAll("a")].map((link) => link.textContent)).toEqual(["Dashboard", "Homepage", "About Us", "Services", "Gallery", "Enquiries"]);
    expect([...navigation.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual(["/admin", "/admin/homepage", "/admin/about-us", "/admin/services", "/admin/portfolio", "/admin/enquiries"]);
    const mobileNavigation = screen.getByRole("navigation", { name: "Mobile admin navigation" });
    expect([...mobileNavigation.querySelectorAll("a")].slice(0, 6).map((link) => link.textContent)).toEqual(["Dashboard", "Homepage", "About Us", "Services", "Gallery", "Enquiries"]);
    expect(screen.getAllByRole("button", { name: "Sign out" })).toHaveLength(2);
  });
});

describe("admin content overview", () => {
  it("orders the dashboard cards and keeps the activity counts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enquiries: 2, activeServices: 4, publishedPortfolio: 3 }) }));
    render(await AdminDashboard());
    const cards = screen.getByRole("region", { name: "Dashboard management areas" });
    expect([...cards.querySelectorAll("a")].map((link) => link.getAttribute("href"))).toEqual([
      "/admin/homepage", "/admin/about-us", "/admin/services", "/admin/portfolio", "/admin/enquiries",
    ]);
    expect([...cards.querySelectorAll(".eyebrow")].map((label) => label.textContent)).toEqual([
      "Homepage", "About Us", "Services", "Gallery", "Enquiries",
    ]);
    expect(cards.querySelectorAll("a")).toHaveLength(5);
    expect(within(cards).queryByText("Dashboard overview")).toBeNull();
    expect(within(cards).queryByText("Current overview")).toBeNull();
    expect(screen.getByRole("heading", { name: /Dashboard overview/ })).toBeTruthy();
    expect(screen.getByText("Manage public content and review new enquiries.")).toBeTruthy();
    expect(within(cards).getByText("4")).toBeTruthy();
    expect(within(cards).getByText("3")).toBeTruthy();
    expect(within(cards).getByText("2")).toBeTruthy();
  });

  it("keeps Homepage as a focused list of the implemented sections", () => {
    render(<AdminHomepagePage />);
    const section = screen.getByRole("region", { name: "Homepage Sections" });
    expect(within(section).getByRole("link", { name: /hero carousel/i }).getAttribute("href")).toBe("/admin/hero-slides");
    expect(within(section).getByRole("link", { name: /introduction/i }).getAttribute("href")).toBe("/admin/homepage-introduction");
    expect(section.querySelectorAll("a")).toHaveLength(2);
  });

  it("clearly marks About Us copy static and links to its public page", () => {
    render(<AdminAboutUsPage />);
    expect(screen.getByRole("heading", { name: /public content is currently static/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /view the public about us page/i }).getAttribute("href")).toBe("/about");
  });
});

describe("homepage slide management", () => {
  it("creates, edits, reorders, publishes, and unpublishes slides through same-origin admin APIs", async () => {
    const existing = { id: "slide-one", heading: "Existing slide", description: "An existing sample description.", buttonLabel: "Contact us", destinationUrl: "/contact", imageRef: "/images/gathering-study.svg", isPublished: false, sortOrder: 1 };
    const created = { id: "slide-two", heading: "New slide", description: "A new sample description.", buttonLabel: "Explore", destinationUrl: "/about", imageRef: "/images/table-study.svg", isPublished: false, sortOrder: 2 };
    let stored = existing;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, json: async () => ({ slides: [stored] }) };
      const body = JSON.parse(String(init.body));
      if (init.method === "POST") return { ok: true, json: async () => ({ slide: { ...created, ...body } }) };
      stored = { ...stored, ...body };
      return { ok: true, json: async () => ({ slide: stored }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminHeroSlideManager />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Existing slide/ })).toBeTruthy());

    const existingCard = screen.getByRole("heading", { name: /Existing slide/ }).closest("article")!;
    const existingToggle = within(existingCard).getByRole("button", { name: /Existing slide/ });
    const existingChevron = existingToggle.querySelector(".admin-accordion-chevron")!;
    expect(existingToggle.getAttribute("type")).toBe("button");
    expect(existingToggle.getAttribute("aria-expanded")).toBe("false");
    expect(existingChevron.classList.contains("is-expanded")).toBe(false);
    const existingPanel = document.getElementById(existingToggle.getAttribute("aria-controls")!)!;
    expect(existingPanel.hasAttribute("hidden")).toBe(true);
    fireEvent.click(existingToggle);
    expect(existingToggle.getAttribute("aria-expanded")).toBe("true");
    expect(existingChevron.classList.contains("is-expanded")).toBe(true);
    expect(existingPanel.hasAttribute("hidden")).toBe(false);
    fireEvent.click(existingToggle);
    expect(existingToggle.getAttribute("aria-expanded")).toBe("false");
    expect(existingChevron.classList.contains("is-expanded")).toBe(false);
    expect(existingPanel.hasAttribute("hidden")).toBe(true);

    const createToggle = screen.getByRole("button", { name: /Add a homepage slide/ });
    expect(createToggle.getAttribute("type")).toBe("button");
    expect(createToggle.getAttribute("aria-expanded")).toBe("false");
    const createPanel = document.getElementById(createToggle.getAttribute("aria-controls")!)!;
    expect(createPanel.hasAttribute("hidden")).toBe(true);
    fireEvent.click(createToggle);
    expect(createToggle.getAttribute("aria-expanded")).toBe("true");
    expect(createPanel.hasAttribute("hidden")).toBe(false);

    const createForm = within(createPanel).getByRole("button", { name: "Create slide" }).closest("form")!;
    fireEvent.change(within(createForm).getByLabelText("Heading"), { target: { value: "New slide" } });
    fireEvent.change(within(createForm).getByLabelText("Button label"), { target: { value: "Explore" } });
    fireEvent.change(within(createForm).getByLabelText("Description"), { target: { value: "A new sample description." } });
    fireEvent.change(within(createForm).getByLabelText("Destination URL"), { target: { value: "/about" } });
    fireEvent.change(within(createForm).getByLabelText("Image reference"), { target: { value: "/images/table-study.svg" } });
    fireEvent.change(within(createForm).getByLabelText("Display order"), { target: { value: "2" } });
    fireEvent.submit(createForm);
    await waitFor(() => expect(screen.getByRole("heading", { name: /New slide/ })).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/hero-slides", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
    const newSlideCard = screen.getByRole("heading", { name: /New slide/ }).closest("article")!;
    const newSlideToggle = within(newSlideCard).getByRole("button", { name: /New slide/ });
    expect(newSlideToggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(newSlideToggle.getAttribute("aria-controls")!)?.hasAttribute("hidden")).toBe(true);

    const card = screen.getByRole("heading", { name: /Existing slide/ }).closest("article")!;
    fireEvent.click(existingToggle);
    const editForm = within(card).getByRole("button", { name: "Save changes" }).closest("form")!;
    fireEvent.change(within(editForm).getByLabelText("Heading"), { target: { value: "Edited slide" } });
    fireEvent.change(within(editForm).getByLabelText("Display order"), { target: { value: "4" } });
    fireEvent.submit(editForm);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Edited slide/ })).toBeTruthy());
    expect([...document.querySelectorAll(".admin-managed-card .admin-accordion-title")].map((heading) => heading.textContent)).toEqual(["New slide", "Edited slide"]);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/hero-slides/slide-one", expect.objectContaining({ method: "PATCH", credentials: "same-origin" }));

    const editedCard = screen.getByRole("heading", { name: /Edited slide/ }).closest("article")!;
    fireEvent.click(within(editedCard).getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByText("Homepage slide published.")).toBeTruthy());
    fireEvent.click(within(editedCard).getByRole("button", { name: "Unpublish" }));
    await waitFor(() => expect(screen.getByText("Homepage slide unpublished.")).toBeTruthy());
  });
});

describe("homepage introduction management", () => {
  it("loads and saves the introduction using the same-origin admin API", async () => {
    const initial = { eyebrow: "EVENT PLANNING", heading: "A thoughtful heading", highlight: "with emphasis.", description: "An introduction paragraph for the public homepage." };
    let saved = initial;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, json: async () => ({ introduction: saved }) };
      saved = JSON.parse(String(init.body));
      return { ok: true, json: async () => ({ introduction: saved }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminHomepageIntroductionManager />);
    await waitFor(() => expect(screen.getByLabelText("Heading")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Eyebrow"), { target: { value: "A NEW EYEBROW" } });
    fireEvent.change(screen.getByLabelText("Heading"), { target: { value: "An edited heading" } });
    fireEvent.change(screen.getByLabelText("Highlighted heading"), { target: { value: "still emphasized." } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Updated introduction copy saved for the public homepage." } });
    fireEvent.submit(screen.getByRole("button", { name: "Save introduction" }).closest("form")!);

    await waitFor(() => expect(screen.getByText("Homepage introduction saved.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/homepage-introduction", expect.objectContaining({ method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" } }));
    expect(saved).toEqual({ eyebrow: "A NEW EYEBROW", heading: "An edited heading", highlight: "still emphasized.", description: "Updated introduction copy saved for the public homepage." });
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
    await waitFor(() => expect(screen.getByRole("heading", { name: /Corporate/ })).toBeTruthy());

    const controls = [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[id], textarea[id]")];
    const ids = controls.map((control) => control.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const control of controls) {
      expect(document.querySelector(`label[for="${control.id}"]`)).toBeTruthy();
    }
  });

  it("keeps service create, edit, and activation actions available in collapsed sections", async () => {
    const existing = { id: "service-one", slug: "weddings", title: "Weddings", kicker: "Kicker", description: "A service description", detail: "Service details", isActive: true, sortOrder: 1 };
    let saved = existing;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, json: async () => ({ services: [saved] }) };
      const body = JSON.parse(String(init.body));
      if (init.method === "POST") return { ok: true, json: async () => ({ service: { ...body, id: "service-two", isActive: true } }) };
      saved = { ...saved, ...body };
      return { ok: true, json: async () => ({ service: saved }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminServiceManager />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Weddings/ })).toBeTruthy());

    const addToggle = screen.getByRole("button", { name: /Add a service/ });
    expect(addToggle.getAttribute("type")).toBe("button");
    expect(addToggle.getAttribute("aria-expanded")).toBe("false");
    const addPanel = document.getElementById(addToggle.getAttribute("aria-controls")!)!;
    expect(addPanel.hasAttribute("hidden")).toBe(true);
    fireEvent.click(addToggle);
    expect(addPanel.hasAttribute("hidden")).toBe(false);
    const createForm = within(addPanel).getByRole("button", { name: "Create service" }).closest("form")!;
    fireEvent.change(within(createForm).getByLabelText("URL slug"), { target: { value: "private-events" } });
    fireEvent.change(within(createForm).getByLabelText("Title"), { target: { value: "Private events" } });
    fireEvent.change(within(createForm).getByLabelText("Kicker"), { target: { value: "A kicker" } });
    fireEvent.change(within(createForm).getByLabelText("Description"), { target: { value: "A description" } });
    fireEvent.change(within(createForm).getByLabelText("Details"), { target: { value: "Useful service details" } });
    fireEvent.submit(createForm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/services", expect.objectContaining({ method: "POST" })));

    const card = screen.getByRole("heading", { name: /Weddings/ }).closest("article")!;
    const editToggle = within(card).getByRole("button", { name: /Weddings/ });
    expect(editToggle.getAttribute("type")).toBe("button");
    expect(editToggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(editToggle.getAttribute("aria-controls")!)?.hasAttribute("hidden")).toBe(true);
    fireEvent.click(editToggle);
    expect(document.getElementById(editToggle.getAttribute("aria-controls")!)?.hasAttribute("hidden")).toBe(false);
    const editForm = within(card).getByRole("button", { name: "Save changes" }).closest("form")!;
    fireEvent.change(within(editForm).getByLabelText("Title"), { target: { value: "Wedding planning" } });
    fireEvent.submit(editForm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/services/service-one", expect.objectContaining({ method: "PATCH" })));
    fireEvent.click(within(card).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(screen.getByText("Service deactivated.")).toBeTruthy());
  });
});

describe("gallery management accordion", () => {
  it("keeps gallery create, edit, and publish controls available", async () => {
    const existing = { id: "entry-one", title: "Sample event", description: "A sample event description", imageRef: "/images/gathering-study.svg", altText: "A sample table setting", isSample: true, isPublished: false, sortOrder: 1 };
    let saved = existing;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, json: async () => ({ entries: [saved] }) };
      const body = JSON.parse(String(init.body));
      if (init.method === "POST") return { ok: true, json: async () => ({ entry: { ...body, id: "entry-two", isSample: false, isPublished: false } }) };
      saved = { ...saved, ...body };
      return { ok: true, json: async () => ({ entry: saved }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPortfolioManager />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Sample event/ })).toBeTruthy());

    const addToggle = screen.getByRole("button", { name: /Add a gallery entry/ });
    expect(addToggle.getAttribute("type")).toBe("button");
    expect(addToggle.getAttribute("aria-expanded")).toBe("false");
    const addPanel = document.getElementById(addToggle.getAttribute("aria-controls")!)!;
    expect(addPanel.hasAttribute("hidden")).toBe(true);
    fireEvent.click(addToggle);
    expect(addPanel.hasAttribute("hidden")).toBe(false);
    const createForm = within(addPanel).getByRole("button", { name: "Create entry" }).closest("form")!;
    fireEvent.change(within(createForm).getByLabelText("Title"), { target: { value: "New event" } });
    fireEvent.change(within(createForm).getByLabelText("Description"), { target: { value: "A new gallery description" } });
    fireEvent.change(within(createForm).getByLabelText("Accessible image description"), { target: { value: "A detailed image description" } });
    fireEvent.submit(createForm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/portfolio", expect.objectContaining({ method: "POST" })));

    const card = screen.getByRole("heading", { name: /Sample event/ }).closest("article")!;
    const editToggle = within(card).getByRole("button", { name: /Sample event/ });
    expect(editToggle.getAttribute("type")).toBe("button");
    expect(editToggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(editToggle.getAttribute("aria-controls")!)?.hasAttribute("hidden")).toBe(true);
    fireEvent.click(editToggle);
    expect(document.getElementById(editToggle.getAttribute("aria-controls")!)?.hasAttribute("hidden")).toBe(false);
    const editForm = within(card).getByRole("button", { name: "Save changes" }).closest("form")!;
    fireEvent.change(within(editForm).getByLabelText("Title"), { target: { value: "Edited event" } });
    fireEvent.submit(editForm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/portfolio/entry-one", expect.objectContaining({ method: "PATCH" })));
    fireEvent.click(within(card).getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(screen.getByText("Portfolio entry published.")).toBeTruthy());
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
