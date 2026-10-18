export type HomepageTestimonialEntry = {
  id: string;
  name: string;
  text: string;
  eventType?: string | null;
  eventDate?: string | null;
  rating?: number | null;
  label?: string | null;
  imageRef?: string | null;
  isPublished: boolean;
  sortOrder: number;
};

export type HomepageTestimonialsInput = {
  eyebrow: string;
  heading: string;
  description: string;
  isVisible: boolean;
  testimonialIds: string[];
};

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

export const defaultHomepageTestimonials: Omit<HomepageTestimonialsInput, "testimonialIds"> = {
  eyebrow: "KIND WORDS",
  heading: "Memories That Speak for Themselves",
  description: "The moments we create are best described by the people who experience them.",
  isVisible: true,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, minimum: number, maximum: number) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum ? value.trim() : null;
}

export function validateHomepageTestimonials(value: unknown): Validation<HomepageTestimonialsInput> {
  if (!isObject(value)) return { ok: false, message: "Homepage testimonials content is required." };
  const allowed = ["eyebrow", "heading", "description", "isVisible", "testimonialIds"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    return { ok: false, message: "Check the homepage testimonials fields and try again." };
  }

  const eyebrow = text(value.eyebrow, 2, 80);
  const heading = text(value.heading, 2, 200);
  const description = text(value.description, 0, 500);
  if (!eyebrow || !heading || description === null || typeof value.isVisible !== "boolean") {
    return { ok: false, message: "Check the homepage testimonials fields and try again." };
  }
  if (!Array.isArray(value.testimonialIds) || value.testimonialIds.length > 20) {
    return { ok: false, message: "Select no more than 20 testimonials." };
  }

  const testimonialIds: string[] = [];
  for (const id of value.testimonialIds) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return { ok: false, message: "Choose valid testimonials." };
    }
    if (testimonialIds.includes(id)) return { ok: false, message: "A testimonial can only be selected once." };
    testimonialIds.push(id);
  }

  return { ok: true, value: { eyebrow, heading, description, isVisible: value.isVisible, testimonialIds } };
}

export function validateTestimonialRecord(value: unknown): Validation<Omit<HomepageTestimonialEntry, "id" | "isPublished" | "sortOrder"> & { isPublished: boolean; sortOrder: number }> {
  if (!isObject(value)) return { ok: false, message: "Testimonial content is required." };
  const allowed = ["name", "text", "eventType", "eventDate", "rating", "label", "imageRef", "isPublished", "sortOrder"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    return { ok: false, message: "Check the testimonial fields and try again." };
  }

  const name = text(value.name, 2, 120);
  const textValue = text(value.text, 20, 1000);
  const eventType = value.eventType === undefined || value.eventType === null ? null : text(value.eventType, 0, 100);
  const eventDate = value.eventDate === undefined || value.eventDate === null ? null : text(value.eventDate, 0, 40);
  const label = value.label === undefined || value.label === null ? null : text(value.label, 0, 80);
  const imageRef = value.imageRef === undefined || value.imageRef === null ? null : typeof value.imageRef === "string" ? value.imageRef.trim() : null;
  const isPublished = typeof value.isPublished === "boolean" ? value.isPublished : false;
  const sortOrder = Number.isInteger(value.sortOrder) ? Number(value.sortOrder) : 0;
  const rating = value.rating === undefined || value.rating === null ? null : Number(value.rating);

  if (!name || !textValue || typeof isPublished !== "boolean") {
    return { ok: false, message: "Testimonial name and review text are required." };
  }
  if (eventType !== null && eventType === "") return { ok: false, message: "Testimonial event type is invalid." };
  if (eventDate !== null && eventDate === "") return { ok: false, message: "Testimonial event date is invalid." };
  if (label !== null && label === "") return { ok: false, message: "Testimonial label is invalid." };
  if (imageRef !== null && !/^(?:\/images\/.*|\/api\/uploads\/.*)$/i.test(imageRef)) {
    return { ok: false, message: "Choose a valid testimonial photo or leave it blank." };
  }
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    return { ok: false, message: "Rating must be between 1 and 5." };
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
    return { ok: false, message: "Display order must be a valid integer." };
  }

  return { ok: true, value: {
    name,
    text: textValue,
    eventType: eventType ?? null,
    eventDate: eventDate ?? null,
    rating: rating ?? null,
    label: label ?? null,
    imageRef: imageRef ?? null,
    isPublished,
    sortOrder,
  } };
}
