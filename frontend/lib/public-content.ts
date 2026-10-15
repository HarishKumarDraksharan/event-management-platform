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

async function publicApi<T>(path: string, key: "services" | "entries"): Promise<T[] | null> {
  try {
    const baseUrl = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    const response = await fetch(`${baseUrl}/api/${path}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !(key in data) || !Array.isArray((data as Record<string, unknown>)[key])) return null;
    return (data as Record<string, T[]>)[key];
  } catch {
    return null;
  }
}

export const getPublicServices = () => publicApi<PublicService>("services", "services");
export const getPublicPortfolio = () => publicApi<PublicPortfolioEntry>("portfolio", "entries");
