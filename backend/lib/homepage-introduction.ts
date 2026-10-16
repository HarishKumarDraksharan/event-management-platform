export type HomepageIntroductionInput = {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
};

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

export const defaultHomepageIntroduction: HomepageIntroductionInput = {
  eyebrow: "TSG EVENTS · EVENT PLANNING",
  heading: "Big days, little details,",
  highlight: "all thoughtfully held.",
  description: "Every gathering has its own rhythm. We help bring the people, place and many moving pieces together, so the experience feels considered from the first welcome to the last goodbye.",
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, minimum: number, maximum: number) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum ? value.trim() : null;
}

export function validateHomepageIntroduction(value: unknown): Validation<HomepageIntroductionInput> {
  if (!isObject(value)) return { ok: false, message: "Homepage introduction content is required." };
  const allowed = ["eyebrow", "heading", "highlight", "description"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    return { ok: false, message: "Check the introduction fields and try again." };
  }

  const eyebrow = text(value.eyebrow, 2, 120);
  const heading = text(value.heading, 2, 200);
  const highlight = text(value.highlight, 2, 120);
  const description = text(value.description, 10, 1000);
  if (!eyebrow || !heading || !highlight || !description) {
    return { ok: false, message: "Check the introduction fields and try again." };
  }

  return { ok: true, value: { eyebrow, heading, highlight, description } };
}
