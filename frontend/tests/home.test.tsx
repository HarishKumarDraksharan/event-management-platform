import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "../app/(public)/page";
import AboutPage from "../app/(public)/about/page";
import PortfolioPage from "../app/(public)/portfolio/page";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { HomepageServicesSection } from "../components/homepage-services-section";
import type { PublicHeroSlide } from "../lib/public-content";
import { EnquiryForm } from "../components/enquiry-form";
import { siteMetadata } from "../lib/metadata";

const nativeAnimate = HTMLElement.prototype.animate;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (nativeAnimate) Object.defineProperty(HTMLElement.prototype, "animate", { configurable: true, value: nativeAnimate });
  else Reflect.deleteProperty(HTMLElement.prototype, "animate");
});

const services = [
  { id: "1", slug: "weddings", title: "Weddings", kicker: "A DAY THAT FEELS LIKE YOU", description: "A thoughtful plan for the day, and all the moments around it.", detail: "Planning details for a wedding day and celebration.", imageRef: null },
  { id: "2", slug: "corporate-events", title: "Corporate events", kicker: "GATHER WITH PURPOSE", description: "Purposeful gatherings shaped around your people and plans.", detail: "A considered company gathering.", imageRef: "/images/table-study.svg" },
  { id: "3", slug: "birthdays", title: "Birthdays", kicker: "MAKE THEIR DAY THEIR OWN", description: "A personal celebration for the person at the centre of it.", detail: "A personal birthday plan.", imageRef: "/images/colour-study.svg" },
  { id: "4", slug: "private-celebrations", title: "Private celebrations", kicker: "FOR THE MOMENTS THAT BRING YOU TOGETHER", description: "An intimate get-together, made to feel unmistakably yours.", detail: "A plan shaped around the occasion.", imageRef: null },
];
const homepageServices = { eyebrow: "What We Do", heading: "Top Event Planning Services in Chennai", highlight: "Event Planning Services", isVisible: true, serviceIds: ["1", "2", "3", "4"] };
const entries = [
  { id: "a", title: "A gathering study", description: "Original sample illustration of a candlelit celebration table.", imageRef: "/images/gathering-study.svg", altText: "Sample illustration of a candlelit celebration table", isSample: true },
  { id: "b", title: "Details in place", description: "Original sample illustration of an event table.", imageRef: "/images/table-study.svg", altText: "Sample illustration of an event table", isSample: true },
  { id: "c", title: "A colour story", description: "Original abstract sample illustration.", imageRef: "/images/colour-study.svg", altText: "Sample abstract event illustration", isSample: true },
];
const heroSlides: PublicHeroSlide[] = [
  { id: "slide-1", heading: "Make room for meaningful moments.", description: "From the first idea to the final farewell, we bring the details together so you can be right where you belong.", buttonLabel: "Tell us what you are planning", destinationUrl: "/contact", imageRef: "/images/gathering-study.svg", sortOrder: 1 },
  { id: "slide-2", heading: "Every gathering starts somewhere.", description: "Thoughtful plans make space for the people and moments that matter to you.", buttonLabel: "Explore our services", destinationUrl: "/#services", imageRef: "/images/table-study.svg", sortOrder: 2 },
];
const aboutUs = {
  eyebrow: "Our story",
  heading: "Best Event Management Company In Chennai, Tamil Nadu",
  firstParagraph: "We plan corporate events, weddings, receptions, birthdays and baby showers in Chennai.",
  secondParagraph: "Our team handles stage setup, lighting, catering and event logistics.",
  imageUrl: "/images/gathering-study.svg",
  imageCaption: "The Powerhouse of Events Management",
  buttonLabel: "More About Us",
  destinationUrl: "/about",
  isVisible: true,
};

function stubCatalog() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    return {
      ok: true,
      json: async () => url.endsWith("/api/hero-slides") ? { slides: heroSlides }
        : url.endsWith("/api/about-us") ? { aboutUs }
          : url.endsWith("/api/services") ? { services }
            : url.endsWith("/api/homepage-services") ? { section: homepageServices }
              : { entries },
    };
  }));
}

function mockCarouselAnimationSupport() {
  const animations: Array<{ keyframes: Keyframe[]; options: KeyframeAnimationOptions; animation: Animation; cancel: ReturnType<typeof vi.fn> }> = [];
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(function (this: HTMLElement, keyframes: Keyframe[] | PropertyIndexedKeyframes, options?: number | KeyframeAnimationOptions) {
      const frames = Array.isArray(keyframes) ? keyframes : [];
      const timing = typeof options === "number" ? { duration: options } : options ?? {};
      const cancel = vi.fn();
      const animation = {
        currentTime: 0,
        effect: { getTiming: () => ({ iterations: timing.iterations ?? 1 }) },
        onfinish: null as ((event: AnimationPlaybackEvent) => void) | null,
        cancel,
        pause: vi.fn(),
        play: vi.fn(),
      } as unknown as Animation;
      animations.push({ keyframes: frames, options: timing, animation, cancel });
      return animation;
    }),
  });
  vi.stubGlobal("ResizeObserver", class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) { this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    disconnect() {}
    unobserve() {}
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const viewport = this.classList.contains("home-services-viewport") ? this : this.closest<HTMLElement>(".home-services-viewport");
    const cardWidth = Number.parseFloat(viewport?.style.getPropertyValue("--service-card-width") ?? "") || 300;
    const width = this.classList.contains("home-services-viewport")
      ? 900
      : this.classList.contains("home-services-sequence")
        ? this.querySelectorAll(".home-service-slide").length * cardWidth
        : this.classList.contains("home-service-slide") ? cardWidth : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: 300, width, height: 300, toJSON: () => ({}) } as DOMRect;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("home-services-viewport") ? 900 : 0;
  });
  return animations;
}

describe("TSG EVENTS public website", () => {
  it("renders the hero, About Us, and services section in order without extra sections", async () => {
    stubCatalog();
    render(await Home());
    expect(screen.getByRole("heading", { name: /make room for meaningful moments/i })).toBeTruthy();
    const hero = screen.getByRole("region", { name: "TSG EVENTS featured moments" });
    expect(within(hero).getByRole("button", { name: "Next slide" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: aboutUs.heading })).toBeTruthy();
    expect(screen.getByText(aboutUs.eyebrow)).toBeTruthy();
    expect(screen.getByText(aboutUs.firstParagraph)).toBeTruthy();
    expect(screen.getByText(aboutUs.secondParagraph)).toBeTruthy();
    expect(screen.getByRole("heading", { name: homepageServices.heading })).toBeTruthy();
    const servicesCarousel = screen.getByRole("region", { name: "Event planning services" });
    expect(within(servicesCarousel).getByRole("link", { name: /Weddings/ }).getAttribute("href")).toBe("/services/weddings");
    expect(within(servicesCarousel).getByRole("link", { name: /Corporate events/ }).getAttribute("href")).toBe("/services/corporate-events");
    expect(within(servicesCarousel).getByRole("button", { name: "Next services" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "More About Us" }).getAttribute("href")).toBe("/about");
    expect(screen.getByRole("img", { name: aboutUs.imageCaption }).getAttribute("src")).toContain("/images/gathering-study.svg");
    expect(screen.getByText(aboutUs.imageCaption)).toBeTruthy();
    const aboutSection = document.querySelector<HTMLElement>("#about")!;
    expect(aboutSection.querySelector(".home-about-copy")).toBeTruthy();
    expect(aboutSection.querySelector(".home-about-image")).toBeTruthy();
    expect(aboutSection.querySelector(".home-about-image-frame")).toBeTruthy();
    expect(aboutSection.querySelector(".home-about-image-shade")).toBeTruthy();

    const main = screen.getByRole("main", { name: "" });
    expect([...main.children].map((child) => child.id)).toEqual(["home", "about", "services"]);
    expect(document.querySelector("#work, #introduction, .contact-band")).toBeNull();
    expect(screen.queryByRole("heading", { name: /stories worth gathering for|every gathering starts somewhere/i })).toBeNull();
  });

  it("shows service cards in configured order, uses a local image fallback, and moves with controls", () => {
    const animations = mockCarouselAnimationSupport();
    render(<HomepageServicesSection section={homepageServices} services={services} />);
    const carousel = screen.getByRole("region", { name: "Event planning services" });
    expect([...carousel.querySelectorAll(".home-services-sequence:not(.home-services-loop-copy) .home-service-title")].map((title) => title.textContent)).toEqual(["Weddings", "Corporate events", "Birthdays", "Private celebrations"]);
    expect(within(carousel).getByRole("img", { name: "Weddings event planning service" }).getAttribute("src")).toContain("/images/gathering-study.svg");
    expect(within(carousel).getByRole("link", { name: /Birthdays/ }).getAttribute("href")).toBe("/services/birthdays");
    expect(carousel.querySelectorAll("a")).toHaveLength(services.length);
    expect(carousel.querySelector(".home-services-loop-copy")?.getAttribute("aria-hidden")).toBe("true");
    expect(animations.some(({ options }) => options.iterations === Infinity)).toBe(true);
    fireEvent.click(within(carousel).getByRole("button", { name: "Next services" }));
    expect(animations.some(({ options }) => options.duration === 480)).toBe(true);
    const manualMove = animations.find(({ options }) => options.duration === 480)?.animation;
    act(() => { manualMove?.onfinish?.(new Event("finish") as AnimationPlaybackEvent); });
    expect(animations.filter(({ options }) => options.iterations === Infinity).length).toBeGreaterThan(1);
    fireEvent.click(within(carousel).getByRole("button", { name: "Previous services" }));
  });

  it("keeps fewer cards than the visible desktop count usable without empty carousel space", () => {
    mockCarouselAnimationSupport();
    const { container } = render(<HomepageServicesSection section={homepageServices} services={services.slice(0, 2)} />);
    const carousel = screen.getByRole("region", { name: "Event planning services" });
    expect(within(carousel).queryByRole("button", { name: "Next services" })).toBeNull();
    expect(within(carousel).getAllByRole("link")).toHaveLength(2);
    expect(container.querySelector<HTMLElement>(".home-services-viewport")?.style.getPropertyValue("--service-card-width")).toBe("450px");
  });

  it("starts a measured continuous loop and pauses it while hovered or focused", () => {
    const animations = mockCarouselAnimationSupport();
    const { container } = render(<HomepageServicesSection section={homepageServices} services={services} />);
    const loop = animations.filter(({ options }) => options.iterations === Infinity).at(-1);
    expect(loop?.options.easing).toBe("linear");
    expect(loop?.options.duration).toBeCloseTo(1200 / 34 * 1000);
    expect(loop?.keyframes[1]).toMatchObject({ transform: "translate3d(-1200px, 0, 0)" });
    const carousel = screen.getByRole("region", { name: "Event planning services" });
    fireEvent.mouseEnter(carousel);
    expect(loop?.animation.pause).toHaveBeenCalled();
    fireEvent.mouseLeave(carousel);
    expect(loop?.animation.play).toHaveBeenCalled();
    fireEvent.focus(within(carousel).getByRole("link", { name: /Weddings/ }));
    expect(animations.at(-1)?.animation.pause).toHaveBeenCalled();
    expect(container.querySelectorAll(".home-services-loop-copy a")).toHaveLength(0);
  });

  it("does not render the services section when hidden", () => {
    const { container } = render(<HomepageServicesSection section={{ ...homepageServices, isVisible: false }} services={services} />);
    expect(container.querySelector("#services")).toBeNull();
  });

  it("respects the reduced-motion preference by disabling automatic movement", async () => {
    const animations = mockCarouselAnimationSupport();
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    const { container } = render(<HomepageServicesSection section={homepageServices} services={services} />);
    await act(async () => { await Promise.resolve(); });
    const continuousAnimations = animations.filter(({ options }) => options.iterations === Infinity);
    expect(continuousAnimations).toHaveLength(0);
    expect(container.querySelector(".home-services-loop-copy")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next services" }));
    expect(animations.some(({ options }) => options.duration === 480)).toBe(false);
    expect(container.querySelector(".home-services-track")?.getAttribute("style")).toContain("translate3d(-300px");
  });

  it("uses saved About Us content and hides the section when it is not visible", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return {
        ok: true,
        json: async () => url.endsWith("/api/hero-slides")
          ? { slides: heroSlides }
          : { aboutUs: { ...aboutUs, eyebrow: "Saved eyebrow", heading: "Saved About Us heading", imageUrl: "/images/table-study.svg", imageCaption: "Saved image caption", buttonLabel: "Discover our story", destinationUrl: "/about", isVisible: true } },
      };
    }));
    const { unmount } = render(await Home());
    expect(screen.getByText("Saved eyebrow")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Saved About Us heading" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Saved image caption" }).getAttribute("src")).toContain("/images/table-study.svg");
    expect(screen.getByRole("link", { name: "Discover our story" }).getAttribute("href")).toBe("/about");
    unmount();

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => ({
      ok: true,
      json: async () => String(input).endsWith("/api/hero-slides") ? { slides: heroSlides } : { aboutUs: { ...aboutUs, isVisible: false } },
    })));
    render(await Home());
    expect(document.querySelector("#about")).toBeNull();
    expect(screen.getByRole("region", { name: "TSG EVENTS featured moments" })).toBeTruthy();
  });

  it("omits the services section when its saved visibility setting is disabled", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return {
        ok: true,
        json: async () => url.endsWith("/api/hero-slides") ? { slides: heroSlides }
          : url.endsWith("/api/about-us") ? { aboutUs }
            : url.endsWith("/api/services") ? { services }
              : { section: { ...homepageServices, isVisible: false } },
      };
    }));
    render(await Home());
    expect(document.querySelector("#services")).toBeNull();
    expect(screen.getByRole("heading", { name: aboutUs.heading })).toBeTruthy();
  });

  it("offers customer navigation and does not expose the admin sign-in publicly", () => {
    render(<SiteHeader services={services} />);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect([...nav.querySelectorAll(":scope > a, :scope > details > summary")].map((item) => item.getAttribute("aria-label") ?? item.textContent?.trim().replace(/\s+/g, " "))).toEqual(["Home", "About Us", "Services", "Gallery", "Contact", "Let's Talk"]);
    expect([...nav.querySelectorAll(":scope > a")].map((link) => [link.textContent?.trim(), link.getAttribute("href")])).toEqual([["Home", "/"], ["About Us", "/about"], ["Gallery", "/portfolio"], ["Contact", "/contact"], ["Let's Talk", "/contact"]]);
    for (const label of ["Home", "About Us", "Gallery", "Contact", "Let's Talk"]) expect(within(nav).getByRole("link", { name: label })).toBeTruthy();
    const dropdown = document.querySelector(".desktop-service-dropdown") as HTMLDetailsElement;
    const trigger = dropdown.querySelector("summary") as HTMLElement;
    fireEvent.pointerEnter(dropdown, { pointerType: "mouse" });
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const serviceList = dropdown.querySelector(".service-dropdown-list")!;
    fireEvent.pointerLeave(trigger, { pointerType: "mouse", relatedTarget: serviceList });
    fireEvent.pointerEnter(serviceList, { pointerType: "mouse" });
    expect((dropdown as HTMLDetailsElement).open).toBe(true);
    expect(within(dropdown).getByRole("link", { name: "All services" }).getAttribute("href")).toBe("/#services");
    expect(within(nav).getByRole("link", { name: "Weddings" }).getAttribute("href")).toBe("/services/weddings");
    const selectService = vi.fn((event: Event) => event.preventDefault());
    const weddingLink = within(nav).getByRole("link", { name: "Weddings" });
    weddingLink.addEventListener("click", selectService);
    fireEvent.click(weddingLink);
    expect(selectService).toHaveBeenCalledOnce();
    fireEvent.keyDown(dropdown, { key: "Escape" });
    expect((dropdown as HTMLDetailsElement).open).toBe(false);
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    fireEvent.click(screen.getByLabelText("Open navigation menu"));
    const mobile = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(mobile).toBeTruthy();
    expect([...mobile.querySelectorAll(":scope > a, :scope > details > summary")].map((item) => item.getAttribute("aria-label") ?? item.textContent?.trim().replace(/\s+/g, " "))).toEqual(["Home", "About Us", "Services", "Gallery", "Contact", "Let's Talk"]);
    expect([...mobile.querySelectorAll(":scope > a")].map((link) => [link.textContent?.trim(), link.getAttribute("href")])).toEqual([["Home", "/"], ["About Us", "/about"], ["Gallery", "/portfolio"], ["Contact", "/contact"], ["Let's Talk", "/contact"]]);
    const mobileServices = mobile.querySelector(".mobile-service-dropdown") as HTMLElement;
    const mobileTrigger = mobileServices.querySelector("summary") as HTMLElement;
    fireEvent.click(mobileTrigger);
    expect(mobileTrigger.getAttribute("aria-expanded")).toBe("true");
    const corporateLink = within(mobileServices).getByRole("link", { name: "Corporate events" });
    expect(corporateLink.getAttribute("href")).toBe("/services/corporate-events");
    const selectMobileService = vi.fn((event: Event) => event.preventDefault());
    corporateLink.addEventListener("click", selectMobileService);
    fireEvent.click(corporateLink);
    expect(selectMobileService).toHaveBeenCalledOnce();
    expect((mobile.closest("details") as HTMLDetailsElement).open).toBe(false);
  });

  it("opens and moves focus through services with the keyboard, then closes on Escape", async () => {
    render(<SiteHeader services={services} />);
    const dropdown = document.querySelector(".desktop-service-dropdown") as HTMLDetailsElement;
    const trigger = dropdown.querySelector("summary") as HTMLElement;
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const allServices = within(dropdown).getByRole("link", { name: "All services" });
    await waitFor(() => expect(document.activeElement).toBe(allServices));
    const weddings = within(dropdown).getByRole("link", { name: "Weddings" });
    fireEvent.keyDown(allServices, { key: "ArrowDown" });
    expect(document.activeElement).toBe(weddings);
    fireEvent.keyDown(weddings, { key: "Escape" });
    expect(dropdown.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("compacts the public header after the page scrolls", () => {
    vi.stubGlobal("scrollY", 80);
    render(<SiteHeader services={services} />);
    expect(document.querySelector(".site-header")?.classList.contains("is-compact")).toBe(true);
  });

  it("keeps the public footer customer-focused and labels sample art", async () => {
    render(<SiteFooter />);
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    cleanup();
    stubCatalog();
    render(await PortfolioPage());
    expect(screen.getByRole("heading", { name: /stories worth gathering for/i })).toBeTruthy();
    expect(screen.getAllByText("CONCEPT ART · SAMPLE")).toHaveLength(3);
    cleanup();
    render(<AboutPage />);
    expect(screen.getByRole("heading", { name: /good planning makes space for being there/i })).toBeTruthy();
    expect(screen.getByText(/company history, team details and location will be added when they are supplied/i)).toBeTruthy();
  });

  it("publishes branded site metadata", () => {
    expect(siteMetadata.title.default).toContain("TSG EVENTS");
    expect(siteMetadata.description).toContain("TSG EVENTS");
  });
});

describe("enquiry form", () => {
  it("submits to the public API route and announces success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => "cbab649a-425b-4962-835c-d5142b000052" });
    render(<EnquiryForm initialEventType="Wedding" />);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Asha Kumar" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "asha@example.org" } });
    fireEvent.change(screen.getByLabelText(/what are you planning/i), { target: { value: "Wedding" } });
    fireEvent.change(screen.getByLabelText(/a little about your plans/i), { target: { value: "We are planning a family wedding and would love to discuss coordination." } });
    fireEvent.submit(screen.getByRole("button", { name: /send your enquiry/i }).closest("form")!);
    await waitFor(() => expect(screen.getByText("Thank you. Your enquiry has been received.")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith("/api/enquiries", expect.objectContaining({ method: "POST" }));
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe("cbab649a-425b-4962-835c-d5142b000052");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).eventType).toBe("Wedding");
  });

  it("gives a safe retry message when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("internal failure")));
    vi.stubGlobal("crypto", { randomUUID: () => "cbab649a-425b-4962-835c-d5142b000052" });
    render(<EnquiryForm />);
    fireEvent.submit(screen.getByRole("button", { name: /send your enquiry/i }).closest("form")!);
    await waitFor(() => expect(screen.getByText(/couldn’t send your enquiry just now/i)).toBeTruthy());
  });
});
