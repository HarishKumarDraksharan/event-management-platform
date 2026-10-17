import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicHomepageGallery } from "../lib/public-content";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getPublicHomepageGallery", () => {
  const responseBody = {
    section: { eyebrow: "Moments We've Created", heading: "Showcasing Our Events & Memorable Moments", isVisible: true },
    entries: [
      { id: "first", title: "A memorable celebration", imageRef: "/images/gathering-study.svg", altText: "A candlelit celebration table" },
      { id: "second", title: "An intimate gathering", imageRef: "/images/table-study.svg", altText: "A carefully arranged event table" },
    ],
  };

  it("transforms the section and entries response into the homepage gallery shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => responseBody });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("BACKEND_INTERNAL_URL", "http://backend.internal:3001");

    await expect(getPublicHomepageGallery()).resolves.toEqual({
      eyebrow: responseBody.section.eyebrow,
      heading: responseBody.section.heading,
      isVisible: responseBody.section.isVisible,
      entries: responseBody.entries,
    });
    expect(fetchMock).toHaveBeenCalledWith("http://backend.internal:3001/api/homepage-gallery", { cache: "no-store" });
  });

  it("returns null for invalid response shapes and failed requests", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...responseBody, section: null }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...responseBody, entries: [{ ...responseBody.entries[0], altText: "" }] }) })
      .mockResolvedValueOnce({ ok: false, json: async () => responseBody }));

    await expect(getPublicHomepageGallery()).resolves.toBeNull();
    await expect(getPublicHomepageGallery()).resolves.toBeNull();
    await expect(getPublicHomepageGallery()).resolves.toBeNull();
  });
});
