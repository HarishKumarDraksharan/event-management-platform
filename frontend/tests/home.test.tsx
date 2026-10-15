import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "../app/page";
import AboutPage from "../app/about/page";
import PortfolioPage from "../app/portfolio/page";
import { SiteHeader } from "../components/site-header";
import { EnquiryForm } from "../components/enquiry-form";
import { siteMetadata } from "../lib/metadata";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("TSG EVENTS public website", () => {
  it("renders the homepage sections and links all four service pages", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /make room for meaningful moments/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /every gathering starts somewhere/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /stories worth gathering for/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /weddings a thoughtful plan/i }).getAttribute("href")).toBe("/services/weddings");
    expect(screen.getByRole("link", { name: /corporate events purposeful gatherings/i }).getAttribute("href")).toBe("/services/corporate-events");
    expect(screen.getByRole("link", { name: /birthdays a personal celebration/i }).getAttribute("href")).toBe("/services/birthdays");
    expect(screen.getByRole("link", { name: /private celebrations an intimate get-together/i }).getAttribute("href")).toBe("/services/private-celebrations");
    expect(screen.getByRole("link", { name: /share your plans/i }).getAttribute("href")).toBe("/contact");
  });

  it("offers labelled desktop and keyboard-operable mobile navigation", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Open navigation menu"));
    expect(screen.getByRole("navigation", { name: "Mobile navigation" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "TSG EVENTS home" }).getAttribute("href")).toBe("/");
    expect(screen.getByLabelText("Open navigation menu")).toBeTruthy();
  });

  it("labels portfolio content as sample artwork and includes the about section", () => {
    const { unmount } = render(<PortfolioPage />);
    expect(screen.getByRole("heading", { name: /stories worth gathering for/i })).toBeTruthy();
    expect(screen.getAllByText("CONCEPT ART · PLACEHOLDER")).toHaveLength(3);
    unmount();
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
