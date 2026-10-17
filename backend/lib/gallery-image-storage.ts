import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";

const supportedFormats = {
  jpeg: { extension: "jpg", contentType: "image/jpeg" },
  png: { extension: "png", contentType: "image/png" },
  webp: { extension: "webp", contentType: "image/webp" },
} as const;
const maxImagePixels = 40_000_000;
const stagingLifetimeMs = 24 * 60 * 60 * 1000;

export class GalleryImageError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 | 413 | 415 = 400) {
    super(message);
  }
}

function storageRoot() {
  return path.join(process.cwd(), "uploads");
}

export function maxGalleryImageSizeBytes() {
  const configured = process.env.MAX_GALLERY_IMAGE_SIZE_BYTES;
  if (!configured) return 10 * 1024 * 1024;
  const size = Number(configured);
  if (!Number.isSafeInteger(size) || size < 1 || size > 100 * 1024 * 1024) {
    throw new Error("MAX_GALLERY_IMAGE_SIZE_BYTES must be a positive integer no greater than 104857600.");
  }
  return size;
}

function isToken(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stagedPath(token: string, extension: string) {
  if (!isToken(token) || !Object.values(supportedFormats).some((format) => format.extension === extension)) return null;
  return path.join(storageRoot(), ".staging", `${token}.${extension}`);
}

async function existingStagedPath(token: string) {
  for (const format of Object.values(supportedFormats)) {
    const candidate = stagedPath(token, format.extension)!;
    try {
      if ((await lstat(candidate)).isFile()) return { path: candidate, format };
    } catch (error) {
      if (isNodeError(error, "ENOENT")) continue;
      throw error;
    }
  }
  return null;
}

function isNodeError(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

export async function removeExpiredStagedGalleryImages(now = Date.now()) {
  const directory = path.join(storageRoot(), ".staging");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const names = await readdir(directory);
  for (const name of names) {
    if (!/^[0-9a-f-]{36}\.(?:jpg|png|webp)$/i.test(name)) continue;
    const candidate = path.join(directory, name);
    try {
      const details = await lstat(candidate);
      if (details.isFile() && now - details.mtimeMs > stagingLifetimeMs) await unlink(candidate);
    } catch (error) {
      if (!isNodeError(error, "ENOENT")) throw error;
    }
  }
}

export async function stageGalleryImage(bytes: Uint8Array) {
  const limit = maxGalleryImageSizeBytes();
  if (bytes.byteLength === 0) throw new GalleryImageError("Choose a non-empty image.");
  if (bytes.byteLength > limit) throw new GalleryImageError("The image exceeds the upload size limit.", 413);

  let metadata: Metadata;
  let normalized: Buffer;
  try {
    const image = sharp(bytes, { failOn: "error", limitInputPixels: maxImagePixels });
    metadata = await image.metadata();
    if (!metadata.format || !Object.hasOwn(supportedFormats, metadata.format) || !metadata.width || !metadata.height) {
      throw new GalleryImageError("Choose a valid JPEG, PNG, or WebP image.", 415);
    }
    normalized = await sharp(bytes, { failOn: "error", limitInputPixels: maxImagePixels }).rotate().toBuffer();
  } catch (error) {
    if (error instanceof GalleryImageError) throw error;
    throw new GalleryImageError("The selected file is not a valid JPEG, PNG, or WebP image.", 415);
  }

  const format = supportedFormats[metadata.format as keyof typeof supportedFormats];
  const token = randomUUID();
  const directory = path.join(storageRoot(), ".staging");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const destination = stagedPath(token, format.extension)!;
  const file = await open(destination, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
  try {
    await file.writeFile(normalized);
    await file.sync();
  } catch (error) {
    await file.close();
    await unlink(destination).catch(() => undefined);
    throw error;
  }
  await file.close();
  return { token, previewUrl: `/api/admin/portfolio/uploads/${token}`, contentType: format.contentType, size: normalized.byteLength };
}

export async function readStagedGalleryImage(token: string) {
  const staged = await existingStagedPath(token);
  if (!staged) return null;
  const details = await lstat(staged.path);
  if (!details.isFile()) return null;
  return { bytes: await openAndRead(staged.path), contentType: staged.format.contentType };
}

export async function deleteStagedGalleryImage(token: string) {
  const staged = await existingStagedPath(token);
  if (!staged) return false;
  await unlink(staged.path);
  return true;
}

export async function promoteStagedGalleryImage(token: string) {
  const staged = await existingStagedPath(token);
  if (!staged) throw new GalleryImageError("The uploaded image expired. Please upload it again.", 404);
  const filename = `${token}.${staged.format.extension}`;
  const directory = path.join(storageRoot(), "gallery");
  await mkdir(directory, { recursive: true, mode: 0o755 });
  const destination = path.join(directory, filename);
  try {
    await link(staged.path, destination);
  } catch (error) {
    if (!isNodeError(error, "EEXIST")) throw error;
    const [stagedBytes, existingBytes] = await Promise.all([openAndRead(staged.path), openAndRead(destination)]);
    if (!stagedBytes.equals(existingBytes)) throw new GalleryImageError("The staged image could not be safely saved.", 409);
  }
  return { imageRef: `/api/uploads/${filename}`, filename, contentType: staged.format.contentType };
}

export async function consumeStagedGalleryImage(token: string) {
  try {
    await deleteStagedGalleryImage(token);
  } catch (error) {
    console.error("[gallery-image] saved staging cleanup failed", {
      operation: "remove-saved-staging-file",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function readManagedGalleryImage(filename: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(filename)) return null;
  const directory = path.join(storageRoot(), "gallery");
  const filePath = path.resolve(directory, filename);
  if (path.dirname(filePath) !== path.resolve(directory)) return null;
  try {
    const details = await lstat(filePath);
    if (!details.isFile()) return null;
    return { bytes: await openAndRead(filePath), contentType: contentTypeFor(filename) };
  } catch (error) {
    if (isNodeError(error, "ENOENT")) return null;
    throw error;
  }
}

function contentTypeFor(filename: string) {
  const extension = filename.slice(filename.lastIndexOf(".") + 1);
  return extension === "jpg" ? "image/jpeg" : extension === "png" ? "image/png" : "image/webp";
}

async function openAndRead(filePath: string) {
  const file = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const details = await file.stat();
    if (!details.isFile()) throw new Error("Stored image is not a regular file.");
    return await file.readFile();
  } finally {
    await file.close();
  }
}

export async function removeManagedGalleryImageIfUnreferenced(
  imageRef: string,
  withReferenceLock: (imageRef: string, removeFile: () => Promise<boolean>) => Promise<boolean>,
) {
  const match = /^\/api\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp))$/i.exec(imageRef);
  if (!match) return false;
  const directory = path.resolve(storageRoot(), "gallery");
  const filePath = path.resolve(directory, match[1]);
  if (path.dirname(filePath) !== directory) return false;
  return withReferenceLock(imageRef, async () => {
    try {
      const details = await lstat(filePath);
      if (!details.isFile()) return false;
      await unlink(filePath);
      return true;
    } catch (error) {
      if (isNodeError(error, "ENOENT")) return true;
      throw error;
    }
  });
}

export async function retryPendingGalleryImageCleanup(
  withReferenceLock: (imageRef: string, removeFile: () => Promise<boolean>) => Promise<boolean>,
) {
  const directory = path.join(storageRoot(), ".cleanup");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const queuedFiles = await readdir(directory);
  for (const filename of queuedFiles) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(filename)) continue;
    const imageRef = `/api/uploads/${filename}`;
    const queuePath = path.join(directory, filename);
    try {
      const removed = await removeManagedGalleryImageIfUnreferenced(imageRef, withReferenceLock);
      if (removed) {
        await unlink(queuePath).catch((error: unknown) => {
          if (!isNodeError(error, "ENOENT")) throw error;
        });
      }
    } catch (error) {
      console.error("[gallery-image] queued cleanup retry failed", {
        operation: "retry-unreferenced-image-cleanup",
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
}

export async function scheduleManagedGalleryImageCleanup(
  imageRef: string,
  withReferenceLock: (imageRef: string, removeFile: () => Promise<boolean>) => Promise<boolean>,
) {
  const match = /^\/api\/uploads\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp))$/i.exec(imageRef);
  if (!match) return;
  const directory = path.join(storageRoot(), ".cleanup");
  const queuePath = path.join(directory, match[1]);
  try {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const queueFile = await open(queuePath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600).catch((error: unknown) => {
      if (isNodeError(error, "EEXIST")) return null;
      throw error;
    });
    await queueFile?.close();
  } catch (error) {
    console.error("[gallery-image] cleanup could not be queued", {
      operation: "queue-old-image-cleanup",
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
  }
  await retryPendingGalleryImageCleanup(withReferenceLock);
}
