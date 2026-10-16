export type HeroSlideInput = {
  heading: string;
  description: string;
  buttonLabel: string;
  destinationUrl: string;
  imageRef: string;
  sortOrder: number;
};

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

const imageReferences = new Set([
  "/images/gathering-study.svg",
  "/images/table-study.svg",
  "/images/colour-study.svg",
]);

function objectValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, min: number, max: number) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max ? value.trim() : null;
}

function order(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 1000 ? Number(value) : null;
}

function destination(value: unknown) {
  const path = text(value, 1, 300);
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) return null;
  try {
    const parsed = new URL(path, "https://tsg-events.invalid");
    return parsed.origin === "https://tsg-events.invalid" ? path : null;
  } catch {
    return null;
  }
}

export function validateHeroSlideInput(value: unknown): Validation<HeroSlideInput & { isPublished: boolean }> {
  if (!objectValue(value)) return { ok: false, message: "A valid homepage slide is required." };
  const heading = text(value.heading, 2, 120);
  const description = text(value.description, 10, 500);
  const buttonLabel = text(value.buttonLabel, 2, 80);
  const destinationUrl = destination(value.destinationUrl);
  const imageRef = text(value.imageRef, 1, 200);
  const sortOrder = order(value.sortOrder);
  const isPublished = value.isPublished === undefined ? false : value.isPublished;
  if (!heading || !description || !buttonLabel || !destinationUrl || !imageRef || !imageReferences.has(imageRef) || sortOrder === null || typeof isPublished !== "boolean") {
    return { ok: false, message: "Check the slide fields and choose an approved local image and site destination." };
  }
  return { ok: true, value: { heading, description, buttonLabel, destinationUrl, imageRef, sortOrder, isPublished } };
}

export function validateHeroSlidePatch(value: unknown): Validation<Partial<HeroSlideInput> & { isPublished?: boolean }> {
  if (!objectValue(value) || Object.keys(value).length === 0) return { ok: false, message: "At least one valid slide field is required." };
  const allowed = new Set(["heading", "description", "buttonLabel", "destinationUrl", "imageRef", "sortOrder", "isPublished"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return { ok: false, message: "Check the slide fields and try again." };
  const result: Partial<HeroSlideInput> & { isPublished?: boolean } = {};
  const limits = { heading: 120, description: 500, buttonLabel: 80, destinationUrl: 300, imageRef: 200 };
  for (const key of ["heading", "description", "buttonLabel", "destinationUrl", "imageRef"] as const) {
    if (!(key in value)) continue;
    const item = key === "destinationUrl" ? destination(value[key]) : text(value[key], key === "description" ? 10 : 2, limits[key]);
    if (!item || (key === "imageRef" && !imageReferences.has(item))) return { ok: false, message: "Check the slide fields and choose an approved local image and site destination." };
    result[key] = item;
  }
  if ("sortOrder" in value) {
    const sortOrder = order(value.sortOrder);
    if (sortOrder === null) return { ok: false, message: "Display order must be a whole number between 0 and 1000." };
    result.sortOrder = sortOrder;
  }
  if ("isPublished" in value) {
    if (typeof value.isPublished !== "boolean") return { ok: false, message: "Slide publication status must be true or false." };
    result.isPublished = value.isPublished;
  }
  return { ok: true, value: result };
}
