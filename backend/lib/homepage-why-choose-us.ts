export const homepageFeatureIcons = ["users", "award", "mapPin", "headphones", "sparkles", "clipboard", "lightbulb", "heart"] as const;
export type HomepageFeatureIcon = typeof homepageFeatureIcons[number];

export type HomepageFeature = {
  id: string;
  title: string;
  description: string;
  icon: HomepageFeatureIcon;
};

export type HomepageWhyChooseUsInput = {
  heading: string;
  supportingText: string;
  isVisible: boolean;
  featureCards: HomepageFeature[];
};

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

export const defaultHomepageWhyChooseUs: HomepageWhyChooseUsInput = {
  heading: "Why Choose Chennai Events Management Company?",
  supportingText: "Thoughtful planning, trusted people and a steady hand make every celebration feel effortless.",
  isVisible: true,
  featureCards: [
    { id: "friendly-team", title: "Friendly Team", description: "We make every client feel welcome.", icon: "users" },
    { id: "committed-to-excellence", title: "Committed to Excellence", description: "We deliver on our promises.", icon: "award" },
    { id: "perfect-venues", title: "Perfect Venues", description: "The right setting for every occasion.", icon: "mapPin" },
    { id: "dedicated-support", title: "Dedicated Support", description: "We're here when you need us.", icon: "headphones" },
    { id: "unforgettable-experiences", title: "Unforgettable Experiences", description: "Creating memories that last.", icon: "sparkles" },
    { id: "expert-management", title: "Expert Management", description: "Professional planning and coordination.", icon: "clipboard" },
    { id: "creative-ideas", title: "Creative Ideas", description: "Fresh ideas for extraordinary events.", icon: "lightbulb" },
    { id: "personalized-events", title: "Personalized Events", description: "Every celebration is uniquely yours.", icon: "heart" },
  ],
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, minimum: number, maximum: number) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum
    ? value.trim()
    : null;
}

export function validateHomepageWhyChooseUs(value: unknown): Validation<HomepageWhyChooseUsInput> {
  if (!isObject(value)) return { ok: false, message: "Homepage Why Choose Us content is required." };
  const allowed = ["heading", "supportingText", "isVisible", "featureCards"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    return { ok: false, message: "Check the homepage Why Choose Us fields and try again." };
  }

  const heading = text(value.heading, 2, 200);
  const supportingText = text(value.supportingText, 2, 500);
  if (!heading || !supportingText || typeof value.isVisible !== "boolean") {
    return { ok: false, message: "Check the homepage Why Choose Us fields and try again." };
  }
  if (!Array.isArray(value.featureCards) || value.featureCards.length < 1 || value.featureCards.length > 12) {
    return { ok: false, message: "Add between 1 and 12 feature cards." };
  }

  const ids = new Set<string>();
  const featureCards: HomepageFeature[] = [];
  for (const item of value.featureCards) {
    if (!isObject(item) || Object.keys(item).some((key) => !["id", "title", "description", "icon"].includes(key))) {
      return { ok: false, message: "Check each feature card and try again." };
    }
    const id = text(item.id, 1, 50);
    const title = text(item.title, 2, 100);
    const description = text(item.description, 2, 300);
    if (!id || !/^[a-z0-9-]+$/i.test(id) || !title || !description
      || typeof item.icon !== "string" || !homepageFeatureIcons.includes(item.icon as HomepageFeatureIcon)) {
      return { ok: false, message: "Feature cards need a title, description, and supported icon." };
    }
    if (ids.has(id)) return { ok: false, message: "Feature card IDs must be unique." };
    ids.add(id);
    featureCards.push({ id, title, description, icon: item.icon as HomepageFeatureIcon });
  }

  return { ok: true, value: { heading, supportingText, isVisible: value.isVisible, featureCards } };
}
