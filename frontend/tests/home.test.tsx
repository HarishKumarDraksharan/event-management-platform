import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "../app/(public)/page";
import AboutPage from "../app/(public)/about/page";
import PortfolioPage from "../app/(public)/portfolio/page";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { EnquiryForm } from "../components/enquiry-form";
import { siteMetadata } from "../lib/metadata";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const services = [
  { id: "1", slug: "weddings", title: "Weddings", kicker: "A DAY THAT FEELS LIKE YOU", description: "A thoughtful plan for the day, and all the moments around it.", detail: "Planning details for a wedding day and celebration." },
  { id: "2", slug: "corporate-events", title: "Corporate events", kicker: "GATHER WITH PURPOSE", description: "Purposeful gatherings shaped around your people and plans.", detail: "A considered company gathering." },
  { id: "3", slug: "birthdays", title: "Birthdays", kicker: "MAKE THEIR DAY THEIR OWN", description: "A personal celebration for the person at the centre of it.", detail: "A personal birthday plan." },
  { id: "4", slug: "private-celebrations", title: "Private celebrations", kicker: "FOR THE MOMENTS THAT BRING YOU TOGETHER", description: "An intimate get-together, made to feel unmistakably yours.", detail: "A plan shaped around the occasion." },
];
const entries = [
  { id: "a", title: "A gathering study", description: "Original sample illustration of a candlelit celebration table.", imageRef: "/images/gathering-study.svg", altText: "Sample illustration of a candlelit celebration table", isSample: true },
  { id: "b", title: "Details in place", description: "Original sample illustration of an event table.", imageRef: "/images/table-study.svg", altText: "Sample illustration of an event table", isSample: true },
  { id: "c", title: "A colour story", description: "Original abstract sample illustration.", imageRef: "/images/colour-study.svg", altText: "Sample abstract event illustration", isSample: true },
];

function stubCatalog() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return { ok: true, json: async () => url.endsWith("/api/services") ? { services } : { entries } };
  }));
}

describe("TSG EVENTS public website", () => {
  it("renders the homepage with active services and published portfolio links", async () => {
    stubCatalog();
    render(await Home());
    expect(screen.getByRole("heading", { name: /make room for meaningful moments/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /every gathering starts somewhere/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /stories worth gathering for/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /weddings a thoughtful plan/i }).getAttribute("href")).toBe("/services/weddings");
    expect(screen.getByRole("link", { name: /corporate events purposeful gatherings/i }).getAttribute("href")).toBe("/services/corporate-events");
    expect(screen.getByRole("link", { name: /birthdays a personal celebration/i }).getAttribute("href")).toBe("/services/birthdays");
    expect(screen.getByRole("link", { name: /private celebrations an intimate get-together/i }).getAttribute("href")).toBe("/services/private-celebrations");
    expect(screen.getByRole("link", { name: /share your plans/i }).getAttribute("href")).toBe("/contact");
    expect(screen.getByText(/A gathering study · SAMPLE/i)).toBeTruthy();
  });

  it("offers customer navigation and does not expose the admin sign-in publicly", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    for (const label of ["Home", "Services", "Our work", "About", "Contact"]) expect(within(nav).getByRole("link", { name: label })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Open navigation menu"));
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeTruthy();
  });

  it("keeps the public footer customer-focused and labels sample art", async () => {
    render(<SiteFooter />);
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    cleanup();
    stubCatalog();
    render(await PortfolioPage());
    expect(screen.getByRole("heading", { name: /stories worth gathering for/i })).toBeTruthy();
    expect(screen.getAllByText("CONCEPT ART · SAMPLE")).toHaveLength(3);
    cleanup();
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /good planning makes space for being there/i })).toBeTruthy();
    expect(screen.getByText(/company history, team details and location will be added when they are supplied/i)).toBeTruthy();
  });

  it("publishes branded site metadata", () => {
    expect(siteMetadata.title.default).toContain("TSG EVENTS");
    expect(siteMetadata.description).toContain("TSG EVENTS");
  });
});

describe("enquiry form", () => {
  it("submits to the public API route and announces success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => "cbab649a-425b-4962-835c-d5142b000052" });
    render(<EnquiryForm initialEventType="Wedding" />);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Asha Kumar" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "asha@example.org" } });
    fireEvent.change(screen.getByLabelText(/what are you planning/i), { target: { value: "Wedding" } });
    fireEvent.change(screen.getByLabelText(/a little about your plans/i), { target: { value: "We are planning a family wedding and would love to discuss coordination." } });
    fireEvent.submit(screen.getByRole("button", { name: /send your enquiry/i }).closest("form")!);
    await waitFor(() => expect(screen.getByText("Thank you. Your enquiry has been received.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/enquiries", expect.objectContaining({ method: "POST" }));
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe("cbab649a-425b-4962-835c-d5142b000052");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).eventType).toBe("Wedding");
  });

  it("gives a safe retry message when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("internal failure")));
    vi.stubGlobal("crypto", { randomUUID: () => "cbab649a-425b-4962-835c-d5142b000052" });
    render(<EnquiryForm />);
    fireEvent.submit(screen.getByRole("button", { name: /send your enquiry/i }).closest("form")!);
    await waitFor(() => expect(screen.getByText(/couldn’t send your enquiry just now/i)).toBeTruthy());
  });
});
