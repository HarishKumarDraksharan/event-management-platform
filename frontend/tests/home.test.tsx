import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "../app/page";
import { siteMetadata } from "../lib/metadata";

afterEach(cleanup);

describe("TSG EVENTS homepage", () => {
  it("renders the company name in the header and footer", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "TSG EVENTS home" })).toBeTruthy();
    expect(screen.getAllByText("TSG EVENTS")).toHaveLength(2);
  });

  it("keeps the foundation sections and enquiry call to action", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: /make room for meaningful moments/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Every gathering starts somewhere." })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Stories worth gathering for." })).toBeTruthy();
    expect(screen.getByRole("link", { name: /let’s talk about it/i }).getAttribute("href")).toBe("mailto:hello@example.com");
  });

  it("publishes TSG EVENTS metadata", () => {
    expect(siteMetadata.title).toContain("TSG EVENTS");
    expect(siteMetadata.description).toContain("TSG EVENTS");
  });
});
