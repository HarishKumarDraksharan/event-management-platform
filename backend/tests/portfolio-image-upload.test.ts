import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { promoteStagedGalleryImage, readManagedGalleryImage, readStagedGalleryImage, stageGalleryImage } from "../lib/gallery-image-storage";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  heroCreate: vi.fn(),
  heroFindUnique: vi.fn(),
  heroUpdateMany: vi.fn(),
  serviceCreate: vi.fn(),
  serviceFindUnique: vi.fn(),
  serviceUpdateMany: vi.fn(),
  aboutFindUnique: vi.fn(),
  aboutUpsert: vi.fn(),
  executeRaw: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../lib/authorization", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    portfolioEntry: {
      create: mocks.create,
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
      findUnique: mocks.findUnique,
    },
    heroSlide: { findFirst: mocks.findFirst },
    service: { findFirst: mocks.findFirst },
    aboutUsSection: { findFirst: mocks.findFirst },
    $executeRaw: mocks.executeRaw,
    $transaction: mocks.transaction,
  },
}));

const origin = "http://localhost:8080";
const entryId = "b930896a-150d-4fcf-aa15-927101b5f323";
let directory: string;
let currentEntry: Record<string, unknown>;
let uploadPost: typeof import("../app/api/admin/portfolio/uploads/route").POST;
let stagedGet: typeof import("../app/api/admin/portfolio/uploads/[token]/route").GET;
let updateEntry: typeof import("../app/api/admin/portfolio/[id]/route").PATCH;
let createEntry: typeof import("../app/api/admin/portfolio/route").POST;
let createHeroSlide: typeof import("../app/api/admin/hero-slides/route").POST;
let updateHeroSlide: typeof import("../app/api/admin/hero-slides/[id]/route").PATCH;
let createService: typeof import("../app/api/admin/services/route").POST;
let updateService: typeof import("../app/api/admin/services/[id]/route").PATCH;
let updateAboutUs: typeof import("../app/api/admin/about-us/route").PUT;
let serveImage: typeof import("../app/api/uploads/[filename]/route").GET;
let currentHero: Record<string, unknown>;
let currentService: Record<string, unknown>;
let currentAboutUs: Record<string, unknown>;

async function pngImage() {
  return sharp({ create: { width: 4, height: 4, channels: 3, background: "#f16a0a" } }).png().toBuffer();
}

function uploadRequest(bytes: Uint8Array, fileName = "event.png", mime = "image/png") {
  const form = new FormData();
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  form.append("file", new File([buffer], fileName, { type: mime }));
  return new Request(`${origin}/api/admin/portfolio/uploads`, { method: "POST", headers: { origin }, body: form });
}

function adminJson(url: string, method: "POST" | "PATCH" | "PUT", body: unknown) {
  return new Request(`${origin}${url}`, {
    method,
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_URL", origin);
  uploadPost = (await import("../app/api/admin/portfolio/uploads/route")).POST;
  stagedGet = (await import("../app/api/admin/portfolio/uploads/[token]/route")).GET;
  updateEntry = (await import("../app/api/admin/portfolio/[id]/route")).PATCH;
  createEntry = (await import("../app/api/admin/portfolio/route")).POST;
  createHeroSlide = (await import("../app/api/admin/hero-slides/route")).POST;
  updateHeroSlide = (await import("../app/api/admin/hero-slides/[id]/route")).PATCH;
  createService = (await import("../app/api/admin/services/route")).POST;
  updateService = (await import("../app/api/admin/services/[id]/route")).PATCH;
  updateAboutUs = (await import("../app/api/admin/about-us/route")).PUT;
  serveImage = (await import("../app/api/uploads/[filename]/route")).GET;
});

beforeEach(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "portfolio-upload-routes-"));
  vi.spyOn(process, "cwd").mockReturnValue(directory);
  vi.stubEnv("MAX_GALLERY_IMAGE_SIZE_BYTES", "");
  currentEntry = {
    id: entryId,
    title: "Saved event",
    description: "An existing gallery description.",
    imageRef: "/images/gathering-study.svg",
    altText: "A saved event image",
    sortOrder: 3,
    isSample: false,
    isPublished: true,
  };
  currentHero = { id: entryId, heading: "Current slide", imageRef: "/images/gathering-study.svg", isPublished: true, sortOrder: 0 };
  currentService = { id: entryId, slug: "weddings", title: "Weddings", imageRef: null, isActive: true, sortOrder: 0 };
  currentAboutUs = { id: "home", imageUrl: "/images/gathering-study.svg" };
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ ok: true, admin: { userId: "admin", email: "admin@example.org", name: "Admin" } });
  mocks.create.mockImplementation(async ({ data }) => ({ id: entryId, ...data }));
  mocks.findFirst.mockResolvedValue(null);
  mocks.executeRaw.mockResolvedValue(1);
  mocks.updateMany.mockImplementation(async ({ where, data }) => {
    if (currentEntry.id !== where.id || currentEntry.imageRef !== where.imageRef) return { count: 0 };
    currentEntry = { ...currentEntry, ...data };
    return { count: 1 };
  });
  mocks.findUnique.mockImplementation(async () => currentEntry);
  mocks.heroCreate.mockImplementation(async ({ data }) => ({ id: entryId, ...data }));
  mocks.heroFindUnique.mockImplementation(async () => currentHero);
  mocks.heroUpdateMany.mockImplementation(async ({ where, data }) => {
    if (currentHero.id !== where.id || currentHero.imageRef !== where.imageRef) return { count: 0 };
    currentHero = { ...currentHero, ...data };
    return { count: 1 };
  });
  mocks.serviceCreate.mockImplementation(async ({ data }) => ({ id: entryId, ...data }));
  mocks.serviceFindUnique.mockImplementation(async () => currentService);
  mocks.serviceUpdateMany.mockImplementation(async ({ where, data }) => {
    if (currentService.id !== where.id || currentService.imageRef !== where.imageRef) return { count: 0 };
    currentService = { ...currentService, ...data };
    return { count: 1 };
  });
  mocks.aboutFindUnique.mockImplementation(async () => currentAboutUs);
  mocks.aboutUpsert.mockImplementation(async ({ create, update }) => {
    currentAboutUs = { ...currentAboutUs, ...create, ...update };
    return currentAboutUs;
  });
  mocks.transaction.mockImplementation(async (callback) => callback({
    $executeRaw: mocks.executeRaw,
    portfolioEntry: { create: mocks.create, findFirst: mocks.findFirst, updateMany: mocks.updateMany, findUnique: mocks.findUnique },
    heroSlide: { create: mocks.heroCreate, findFirst: mocks.findFirst, findUnique: mocks.heroFindUnique, updateMany: mocks.heroUpdateMany },
    service: { create: mocks.serviceCreate, findFirst: mocks.findFirst, findUnique: mocks.serviceFindUnique, updateMany: mocks.serviceUpdateMany },
    aboutUsSection: { findFirst: mocks.findFirst, findUnique: mocks.aboutFindUnique, upsert: mocks.aboutUpsert },
  }));
});

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
});

afterAll(async () => {
  vi.unstubAllEnvs();
});

describe("portfolio image upload routes", () => {
  it("requires administrator authorization and same-origin upload requests", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ ok: false, response: Response.json({ error: "Authentication required." }, { status: 401 }) });
    expect((await uploadPost(uploadRequest(await pngImage()))).status).toBe(401);

    expect((await uploadPost(new Request(`${origin}/api/admin/portfolio/uploads`, {
      method: "POST",
      headers: { origin: "https://attacker.example", "content-type": "multipart/form-data" },
    }))).status).toBe(403);
  });

  it("rejects malformed content even when it claims to be a supported image", async () => {
    const response = await uploadPost(uploadRequest(new TextEncoder().encode("<svg></svg>"), "image.png", "image/png"));
    expect(response.status).toBe(415);
  });

  it("uploads, privately previews, saves, and publicly serves a new gallery image", async () => {
    const uploadResponse = await uploadPost(uploadRequest(await pngImage()));
    expect(uploadResponse.status).toBe(201);
    const staged = await uploadResponse.json();
    const preview = await stagedGet(new Request(`${origin}${staged.previewUrl}`), { params: Promise.resolve({ token: staged.token }) });
    expect(preview.status).toBe(200);
    expect(preview.headers.get("cache-control")).toContain("private");

    const saved = await createEntry(adminJson("/api/admin/portfolio", "POST", {
      title: "New event",
      description: "A new gallery event description.",
      imageRef: "https://attacker.example/image.png",
      altText: "A new event image",
      sortOrder: 4,
      imageUploadToken: staged.token,
    }));
    expect(saved.status).toBe(201);
    const entry = (await saved.json()).entry;
    expect(entry.imageRef).toMatch(/^\/api\/uploads\//);
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ imageRef: entry.imageRef }) }));

    const filename = entry.imageRef.split("/").pop();
    const publicResponse = await serveImage(new Request(`${origin}${entry.imageRef}`), { params: Promise.resolve({ filename: filename ?? "" }) });
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get("content-type")).toBe("image/png");
  });

  it("retains the staged image and cleans up the promoted file when creating the gallery record fails", async () => {
    const staged = await uploadPost(uploadRequest(await pngImage()));
    const { token } = await staged.json();
    mocks.create.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await createEntry(adminJson("/api/admin/portfolio", "POST", {
      title: "New event",
      description: "A new gallery event description.",
      imageRef: "/images/gathering-study.svg",
      altText: "A new event image",
      sortOrder: 4,
      imageUploadToken: token,
    }));

    expect(response.status).toBe(503);
    expect(await readManagedGalleryImage(`${token}.png`)).toBeNull();
    expect(await readStagedGalleryImage(token)).not.toBeNull();
  });

  it("promotes staged uploads while creating and replacing hero, service, and About Us images", async () => {
    const stage = async () => {
      const response = await uploadPost(uploadRequest(await pngImage()));
      expect(response.status).toBe(201);
      return response.json() as Promise<{ token: string }>;
    };

    const heroToken = await stage();
    const createdSlide = await createHeroSlide(adminJson("/api/admin/hero-slides", "POST", {
      heading: "A new event slide",
      description: "A thoughtful event slide description.",
      buttonLabel: "Explore",
      destinationUrl: "/about",
      imageRef: "/images/gathering-study.svg",
      sortOrder: 2,
      imageUploadToken: heroToken.token,
    }));
    expect(createdSlide.status).toBe(201);
    const slide = (await createdSlide.json()).slide;
    expect(slide.imageRef).toMatch(/^\/api\/uploads\//);
    expect(await readStagedGalleryImage(heroToken.token)).toBeNull();
    expect(await readManagedGalleryImage(slide.imageRef.split("/").pop()!)).not.toBeNull();

    const heroReplacement = await stage();
    const previousHeroImage = currentHero.imageRef;
    const updatedSlide = await updateHeroSlide(adminJson(`/api/admin/hero-slides/${entryId}`, "PATCH", {
      heading: "Replaced slide image",
      imageUploadToken: heroReplacement.token,
      expectedImageRef: previousHeroImage,
    }), { params: Promise.resolve({ id: entryId }) });
    expect(updatedSlide.status).toBe(200);
    expect((await updatedSlide.json()).slide.imageRef).toMatch(/^\/api\/uploads\//);
    expect(await readStagedGalleryImage(heroReplacement.token)).toBeNull();

    const serviceToken = await stage();
    const createdService = await createService(adminJson("/api/admin/services", "POST", {
      slug: "private-events",
      title: "Private events",
      kicker: "Thoughtful planning",
      description: "A service description long enough to pass validation.",
      detail: "Service details long enough to pass validation.",
      imageRef: null,
      sortOrder: 1,
      imageUploadToken: serviceToken.token,
    }));
    expect(createdService.status).toBe(201);
    const service = (await createdService.json()).service;
    expect(service.imageRef).toMatch(/^\/api\/uploads\//);
    expect(await readStagedGalleryImage(serviceToken.token)).toBeNull();

    const serviceReplacement = await stage();
    const updatedService = await updateService(adminJson(`/api/admin/services/${entryId}`, "PATCH", {
      title: "Wedding celebrations",
      imageUploadToken: serviceReplacement.token,
      expectedImageRef: "",
    }), { params: Promise.resolve({ id: entryId }) });
    expect(updatedService.status).toBe(200);
    expect((await updatedService.json()).service.imageRef).toMatch(/^\/api\/uploads\//);
    expect(await readStagedGalleryImage(serviceReplacement.token)).toBeNull();

    const aboutToken = await stage();
    const updatedAbout = await updateAboutUs(adminJson("/api/admin/about-us", "PUT", {
      eyebrow: "Our story",
      heading: "Events thoughtfully made",
      firstParagraph: "We plan memorable events for families, couples, and businesses.",
      secondParagraph: "Our team coordinates venues, staging, catering, and logistics.",
      imageUrl: "/images/gathering-study.svg",
      imageCaption: "A memorable gathering",
      buttonLabel: "More About Us",
      destinationUrl: "/about",
      isVisible: true,
      imageUploadToken: aboutToken.token,
      expectedImageRef: "/images/gathering-study.svg",
    }));
    expect(updatedAbout.status).toBe(200);
    expect((await updatedAbout.json()).aboutUs.imageUrl).toMatch(/^\/api\/uploads\//);
    expect(await readStagedGalleryImage(aboutToken.token)).toBeNull();
  });

  it("keeps the old image until a successful replacement and removes it only when unreferenced", async () => {
    const oldStaged = await stageGalleryImage(await pngImage());
    const oldImage = await promoteStagedGalleryImage(oldStaged.token);
    currentEntry.imageRef = oldImage.imageRef;
    const staged = await uploadPost(uploadRequest(await pngImage()));
    const { token } = await staged.json();

    const response = await updateEntry(adminJson(`/api/admin/portfolio/${entryId}`, "PATCH", {
      title: "Updated event",
      description: "The updated gallery event description.",
      altText: "The replacement event image",
      sortOrder: 4,
      expectedImageRef: oldImage.imageRef,
      imageUploadToken: token,
    }), { params: Promise.resolve({ id: entryId }) });

    expect(response.status).toBe(200);
    const saved = (await response.json()).entry;
    expect(saved.imageRef).not.toBe(oldImage.imageRef);
    expect(await readManagedGalleryImage(oldImage.filename)).toBeNull();
    expect(await readManagedGalleryImage(saved.imageRef.split("/").pop())).not.toBeNull();
  });

  it("preserves a shared managed image and safely replaces it with a bundled image", async () => {
    const oldStaged = await stageGalleryImage(await pngImage());
    const oldImage = await promoteStagedGalleryImage(oldStaged.token);
    currentEntry.imageRef = oldImage.imageRef;
    mocks.findFirst.mockImplementation(async ({ where }) => where.imageRef === oldImage.imageRef ? { id: "another-gallery-entry" } : null);

    const response = await updateEntry(adminJson(`/api/admin/portfolio/${entryId}`, "PATCH", {
      imageRef: "/images/table-study.svg",
      expectedImageRef: oldImage.imageRef,
      title: "Bundled event",
    }), { params: Promise.resolve({ id: entryId }) });

    expect(response.status).toBe(200);
    expect(currentEntry.imageRef).toBe("/images/table-study.svg");
    expect(await readManagedGalleryImage(oldImage.filename)).not.toBeNull();
  });

  it("retains the saved image and removes a new file when the database replacement fails", async () => {
    const oldStaged = await stageGalleryImage(await pngImage());
    const oldImage = await promoteStagedGalleryImage(oldStaged.token);
    currentEntry.imageRef = oldImage.imageRef;
    const staged = await uploadPost(uploadRequest(await pngImage()));
    const { token } = await staged.json();
    mocks.updateMany.mockRejectedValueOnce(new Error("database unavailable"));

    const response = await updateEntry(adminJson(`/api/admin/portfolio/${entryId}`, "PATCH", {
      title: "Updated event",
      description: "The updated gallery event description.",
      altText: "The replacement event image",
      sortOrder: 4,
      expectedImageRef: oldImage.imageRef,
      imageUploadToken: token,
    }), { params: Promise.resolve({ id: entryId }) });

    expect(response.status).toBe(503);
    expect(currentEntry.imageRef).toBe(oldImage.imageRef);
    expect(await readManagedGalleryImage(oldImage.filename)).not.toBeNull();
    expect(mocks.findFirst).toHaveBeenCalled();
  });

  it("does not fail a successful replacement when old-image cleanup cannot be checked", async () => {
    const oldStaged = await stageGalleryImage(await pngImage());
    const oldImage = await promoteStagedGalleryImage(oldStaged.token);
    currentEntry.imageRef = oldImage.imageRef;
    const staged = await uploadPost(uploadRequest(await pngImage()));
    const { token } = await staged.json();
    mocks.findFirst.mockRejectedValueOnce(new Error("cleanup query unavailable"));

    const response = await updateEntry(adminJson(`/api/admin/portfolio/${entryId}`, "PATCH", {
      title: "Updated event",
      description: "The updated gallery event description.",
      altText: "The replacement event image",
      sortOrder: 4,
      expectedImageRef: oldImage.imageRef,
      imageUploadToken: token,
    }), { params: Promise.resolve({ id: entryId }) });

    expect(response.status).toBe(200);
    expect(currentEntry.imageRef).not.toBe(oldImage.imageRef);
    expect(await readManagedGalleryImage(oldImage.filename)).not.toBeNull();
  });
});
