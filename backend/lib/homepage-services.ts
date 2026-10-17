export type HomepageServicesInput = {
  eyebrow: string;
  heading: string;
  highlight: string;
  isVisible: boolean;
  serviceIds: string[];
};

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

export const defaultHomepageServices: Omit<HomepageServicesInput, "serviceIds"> = {
  eyebrow: "What We Do",
  heading: "Top Event Planning Services in Chennai",
  highlight: "Event Planning Services",
  isVisible: true,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, minimum: number, maximum: number) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum
    ? value.trim()
    : null;
}

export function validateHomepageServices(value: unknown): Validation<HomepageServicesInput> {
  if (!isObject(value)) return { ok: false, message: "Homepage services content is required." };
  const allowed = ["eyebrow", "heading", "highlight", "isVisible", "serviceIds"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    return { ok: false, message: "Check the homepage services fields and try again." };
  }

  const eyebrow = text(value.eyebrow, 2, 120);
  const heading = text(value.heading, 2, 200);
  const highlight = text(value.highlight, 0, 120);
  if (!eyebrow || !heading || highlight === null || typeof value.isVisible !== "boolean") {
    return { ok: false, message: "Check the homepage services fields and try again." };
  }
  if (!Array.isArray(value.serviceIds) || value.serviceIds.length > 100) {
    return { ok: false, message: "Choose a valid list of services." };
  }

  const serviceIds: string[] = [];
  for (const id of value.serviceIds) {
    if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return { ok: false, message: "Choose valid existing services." };
    }
    if (serviceIds.includes(id)) return { ok: false, message: "A service can only be selected once." };
    serviceIds.push(id);
  }

  return { ok: true, value: { eyebrow, heading, highlight, isVisible: value.isVisible, serviceIds } };
}
