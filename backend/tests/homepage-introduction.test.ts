import { describe, expect, it } from "vitest";
import { defaultHomepageIntroduction, validateHomepageIntroduction } from "../lib/homepage-introduction";

describe("homepage introduction validation", () => {
  it("accepts the initial introduction copy", () => {
    expect(validateHomepageIntroduction(defaultHomepageIntroduction)).toEqual({ ok: true, value: defaultHomepageIntroduction });
  });

  it("trims valid text and rejects empty, oversized, or unknown fields", () => {
    expect(validateHomepageIntroduction({ ...defaultHomepageIntroduction, heading: "  A new heading  " })).toMatchObject({ ok: true, value: { heading: "A new heading" } });
    expect(validateHomepageIntroduction({ ...defaultHomepageIntroduction, description: "short" }).ok).toBe(false);
    expect(validateHomepageIntroduction({ ...defaultHomepageIntroduction, extra: "not supported" }).ok).toBe(false);
    expect(validateHomepageIntroduction({ ...defaultHomepageIntroduction, heading: "x".repeat(201) }).ok).toBe(false);
  });
});
