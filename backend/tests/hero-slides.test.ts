import { describe, expect, it } from "vitest";
import { validateHeroSlideInput, validateHeroSlidePatch } from "../lib/hero-slides";

const slide = {
  heading: "Make room for moments",
  description: "A thoughtful celebration planned with care.",
  buttonLabel: "Tell us your plans",
  destinationUrl: "/contact",
  imageRef: "/images/gathering-study.svg",
  sortOrder: 1,
};

describe("homepage slide validation", () => {
  it("accepts an approved local slide and defaults new slides to unpublished", () => {
    expect(validateHeroSlideInput(slide)).toMatchObject({ ok: true, value: { ...slide, isPublished: false } });
    expect(validateHeroSlideInput({ ...slide, isPublished: true })).toMatchObject({ ok: true, value: { isPublished: true } });
  });

  it("rejects remote or unapproved images and external destinations", () => {
    expect(validateHeroSlideInput({ ...slide, imageRef: "https://example.org/hero.jpg" }).ok).toBe(false);
    expect(validateHeroSlideInput({ ...slide, imageRef: "/images/../../private.svg" }).ok).toBe(false);
    for (const destinationUrl of ["https://attacker.example", "//attacker.example", "/\\attacker.example", "javascript:alert(1)"]) {
      expect(validateHeroSlideInput({ ...slide, destinationUrl }).ok).toBe(false);
    }
  });

  it("validates edits to copy, ordering, and publication state", () => {
    expect(validateHeroSlidePatch({ heading: "Updated heading", sortOrder: 10, isPublished: true })).toMatchObject({ ok: true, value: { heading: "Updated heading", sortOrder: 10, isPublished: true } });
    expect(validateHeroSlidePatch({ isPublished: "true" }).ok).toBe(false);
    expect(validateHeroSlidePatch({ sortOrder: -1 }).ok).toBe(false);
    expect(validateHeroSlidePatch({ unknown: "value" }).ok).toBe(false);
  });
});
