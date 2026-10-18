export type PublicService = {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  description: string;
  detail: string;
  imageRef: string | null;
};

export type PublicPortfolioEntry = {
  id: string;
  title: string;
  description: string;
  imageRef: string;
  altText: string;
  isSample: boolean;
};

export type PublicHeroSlide = {
  id: string;
  heading: string;
  description: string;
  buttonLabel: string;
  destinationUrl: string;
  imageRef: string;
  sortOrder: number;
};

export type PublicHomepageIntroduction = {
  eyebrow: string;
  heading: string;
  highlight: string;
  description: string;
};

export type PublicAboutUs = {
  eyebrow: string;
  heading: string;
  firstParagraph: string;
  secondParagraph: string;
  imageUrl: string;
  imageCaption: string;
  buttonLabel: string;
  destinationUrl: string;
  isVisible: boolean;
};

export type PublicHomepageServices = {
  eyebrow: string;
  heading: string;
  highlight: string;
  isVisible: boolean;
  serviceIds: string[] | null;
};

export type PublicHomepageFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type PublicHomepageWhyChooseUs = {
  heading: string;
  supportingText: string;
  isVisible: boolean;
  featureCards: PublicHomepageFeature[];
};

export type PublicHomepageGalleryEntry = {
  id: string;
  title: string;
  imageRef: string;
  altText: string;
};

export type PublicHomepageGallery = {
  eyebrow: string;
  heading: string;
  isVisible: boolean;
  entries: PublicHomepageGalleryEntry[];
};

export type PublicHomepageTestimonial = {
  id: string;
  name: string;
  text: string;
  eventType: string | null;
  eventDate: string | null;
  rating: number | null;
  label: string | null;
  imageRef: string | null;
};

export type PublicHomepageTestimonials = {
  eyebrow: string;
  heading: string;
  description: string;
  isVisible: boolean;
  testimonials: PublicHomepageTestimonial[];
};

export const defaultHomepageIntroduction: PublicHomepageIntroduction = {
  eyebrow: "TSG EVENTS · EVENT PLANNING",
  heading: "Big days, little details,",
  highlight: "all thoughtfully held.",
  description: "Every gathering has its own rhythm. We help bring the people, place and many moving pieces together, so the experience feels considered from the first welcome to the last goodbye.",
};

async function publicApi<T>(path: string, key: "services" | "entries" | "slides" | "introduction" | "aboutUs" | "section" | "whyChooseUs" | "gallery"): Promise<T[] | T | null> {
  try {
    const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    const response = await fetch(`${baseUrl}/api/${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !(key in data)) return null;
    const value = (data as Record<string, unknown>)[key];
    if (key === "introduction" || key === "aboutUs" || key === "section" || key === "gallery") return value as T;
    return Array.isArray(value) ? value as T[] : null;
  } catch {
    return null;
  }
}

export const getPublicServices = () => publicApi<PublicService>("services", "services") as Promise<PublicService[] | null>;
export const getPublicPortfolio = () => publicApi<PublicPortfolioEntry>("portfolio", "entries") as Promise<PublicPortfolioEntry[] | null>;
export const getPublicHeroSlides = () => publicApi<PublicHeroSlide>("hero-slides", "slides") as Promise<PublicHeroSlide[] | null>;
export const getPublicHomepageIntroduction = () => publicApi<PublicHomepageIntroduction>("homepage-introduction", "introduction") as Promise<PublicHomepageIntroduction | null>;
export const getPublicAboutUs = () => publicApi<PublicAboutUs>("about-us", "aboutUs") as Promise<PublicAboutUs | null>;
export const getPublicHomepageServices = () => publicApi<PublicHomepageServices>("homepage-services", "section") as Promise<PublicHomepageServices | null>;
export const getPublicHomepageWhyChooseUs = () => publicApi<PublicHomepageWhyChooseUs>("homepage-why-choose-us", "section") as Promise<PublicHomepageWhyChooseUs | null>;
export const getPublicHomepageTestimonials = async () => {
  try {
    const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    const response = await fetch(`${baseUrl}/api/homepage-testimonials`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!isRecord(data) || !isRecord(data.section) || !Array.isArray(data.testimonials)) return null;
    const { eyebrow, heading, description, isVisible } = data.section;
    if (!isNonEmptyString(eyebrow) || !isNonEmptyString(heading) || !isNonEmptyString(description) || typeof isVisible !== "boolean") return null;
    const testimonials: PublicHomepageTestimonial[] = [];
    for (const value of data.testimonials) {
      if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name) || !isNonEmptyString(value.text)) return null;
      testimonials.push({
        id: String(value.id),
        name: String(value.name),
        text: String(value.text),
        eventType: typeof value.eventType === "string" ? value.eventType : null,
        eventDate: typeof value.eventDate === "string" ? value.eventDate : null,
        rating: typeof value.rating === "number" ? value.rating : null,
        label: typeof value.label === "string" ? value.label : null,
        imageRef: typeof value.imageRef === "string" ? value.imageRef : null,
      });
    }
    return { eyebrow, heading, description, isVisible, testimonials };
  } catch {
    return null;
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function getPublicHomepageGallery(): Promise<PublicHomepageGallery | null> {
  try {
    const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    const response = await fetch(`${baseUrl}/api/homepage-gallery`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!isRecord(data) || !isRecord(data.section) || !Array.isArray(data.entries)) return null;

    const { eyebrow, heading, isVisible } = data.section;
    if (!isNonEmptyString(eyebrow) || !isNonEmptyString(heading) || typeof isVisible !== "boolean") return null;

    const entries: PublicHomepageGalleryEntry[] = [];
    for (const value of data.entries) {
      if (!isRecord(value)
        || !isNonEmptyString(value.id)
        || !isNonEmptyString(value.title)
        || !isNonEmptyString(value.imageRef)
        || !isNonEmptyString(value.altText)) return null;
      entries.push({
        id: value.id,
        title: value.title,
        imageRef: value.imageRef,
        altText: value.altText,
      });
    }

    return { eyebrow, heading, isVisible, entries };
  } catch {
    return null;
  }
}
