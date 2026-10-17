export type ServiceInput = {
  slug: string;
  title: string;
  kicker: string;
  description: string;
  detail: string;
  imageRef: string | null;
  sortOrder: number;
};

export type PortfolioInput = {
  title: string;
  description: string;
  imageRef: string;
  altText: string;
  sortOrder: number;
};

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

const imageReferences = new Set([
  "/images/gathering-study.svg",
  "/images/table-study.svg",
  "/images/colour-study.svg",
]);
const serviceImageReferences = new Set(imageReferences);

function objectValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
}

function sortOrder(value: unknown) {
  return value === undefined ? 0 : Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1000 ? Number(value) : null;
}

export function validateServiceInput(value: unknown): Validation<ServiceInput> {
  if (!objectValue(value)) return { ok: false, message: "A valid service is required." };
  const slug = text(value.slug, 2, 80);
  const title = text(value.title, 2, 100);
  const kicker = text(value.kicker, 2, 120);
  const description = text(value.description, 10, 1000);
  const detail = text(value.detail, 10, 2000);
  const imageRef = value.imageRef === undefined || value.imageRef === null || value.imageRef === "" ? null : text(value.imageRef, 1, 200);
  const order = sortOrder(value.sortOrder);
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !title || !kicker || !description || !detail || (imageRef !== null && !serviceImageReferences.has(imageRef)) || order === null) {
    return { ok: false, message: "Check the service fields and try again." };
  }
  return { ok: true, value: { slug, title, kicker, description, detail, imageRef, sortOrder: order } };
}

export function validateServicePatch(value: unknown): Validation<Partial<ServiceInput> & { isActive?: boolean }> {
  if (!objectValue(value) || Object.keys(value).length === 0) return { ok: false, message: "At least one valid service field is required." };
  const allowed = new Set(["slug", "title", "kicker", "description", "detail", "imageRef", "sortOrder", "isActive"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return { ok: false, message: "Check the service fields and try again." };
  const result: Partial<ServiceInput> & { isActive?: boolean } = {};
  for (const key of ["slug", "title", "kicker", "description", "detail"] as const) {
    if (key in value) {
      const limits = { slug: [2, 80], title: [2, 100], kicker: [2, 120], description: [10, 1000], detail: [10, 2000] }[key];
      const item = text(value[key], limits[0], limits[1]);
      if (!item || (key === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item))) return { ok: false, message: "Check the service fields and try again." };
      result[key] = item;
    }
    if ("imageRef" in value) {
      if (value.imageRef === null || value.imageRef === "") result.imageRef = null;
      else {
        const imageRef = text(value.imageRef, 1, 200);
        if (!imageRef || !serviceImageReferences.has(imageRef)) return { ok: false, message: "Choose an approved local service image." };
        result.imageRef = imageRef;
      }
    }
  }
  if ("sortOrder" in value) {
    const order = sortOrder(value.sortOrder);
    if (order === null) return { ok: false, message: "Check the service fields and try again." };
    result.sortOrder = order;
  }
  if ("isActive" in value) {
    if (typeof value.isActive !== "boolean") return { ok: false, message: "Check the service status and try again." };
    result.isActive = value.isActive;
  }
  return { ok: true, value: result };
}

export function validatePortfolioInput(value: unknown): Validation<PortfolioInput> {
  if (!objectValue(value)) return { ok: false, message: "A valid portfolio entry is required." };
  const title = text(value.title, 2, 120);
  const description = text(value.description, 10, 1000);
  const imageRef = text(value.imageRef, 1, 200);
  const altText = text(value.altText, 5, 300);
  const order = sortOrder(value.sortOrder);
  if (!title || !description || !imageRef || !imageReferences.has(imageRef) || !altText || order === null) {
    return { ok: false, message: "Check the portfolio fields and choose an approved local image." };
  }
  return { ok: true, value: { title, description, imageRef, altText, sortOrder: order } };
}

export function validatePortfolioPatch(value: unknown): Validation<Partial<PortfolioInput> & { isPublished?: boolean }> {
  if (!objectValue(value) || Object.keys(value).length === 0) return { ok: false, message: "At least one valid portfolio field is required." };
  const allowed = new Set(["title", "description", "imageRef", "altText", "sortOrder", "isPublished"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return { ok: false, message: "Check the portfolio fields and try again." };
  const result: Partial<PortfolioInput> & { isPublished?: boolean } = {};
  for (const key of ["title", "description", "imageRef", "altText"] as const) {
    if (key in value) {
      const limits = { title: [2, 120], description: [10, 1000], imageRef: [1, 200], altText: [5, 300] }[key];
      const item = text(value[key], limits[0], limits[1]);
      if (!item || (key === "imageRef" && !imageReferences.has(item))) return { ok: false, message: "Check the portfolio fields and choose an approved local image." };
      result[key] = item;
    }
  }
  if ("sortOrder" in value) {
    const order = sortOrder(value.sortOrder);
    if (order === null) return { ok: false, message: "Check the portfolio fields and try again." };
    result.sortOrder = order;
  }
  for (const key of ["isPublished"] as const) {
    if (key in value) {
      if (typeof value[key] !== "boolean") return { ok: false, message: "Check the portfolio status and try again." };
      result[key] = value[key];
    }
  }
  return { ok: true, value: result };
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 12_000) return null;
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 12_000) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return objectValue(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
