import { describe, expect, it } from "vitest";
import { defaultAboutUs, validateAboutUs } from "../lib/about-us";

describe("About Us content validation", () => {
  it("accepts and trims the initial content", () => {
    expect(validateAboutUs(defaultAboutUs)).toEqual({ ok: true, value: defaultAboutUs });
    expect(validateAboutUs({ ...defaultAboutUs, eyebrow: "  Our story  " })).toMatchObject({ ok: true, value: { eyebrow: "Our story" } });
  });

  it("rejects missing, oversized, unexpected, and unsafe fields", () => {
    expect(validateAboutUs(null).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, extra: "not allowed" }).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, heading: "x".repeat(201) }).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, firstParagraph: "too short" }).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, imageUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, imageUrl: "//attacker.example/event.jpg" }).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, imageUrl: "http://example.org/event.jpg" }).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, imageUrl: "https://example.org/event.jpg" }).ok).toBe(true);
    expect(validateAboutUs({ ...defaultAboutUs, destinationUrl: "https://attacker.example" }).ok).toBe(false);
    expect(validateAboutUs({ ...defaultAboutUs, isVisible: "true" }).ok).toBe(false);
  });
});
