export type PublicService = {
  id: string;
  slug: string;
  title: string;
  kicker: string;
  description: string;
  detail: string;
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

export const defaultHomepageIntroduction: PublicHomepageIntroduction = {
  eyebrow: "TSG EVENTS · EVENT PLANNING",
  heading: "Big days, little details,",
  highlight: "all thoughtfully held.",
  description: "Every gathering has its own rhythm. We help bring the people, place and many moving pieces together, so the experience feels considered from the first welcome to the last goodbye.",
};

async function publicApi<T>(path: string, key: "services" | "entries" | "slides" | "introduction" | "aboutUs"): Promise<T[] | T | null> {
  try {
    const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    const response = await fetch(`${baseUrl}/api/${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !(key in data)) return null;
    const value = (data as Record<string, unknown>)[key];
    if (key === "introduction" || key === "aboutUs") return value as T;
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
