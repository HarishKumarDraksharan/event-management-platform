export type AboutUsInput = {
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

type Validation<T> = { ok: true; value: T } | { ok: false; message: string };

export const defaultAboutUs: AboutUsInput = {
  eyebrow: "Our story",
  heading: "Best Event Management Company In Chennai, Tamil Nadu",
  firstParagraph: "TSG EVENTS brings thoughtful event management to Chennai, Tamil Nadu, turning important occasions into welcoming, memorable experiences. We plan corporate events, weddings, receptions, birthdays and baby showers with care for the people, purpose and details behind every gathering.",
  secondParagraph: "From stage setup and lighting to catering and event logistics, our team coordinates each moving part so you can spend less time managing arrangements and more time being present for the celebration.",
  imageUrl: "/images/gathering-study.svg",
  imageCaption: "The Powerhouse of Events Management",
  buttonLabel: "More About Us",
  destinationUrl: "/about",
  isVisible: true,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, minimum: number, maximum: number) {
  return typeof value === "string" && value.trim().length >= minimum && value.trim().length <= maximum ? value.trim() : null;
}

function localPath(value: unknown, maximum: number) {
  const path = text(value, 1, maximum);
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) return null;
  try {
    return new URL(path, "https://tsg-events.invalid").origin === "https://tsg-events.invalid" ? path : null;
  } catch {
    return null;
  }
}

function imageUrl(value: unknown) {
  const url = text(value, 1, 1000);
  if (!url || /[\u0000-\u0020]/.test(url)) return null;
  if (localPath(url, 1000)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname ? url : null;
  } catch {
    return null;
  }
}

export function validateAboutUs(value: unknown): Validation<AboutUsInput> {
  if (!isObject(value)) return { ok: false, message: "About Us content is required." };
  const allowed = new Set(["eyebrow", "heading", "firstParagraph", "secondParagraph", "imageUrl", "imageCaption", "buttonLabel", "destinationUrl", "isVisible"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return { ok: false, message: "Check the About Us fields and try again." };
  const eyebrow = text(value.eyebrow, 2, 120);
  const heading = text(value.heading, 2, 200);
  const firstParagraph = text(value.firstParagraph, 10, 2000);
  const secondParagraph = text(value.secondParagraph, 10, 2000);
  const validatedImageUrl = imageUrl(value.imageUrl);
  const imageCaption = text(value.imageCaption, 2, 200);
  const buttonLabel = text(value.buttonLabel, 2, 80);
  const destinationUrl = localPath(value.destinationUrl, 300);
  if (!eyebrow || !heading || !firstParagraph || !secondParagraph || !validatedImageUrl || !imageCaption || !buttonLabel || !destinationUrl || typeof value.isVisible !== "boolean") {
    return { ok: false, message: "Check the About Us text, image URL, destination, and visibility fields." };
  }
  return { ok: true, value: { eyebrow, heading, firstParagraph, secondParagraph, imageUrl: validatedImageUrl, imageCaption, buttonLabel, destinationUrl, isVisible: value.isVisible } };
}
