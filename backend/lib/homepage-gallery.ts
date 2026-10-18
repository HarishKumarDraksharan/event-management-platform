import { isManagedGalleryImageRef } from "./managed-gallery-image-ref";

export type HomepageGalleryInput = {
  eyebrow: string;
  heading: string;
  isVisible: boolean;
  entryIds: string[];
};

export type HomepageTestimonialInput = {
  eyebrow: string;
  heading: string;
  description: string;
  isVisible: boolean;
  testimonialIds: string[];
};

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

export const defaultHomepageGallery: Omit<HomepageGalleryInput, "entryIds"> = {
  eyebrow: "Moments We've Created",
  heading: "Showcasing Our Events & Memorable Moments",
  isVisible: true,
};

const approvedGalleryImageRefs = new Set([
  "/images/gathering-study.svg",
  "/images/table-study.svg",
  "/images/colour-study.svg",
]);

export function hasValidHomepageGalleryImage(imageRef: unknown): imageRef is string {
  return typeof imageRef === "string"
    && (approvedGalleryImageRefs.has(imageRef) || isManagedGalleryImageRef(imageRef));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, minimum: number, maximum: number) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum
    ? value.trim()
    : null;
}

export function validateHomepageGallery(value: unknown): Validation<HomepageGalleryInput> {
  if (!isObject(value)) return { ok: false, message: "Homepage Gallery content is required." };
  const allowed = ["eyebrow", "heading", "isVisible", "entryIds"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    return { ok: false, message: "Check the homepage Gallery fields and try again." };
  }

  const eyebrow = text(value.eyebrow, 2, 120);
  const heading = text(value.heading, 2, 200);
  if (!eyebrow || !heading || typeof value.isVisible !== "boolean") {
    return { ok: false, message: "Check the homepage Gallery fields and try again." };
  }
  if (!Array.isArray(value.entryIds) || value.entryIds.length > 30) {
    return { ok: false, message: "Select no more than 30 gallery entries." };
  }

  const entryIds: string[] = [];
  for (const id of value.entryIds) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return { ok: false, message: "Choose valid gallery entries." };
    }
    if (entryIds.includes(id)) return { ok: false, message: "A gallery entry can only be selected once." };
    entryIds.push(id);
  }

  return { ok: true, value: { eyebrow, heading, isVisible: value.isVisible, entryIds } };
}
