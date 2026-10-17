import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminSignInForm } from "../components/admin-sign-in-form";
import { AdminSignOutButton } from "../components/admin-sign-out-button";
import { AdminNavigation } from "../components/admin-navigation";
import { AdminServiceManager } from "../components/admin-service-manager";
import { AdminPortfolioManager } from "../components/admin-portfolio-manager";
import { AdminHeroSlideManager } from "../components/admin-hero-slide-manager";
import { AdminHomepageIntroductionManager } from "../components/admin-homepage-introduction-manager";
import { AdminHomepageServicesManager } from "../components/admin-homepage-services-manager";
import { AdminHomepageWhyChooseUsManager } from "../components/admin-homepage-why-choose-us-manager";
import { AdminHomepageGalleryManager } from "../components/admin-homepage-gallery-manager";
import AdminDashboard from "../app/(panel)/admin/page";
import AdminHomepagePage from "../app/(panel)/admin/homepage/page";
import AdminAboutUsPage from "../app/(panel)/admin/about-us/page";
import AdminHomepageWhyChooseUsPage from "../app/(panel)/admin/homepage-why-choose-us/page";
import AdminHomepageGalleryPage from "../app/(panel)/admin/homepage-gallery/page";

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
    expect(within(section).getByRole("link", { name: /about us/i }).getAttribute("href")).toBe("/admin/about-us");
    expect(within(section).getByRole("link", { name: /services/i }).getAttribute("href")).toBe("/admin/homepage-services");
    expect(within(section).getByRole("link", { name: /why choose us/i }).getAttribute("href")).toBe("/admin/homepage-why-choose-us");
    expect(within(section).getByRole("link", { name: /our gallery/i }).getAttribute("href")).toBe("/admin/homepage-gallery");
    expect(section.querySelectorAll("a")).toHaveLength(5);
  });

  it("selects and orders published, unpublished, and sample gallery entries", async () => {
    const entries = [
      { id: "00000000-0000-4000-8000-000000000001", title: "First celebration", imageRef: "/images/gathering-study.svg", altText: "A table set for a celebration", isPublished: true, isSample: false },
      { id: "00000000-0000-4000-8000-000000000002", title: "Second celebration", imageRef: "/images/table-study.svg", altText: "An event table", isPublished: true, isSample: false },
      { id: "00000000-0000-4000-8000-000000000003", title: "Unpublished moment", imageRef: "/images/colour-study.svg", altText: "A color study", isPublished: false, isSample: false },
      { id: "00000000-0000-4000-8000-000000000004", title: "Sample moment", imageRef: "/images/gathering-study.svg", altText: "A sample celebration", isPublished: true, isSample: true },
    ];
    const initialSection = { eyebrow: "Moments We've Created", heading: "Showcasing Our Events & Memorable Moments", isVisible: true };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, json: async () => ({ section: initialSection, entryIds: [entries[0].id], entries }) };
      const body = JSON.parse(String(init.body));
      return { ok: true, json: async () => ({ section: { eyebrow: body.eyebrow, heading: body.heading, isVisible: body.isVisible }, entryIds: body.entryIds }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminHomepageGalleryPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Edit homepage Gallery section" })).toBeTruthy());
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Show First celebration on homepage" }).checked).toBe(true);
    const unpublishedCheckbox = screen.getByRole<HTMLInputElement>("checkbox", { name: "Show Unpublished moment on homepage" });
    const sampleCheckbox = screen.getByRole<HTMLInputElement>("checkbox", { name: "Show Sample moment on homepage" });
    expect(unpublishedCheckbox.disabled).toBe(false);
    expect(sampleCheckbox.disabled).toBe(false);
    expect(screen.getByText(/Unpublished · selected, but hidden from visitors until published/)).toBeTruthy();
    expect(screen.getByText(/Sample artwork · excluded from public gallery/)).toBeTruthy();
    fireEvent.click(screen.getByRole("checkbox", { name: "Show Second celebration on homepage" }));
    fireEvent.click(screen.getByRole("button", { name: "Move Second celebration up" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove First celebration from homepage" }));
    fireEvent.click(unpublishedCheckbox);
    fireEvent.click(sampleCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "Move Sample moment up" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Show Gallery section on the homepage" }));
    fireEvent.change(screen.getByLabelText("Section heading"), { target: { value: "Our most memorable moments" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Gallery section" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Homepage Gallery section saved."));
    const saved = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body)) as { eyebrow: string; heading: string; isVisible: boolean; entryIds: string[] };
    expect(saved.heading).toBe("Our most memorable moments");
    expect(saved.isVisible).toBe(false);
    expect(saved.entryIds).toEqual([entries[1].id, entries[3].id, entries[2].id]);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/homepage-gallery", expect.objectContaining({
      method: "PUT",
      credentials: "same-origin",
    }));
  });

  it("shows an accessible load error in the homepage Gallery editor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Gallery settings are unavailable." }) }));
    render(<AdminHomepageGalleryManager />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Gallery settings are unavailable.")).toBeTruthy();
  });

  it("edits, adds, removes, reorders, and saves Why Choose Us features", async () => {
    const initial = {
      heading: "Why Choose Chennai Events Management Company?",
      supportingText: "A supporting story for every celebration.",
      isVisible: true,
      featureCards: [
        { id: "friendly-team", title: "Friendly Team", description: "We make every client feel welcome.", icon: "users" },
        { id: "perfect-venues", title: "Perfect Venues", description: "The right setting for every occasion.", icon: "mapPin" },
      ],
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, json: async () => ({ section: initial }) };
      const body = JSON.parse(String(init.body));
      return { ok: true, json: async () => ({ section: body }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<AdminHomepageWhyChooseUsPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Edit homepage Why Choose Us section" })).toBeTruthy());
    expect(screen.getAllByRole("button", { name: /FEATURE \d+/ }).every((button) => button.getAttribute("aria-expanded") === "false")).toBe(true);
    expect([...container.querySelectorAll(".admin-home-why-card-editor")].every((editor) => editor.hasAttribute("hidden"))).toBe(true);
    fireEvent.change(screen.getByLabelText("Section heading"), { target: { value: "Why TSG Events" } });
    fireEvent.click(screen.getByRole("button", { name: "Add feature" }));
    const newEditor = container.querySelector<HTMLElement>(".admin-home-why-card-editor:not([hidden])")!;
    fireEvent.change(within(newEditor).getByLabelText("Title"), { target: { value: "Creative ideas" } });
    fireEvent.change(within(newEditor).getByLabelText("Description"), { target: { value: "Fresh concepts for every event." } });
    fireEvent.change(within(newEditor).getByLabelText("Icon"), { target: { value: "lightbulb" } });
    fireEvent.click(screen.getByRole("button", { name: "Move Creative ideas up" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Perfect Venues" }));
    fireEvent.submit(screen.getByRole("button", { name: "Save Why Choose Us section" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Why Choose Us section saved."));
    const saved = JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body)) as typeof initial;
    expect(saved.heading).toBe("Why TSG Events");
    expect(saved.featureCards.map((feature) => feature.title)).toEqual(["Friendly Team", "Creative ideas"]);
    expect(saved.featureCards[1].icon).toBe("lightbulb");
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/homepage-why-choose-us", expect.objectContaining({
      method: "PUT",
      credentials: "same-origin",
    }));
  });

  it("expands a collapsed feature, edits its fields, and collapses it again accessibly", async () => {
    const initial = {
      heading: "Why Choose Chennai Events Management Company?",
      supportingText: "Thoughtful event planning starts with a great team.",
      isVisible: true,
      featureCards: [
        { id: "friendly-team", title: "Friendly Team", description: "We make every client feel welcome.", icon: "users" },
        { id: "perfect-venues", title: "Perfect Venues", description: "The right setting for every occasion.", icon: "mapPin" },
      ],
    };
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => ({
      ok: true,
      json: async () => ({ section: init?.method ? JSON.parse(String(init.body)) : initial }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<AdminHomepageWhyChooseUsManager />);
    const header = await screen.findByRole("button", { name: /FEATURE 01 Friendly Team/ });
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect([...container.querySelectorAll(".admin-home-why-card-editor")].every((editor) => editor.hasAttribute("hidden"))).toBe(true);
    expect(screen.getByRole("button", { name: "Move Friendly Team up" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Move Friendly Team down" }).hasAttribute("disabled")).toBe(false);

    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("true");
    expect(header.getAttribute("aria-controls")).toBeTruthy();
    const editor = container.querySelector<HTMLElement>(`#${header.getAttribute("aria-controls")}`)!;
    fireEvent.change(within(editor).getByLabelText("Title"), { target: { value: "A welcoming team" } });
    fireEvent.change(within(editor).getByLabelText("Description"), { target: { value: "Warm, helpful people from first call to last guest." } });
    fireEvent.change(within(editor).getByLabelText("Icon"), { target: { value: "heart" } });
    expect(header.textContent).toContain("A welcoming team");
    expect(header.textContent).toContain("Warm, helpful people");
    fireEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(editor.hasAttribute("hidden")).toBe(true);
  });

  it("shows an accessible load error in the Why Choose Us editor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Homepage content is unavailable." }) }));
    render(<AdminHomepageWhyChooseUsManager />);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Homepage content is unavailable.")).toBeTruthy();
  });

  it("shows a clear save error and returns to an enabled save action", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => init?.method
      ? { ok: false, json: async () => ({ error: "Homepage content could not be saved right now." }) }
      : { ok: true, json: async () => ({ section: {
        heading: "Why Choose TSG Events?",
        supportingText: "Carefully planned events, from first idea to final guest.",
        isVisible: true,
        featureCards: [{ id: "friendly-team", title: "Friendly Team", description: "We make every client feel welcome.", icon: "users" }],
      } }) }));
    render(<AdminHomepageWhyChooseUsManager />);
    const save = await screen.findByRole("button", { name: "Save Why Choose Us section" });
    fireEvent.submit(save.closest("form")!);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByText("Homepage content could not be saved right now.")).toBeTruthy();
    expect(save.hasAttribute("disabled")).toBe(false);
  });

  it("selects and reorders services and persists homepage section settings", async () => {
    const serviceRows = [
      { id: "00000000-0000-4000-8000-000000000001", slug: "weddings", title: "Weddings", isActive: true, sortOrder: 1 },
      { id: "00000000-0000-4000-8000-000000000002", slug: "corporate-events", title: "Corporate events", isActive: true, sortOrder: 2 },
      { id: "00000000-0000-4000-8000-000000000003", slug: "birthdays", title: "Birthdays", isActive: false, sortOrder: 3 },
    ];
    const initialSection = { eyebrow: "What We Do", heading: "Top Event Planning Services in Chennai", highlight: "Event Planning Services", isVisible: true };
    let savedIds = [serviceRows[0].id, serviceRows[1].id];
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, json: async () => ({ section: initialSection, serviceIds: savedIds, services: serviceRows }) };
      const body = JSON.parse(String(init.body));
      savedIds = body.serviceIds;
      return { ok: true, json: async () => ({ section: body, serviceIds: savedIds }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminHomepageServicesManager />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Edit homepage Services section" })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Move Corporate events up" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Birthdays" }));
    fireEvent.change(screen.getByLabelText("Section heading"), { target: { value: "Our event services in Chennai" } });
    fireEvent.submit(screen.getByRole("button", { name: "Save Services section" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Homepage services section saved."));
    expect(savedIds).toEqual([serviceRows[1].id, serviceRows[0].id, serviceRows[2].id]);
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/homepage-services", expect.objectContaining({
      method: "PUT",
      credentials: "same-origin",
      body: JSON.stringify({
        ...initialSection,
        heading: "Our event services in Chennai",
        serviceIds: [serviceRows[1].id, serviceRows[0].id, serviceRows[2].id],
      }),
    }));
  });

  it("provides a persistent About Us editor and links to the public page", async () => {
    const initial = {
      eyebrow: "Our story",
      heading: "A heading for the About Us section",
      firstParagraph: "The first paragraph contains enough text to pass the validation rules.",
      secondParagraph: "The second paragraph contains enough text to pass the validation rules.",
      imageUrl: "/images/gathering-study.svg",
      imageCaption: "A celebration image",
      buttonLabel: "More About Us",
      destinationUrl: "/about",
      isVisible: true,
    };
    let saved: Record<string, unknown> = initial;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method && input === "/api/admin/portfolio/uploads") return { ok: true, headers: new Headers({ "X-Max-Gallery-Image-Size-Bytes": String(10 * 1024 * 1024) }), json: async () => ({}) };
      if (!init?.method) return { ok: true, json: async () => ({ aboutUs: saved }) };
      if (input === "/api/admin/portfolio/uploads") return { ok: true, json: async () => ({ token: "about-upload-token", previewUrl: "/api/admin/portfolio/uploads/about-upload-token" }) };
      if (String(input).endsWith("/uploads/about-upload-token")) return { ok: true, json: async () => ({ deleted: true }) };
      saved = JSON.parse(String(init.body));
      if (saved.imageUploadToken) saved.imageUrl = "/api/uploads/3fc6ab10-811a-46d9-a817-f1780e9e91ec.png";
      return { ok: true, json: async () => ({ aboutUs: saved }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminAboutUsPage />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Edit homepage About Us section" })).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Main heading"), { target: { value: "Saved About Us heading" } });
    await waitFor(() => expect(screen.getByLabelText("Choose replacement image").hasAttribute("disabled")).toBe(false));
    fireEvent.change(screen.getByLabelText("Choose replacement image"), { target: { files: [new File(["image"], "event.png", { type: "image/png" })] } });
    await screen.findByRole("img", { name: /Preview of selected replacement/ });
    fireEvent.click(screen.getByRole("checkbox", { name: "Show About Us section on the homepage" }));
    fireEvent.submit(screen.getByRole("button", { name: "Save About Us section" }).closest("form")!);

    await waitFor(() => expect(screen.getByText("About Us section saved.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/about-us", expect.objectContaining({ method: "PUT", credentials: "same-origin" }));
    expect(saved).toMatchObject({ heading: "Saved About Us heading", imageUrl: "/api/uploads/3fc6ab10-811a-46d9-a817-f1780e9e91ec.png", imageUploadToken: "about-upload-token", expectedImageRef: initial.imageUrl, isVisible: false });
    expect(screen.getByRole("link", { name: /view the public about us page/i }).getAttribute("href")).toBe("/about");
  });
});

describe("homepage slide management", () => {
  it("creates, edits, reorders, publishes, and unpublishes slides through same-origin admin APIs", async () => {
    const existing = { id: "slide-one", heading: "Existing slide", description: "An existing sample description.", buttonLabel: "Contact us", destinationUrl: "/contact", imageRef: "/images/gathering-study.svg", isPublished: false, sortOrder: 1 };
    const created = { id: "slide-two", heading: "New slide", description: "A new sample description.", buttonLabel: "Explore", destinationUrl: "/about", imageRef: "/images/table-study.svg", isPublished: false, sortOrder: 2 };
    let stored = existing;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method && input === "/api/admin/portfolio/uploads") return { ok: true, headers: new Headers({ "X-Max-Gallery-Image-Size-Bytes": String(10 * 1024 * 1024) }), json: async () => ({}) };
      if (!init?.method) return { ok: true, json: async () => ({ slides: [stored] }) };
      if (input === "/api/admin/portfolio/uploads") return { ok: true, json: async () => ({ token: "hero-upload-token", previewUrl: "/api/admin/portfolio/uploads/hero-upload-token" }) };
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
    await waitFor(() => expect(within(createForm).getByLabelText("Choose slide image").hasAttribute("disabled")).toBe(false));
    fireEvent.change(within(createForm).getByLabelText("Choose slide image"), { target: { files: [new File(["image"], "hero.png", { type: "image/png" })] } });
    await within(createPanel).findByRole("img", { name: /Preview of selected replacement/ });
    fireEvent.change(within(createForm).getByLabelText("Display order"), { target: { value: "2" } });
    fireEvent.submit(createForm);
    await waitFor(() => expect(screen.getByRole("heading", { name: /New slide/ })).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/hero-slides", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
    const createBody = JSON.parse(String(fetchMock.mock.calls.find(([url, init]) => url === "/api/admin/hero-slides" && init?.method === "POST")?.[1]?.body));
    expect(createBody).toMatchObject({ imageUploadToken: "hero-upload-token", expectedImageRef: "" });
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
        { id: "service-one", slug: "weddings", title: "Weddings", kicker: "Kicker one", description: "Description one", detail: "Detail one", imageRef: null, isActive: true, sortOrder: 1 },
        { id: "service-two", slug: "corporate", title: "Corporate", kicker: "Kicker two", description: "Description two", detail: "Detail two", imageRef: null, isActive: true, sortOrder: 2 },
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
    const existing = { id: "service-one", slug: "weddings", title: "Weddings", kicker: "Kicker", description: "A service description", detail: "Service details", imageRef: null, isActive: true, sortOrder: 1 };
    let saved: { id: string; slug: string; title: string; kicker: string; description: string; detail: string; imageRef: string | null; isActive: boolean; sortOrder: number } = existing;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method && input === "/api/admin/portfolio/uploads") return { ok: true, headers: new Headers({ "X-Max-Gallery-Image-Size-Bytes": String(10 * 1024 * 1024) }), json: async () => ({}) };
      if (!init?.method) return { ok: true, json: async () => ({ services: [saved] }) };
      if (input === "/api/admin/portfolio/uploads") return { ok: true, json: async () => ({ token: "service-upload-token", previewUrl: "/api/admin/portfolio/uploads/service-upload-token" }) };
      const body = JSON.parse(String(init.body));
      if (init.method === "POST") return { ok: true, json: async () => ({ service: { ...body, id: "service-two", isActive: true } }) };
      saved = { ...saved, ...body };
      if (body.imageUploadToken) saved.imageRef = "/api/uploads/3fc6ab10-811a-46d9-a817-f1780e9e91ec.png";
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
    await waitFor(() => expect(within(editForm).getByLabelText("Choose replacement image").hasAttribute("disabled")).toBe(false));
    fireEvent.change(within(editForm).getByLabelText("Choose replacement image"), { target: { files: [new File(["image"], "wedding.png", { type: "image/png" })] } });
    await within(editForm).findByRole("img", { name: /Preview of selected replacement/ });
    fireEvent.submit(editForm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/services/service-one", expect.objectContaining({ method: "PATCH" })));
    const serviceBody = JSON.parse(String(fetchMock.mock.calls.find(([url, init]) => url === "/api/admin/services/service-one" && init?.method === "PATCH")?.[1]?.body));
    expect(serviceBody).toMatchObject({ imageUploadToken: "service-upload-token", expectedImageRef: "" });
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

  it("previews a replacement and saves it without overwriting the current image before save", async () => {
    const existing = { id: "entry-upload", title: "Launch event", description: "A launch event description.", imageRef: "/images/gathering-study.svg", altText: "A launch event", isSample: false, isPublished: true, sortOrder: 2 };
    let saved = existing;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, headers: new Headers({ "X-Max-Gallery-Image-Size-Bytes": String(10 * 1024 * 1024) }), json: async () => ({ entries: [saved] }) };
      if (input === "/api/admin/portfolio/uploads") return { ok: true, json: async () => ({ token: "upload-token", previewUrl: "/api/admin/portfolio/uploads/upload-token" }) };
      if (String(input).endsWith("/uploads/upload-token")) return { ok: true, json: async () => ({ deleted: true }) };
      const body = JSON.parse(String(init.body));
      saved = { ...saved, ...body, imageRef: "/api/uploads/3fc6ab10-811a-46d9-a817-f1780e9e91ec.png" };
      return { ok: true, json: async () => ({ entry: saved }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPortfolioManager />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Launch event/ })).toBeTruthy());

    const card = screen.getByRole("heading", { name: /Launch event/ }).closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: /Launch event/ }));
    const currentImage = within(card).getByRole("img", { name: "A launch event" });
    expect(currentImage.getAttribute("src")).toBe(existing.imageRef);

    const replacement = new File(["image"], "launch.png", { type: "image/png" });
    fireEvent.change(within(card).getByLabelText("Choose replacement image"), { target: { files: [replacement] } });
    const preview = await within(card).findByRole("img", { name: /Preview of selected replacement/ });
    expect(preview.getAttribute("src")).toBe("/api/admin/portfolio/uploads/upload-token");
    expect(currentImage.getAttribute("src")).toBe(existing.imageRef);
    expect(within(card).getByText("Image uploaded and ready to save.")).toBeTruthy();

    const editForm = within(card).getByRole("button", { name: "Save changes" }).closest("form")!;
    fireEvent.change(within(editForm).getByLabelText("Title"), { target: { value: "Launch celebration" } });
    fireEvent.submit(editForm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/portfolio/entry-upload", expect.objectContaining({ method: "PATCH" })));
    const patchBody = JSON.parse(String(fetchMock.mock.calls.find(([url, init]) => url === "/api/admin/portfolio/entry-upload" && init?.method === "PATCH")?.[1]?.body));
    expect(patchBody).toMatchObject({ imageUploadToken: "upload-token", expectedImageRef: existing.imageRef, title: "Launch celebration" });
    expect(patchBody.imageRef).toBeUndefined();
  });

  it("allows canceling a staged replacement while keeping the original image reference", async () => {
    const existing = { id: "entry-cancel", title: "Reception", description: "A reception description.", imageRef: "/images/table-study.svg", altText: "Reception tables", isSample: false, isPublished: true, sortOrder: 1 };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return { ok: true, headers: new Headers(), json: async () => ({ entries: [existing] }) };
      if (input === "/api/admin/portfolio/uploads") return { ok: true, json: async () => ({ token: "cancel-token", previewUrl: "/api/admin/portfolio/uploads/cancel-token" }) };
      if (String(input).endsWith("/uploads/cancel-token")) return { ok: true, json: async () => ({ deleted: true }) };
      return { ok: true, json: async () => ({ entry: existing }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AdminPortfolioManager />);
    await waitFor(() => expect(screen.getByRole("heading", { name: /Reception/ })).toBeTruthy());

    const card = screen.getByRole("heading", { name: /Reception/ }).closest("article")!;
    fireEvent.click(within(card).getByRole("button", { name: /Reception/ }));
    fireEvent.change(within(card).getByLabelText("Choose replacement image"), { target: { files: [new File(["image"], "replacement.webp", { type: "image/webp" })] } });
    await within(card).findByRole("img", { name: /Preview of selected replacement/ });
    fireEvent.click(within(card).getByRole("button", { name: "Cancel replacement" }));
    await waitFor(() => expect(within(card).queryByRole("img", { name: /Preview of selected replacement/ })).toBeNull());

    const editForm = within(card).getByRole("button", { name: "Save changes" }).closest("form")!;
    fireEvent.submit(editForm);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/portfolio/entry-cancel", expect.objectContaining({ method: "PATCH" })));
    const patchBody = JSON.parse(String(fetchMock.mock.calls.find(([url, init]) => url === "/api/admin/portfolio/entry-cancel" && init?.method === "PATCH")?.[1]?.body));
    expect(patchBody.imageUploadToken).toBeUndefined();
    expect(patchBody.imageRef).toBeUndefined();
    expect(patchBody.expectedImageRef).toBeUndefined();
    expect(existing.imageRef).toBe("/images/table-study.svg");
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
