import { describe, expect, it } from "vitest";
import { validatePortfolioInput, validatePortfolioPatch, validateServiceInput, validateServicePatch } from "../lib/catalog";

const service = { slug: "weddings", title: "Weddings", kicker: "A considered day", description: "A service description long enough to be accepted.", detail: "A service detail long enough to be accepted.", sortOrder: 1 };
const entry = { title: "Gathering study", description: "A sample illustration for a planned celebration.", imageRef: "/images/gathering-study.svg", altText: "Illustration of an event table", sortOrder: 1 };

describe("service and portfolio validation", () => {
  it("accepts the current public service fields and rejects invalid slugs", () => {
    expect(validateServiceInput(service)).toMatchObject({ ok: true, value: service });
    expect(validateServiceInput({ ...service, slug: "../admin" }).ok).toBe(false);
    expect(validateServicePatch({ isActive: "false" }).ok).toBe(false);
    expect(validateServicePatch({ isActive: false })).toMatchObject({ ok: true, value: { isActive: false } });
  });

  it("accepts checked-in image references and rejects remote or unsafe paths", () => {
    expect(validatePortfolioInput(entry).ok).toBe(true);
    expect(validatePortfolioInput({ ...entry, imageRef: "https://example.org/image.jpg" }).ok).toBe(false);
    expect(validatePortfolioInput({ ...entry, imageRef: "/images/../../private.png" }).ok).toBe(false);
    expect(validatePortfolioPatch({ isPublished: true })).toMatchObject({ ok: true, value: { isPublished: true } });
    expect(validatePortfolioPatch({ isPublished: 1 }).ok).toBe(false);
  });
});
