import { mkdtemp, readFile, rm, utimes } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteStagedGalleryImage,
  consumeStagedGalleryImage,
  maxGalleryImageSizeBytes,
  promoteStagedGalleryImage,
  readManagedGalleryImage,
  readStagedGalleryImage,
  removeExpiredStagedGalleryImages,
  removeManagedGalleryImageIfUnreferenced,
  retryPendingGalleryImageCleanup,
  scheduleManagedGalleryImageCleanup,
  stageGalleryImage,
} from "../lib/gallery-image-storage";

let directory: string;

async function pngImage() {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: "#f16a0a" } }).png().toBuffer();
}

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "gallery-images-"));
  vi.spyOn(process, "cwd").mockReturnValue(directory);
  vi.stubEnv("MAX_GALLERY_IMAGE_SIZE_BYTES", "");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("managed gallery image storage", () => {
  it("decodes staged image bytes and promotes them to unique public paths", async () => {
    const staged = await stageGalleryImage(await pngImage());
    expect(staged.previewUrl).toBe(`/api/admin/portfolio/uploads/${staged.token}`);
    expect((await readStagedGalleryImage(staged.token))?.contentType).toBe("image/png");

    const promoted = await promoteStagedGalleryImage(staged.token);
    expect(promoted.imageRef).toMatch(/^\/api\/uploads\/[0-9a-f-]+\.png$/);
    expect(await readStagedGalleryImage(staged.token)).not.toBeNull();
    expect((await readManagedGalleryImage(promoted.filename))?.contentType).toBe("image/png");
    await consumeStagedGalleryImage(staged.token);
    expect(await readStagedGalleryImage(staged.token)).toBeNull();
  });

  it.each([
    ["jpeg", "image/jpeg", "jpg"],
    ["png", "image/png", "png"],
    ["webp", "image/webp", "webp"],
  ] as const)("accepts and stores valid %s image data", async (format, contentType, extension) => {
    const bytes = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#f16a0a" } }).toFormat(format).toBuffer();
    const staged = await stageGalleryImage(bytes);
    expect(staged.contentType).toBe(contentType);
    const promoted = await promoteStagedGalleryImage(staged.token);
    expect(promoted.filename.endsWith(`.${extension}`)).toBe(true);
  });

  it("rejects empty, malformed, unsupported, and oversized image data", async () => {
    await expect(stageGalleryImage(new Uint8Array())).rejects.toMatchObject({ status: 400 });
    await expect(stageGalleryImage(new TextEncoder().encode("<svg></svg>"))).rejects.toMatchObject({ status: 415 });

    vi.stubEnv("MAX_GALLERY_IMAGE_SIZE_BYTES", "8");
    await expect(stageGalleryImage(await pngImage())).rejects.toMatchObject({ status: 413 });
  });

  it("removes only unreferenced managed images and leaves shared or arbitrary paths alone", async () => {
    const promoted = await promoteStagedGalleryImage((await stageGalleryImage(await pngImage())).token);
    const referenced = await removeManagedGalleryImageIfUnreferenced(promoted.imageRef, async () => false);
    expect(referenced).toBe(false);
    expect(await readManagedGalleryImage(promoted.filename)).not.toBeNull();

    const removed = await removeManagedGalleryImageIfUnreferenced(promoted.imageRef, async (_imageRef, removeFile) => removeFile());
    expect(removed).toBe(true);
    expect(await readManagedGalleryImage(promoted.filename)).toBeNull();
    await expect(removeManagedGalleryImageIfUnreferenced("/images/gathering-study.svg", async () => false)).resolves.toBe(false);
  });

  it("allows canceling staged uploads and expires stale staging files", async () => {
    const staged = await stageGalleryImage(await pngImage());
    expect(await deleteStagedGalleryImage(staged.token)).toBe(true);
    expect(await readStagedGalleryImage(staged.token)).toBeNull();

    const stale = await stageGalleryImage(await pngImage());
    const stagedImage = await readStagedGalleryImage(stale.token);
    expect(stagedImage).not.toBeNull();
    const stagingPath = path.join(directory, "uploads", ".staging", `${stale.token}.png`);
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    await utimes(stagingPath, old, old);
    await removeExpiredStagedGalleryImages();
    expect(await readFile(stagingPath).catch(() => null)).toBeNull();
    expect(await maxGalleryImageSizeBytes()).toBe(10 * 1024 * 1024);
  });

  it("keeps failed/shared cleanup queued and retries it on a later cleanup pass", async () => {
    const promoted = await promoteStagedGalleryImage((await stageGalleryImage(await pngImage())).token);
    let referenced = true;
    const withReferenceLock = async (_imageRef: string, removeFile: () => Promise<boolean>) => referenced ? false : removeFile();
    await scheduleManagedGalleryImageCleanup(promoted.imageRef, withReferenceLock);
    expect(await readManagedGalleryImage(promoted.filename)).not.toBeNull();

    referenced = false;
    await retryPendingGalleryImageCleanup(withReferenceLock);
    expect(await readManagedGalleryImage(promoted.filename)).toBeNull();
  });
});
