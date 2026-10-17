import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeRaw: vi.fn(),
  portfolioFindFirst: vi.fn(),
  heroFindFirst: vi.fn(),
  serviceFindFirst: vi.fn(),
  aboutFindFirst: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { lockGalleryImageReferences, withGalleryImageReferenceLock } from "../lib/gallery-image-references";

function transactionClient() {
  return {
    $executeRaw: mocks.executeRaw,
    portfolioEntry: { findFirst: mocks.portfolioFindFirst },
    heroSlide: { findFirst: mocks.heroFindFirst },
    service: { findFirst: mocks.serviceFindFirst },
    aboutUsSection: { findFirst: mocks.aboutFindFirst },
  };
}

describe("gallery image advisory lock", () => {
  it("executes the transaction-scoped lock without deserializing its void result", async () => {
    mocks.executeRaw.mockResolvedValue(1);
    await lockGalleryImageReferences(transactionClient());

    expect(mocks.executeRaw).toHaveBeenCalledOnce();
    const [statement, lockKey] = mocks.executeRaw.mock.calls[0];
    expect(Array.from(statement).join("")).toBe("SELECT pg_advisory_xact_lock()");
    expect(lockKey).toBe(1_370_421_651);
  });

  it("protects images referenced by every homepage image field from cleanup", async () => {
    mocks.executeRaw.mockResolvedValue(1);
    mocks.transaction.mockImplementation(async (callback) => callback(transactionClient()));
    for (const referenced of [
      [mocks.portfolioFindFirst, mocks.heroFindFirst, mocks.serviceFindFirst, mocks.aboutFindFirst],
      [mocks.heroFindFirst, mocks.portfolioFindFirst, mocks.serviceFindFirst, mocks.aboutFindFirst],
      [mocks.serviceFindFirst, mocks.portfolioFindFirst, mocks.heroFindFirst, mocks.aboutFindFirst],
      [mocks.aboutFindFirst, mocks.portfolioFindFirst, mocks.heroFindFirst, mocks.serviceFindFirst],
    ]) {
      vi.clearAllMocks();
      mocks.executeRaw.mockResolvedValue(1);
      mocks.transaction.mockImplementation(async (callback) => callback(transactionClient()));
      for (const lookup of [mocks.portfolioFindFirst, mocks.heroFindFirst, mocks.serviceFindFirst, mocks.aboutFindFirst]) lookup.mockResolvedValue(null);
      referenced[0].mockResolvedValue({ id: "referencing-record" });

      const removeFile = vi.fn().mockResolvedValue(true);
      await expect(withGalleryImageReferenceLock("/api/uploads/test.png", removeFile)).resolves.toBe(false);
      expect(removeFile).not.toHaveBeenCalled();
    }
  });
});
