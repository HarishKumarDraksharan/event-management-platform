import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroCarousel } from "../components/hero-carousel";
import type { PublicHeroSlide } from "../lib/public-content";

const slides: PublicHeroSlide[] = [
  { id: "one", heading: "Gather with purpose.", description: "A considered celebration for the people in the room.", buttonLabel: "Contact us", destinationUrl: "/contact", imageRef: "/images/gathering-study.svg", sortOrder: 1 },
  { id: "two", heading: "Make the day yours.", description: "Thoughtful details for a meaningful moment.", buttonLabel: "Our services", destinationUrl: "/#services", imageRef: "/images/table-study.svg", sortOrder: 2 },
  { id: "three", heading: "Celebrate together.", description: "A welcoming place for your story.", buttonLabel: "View work", destinationUrl: "/portfolio", imageRef: "/images/colour-study.svg", sortOrder: 3 },
];

function setMotionPreference(reduced: boolean) {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
    matches: reduced,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("homepage hero carousel", () => {
  it("supports previous/next controls, slide indicators, and touch swipes", () => {
    setMotionPreference(true);
    render(<HeroCarousel slides={slides} />);
    const carousel = screen.getByRole("region", { name: "TSG EVENTS featured moments" });

    expect(screen.getByRole("heading", { name: "Gather with purpose." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByRole("heading", { name: "Make the day yours." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));
    expect(screen.getByRole("heading", { name: "Celebrate together." })).toBeTruthy();
    fireEvent.touchStart(carousel, { touches: [{ identifier: 1, target: carousel, clientX: 220, clientY: 0 }] });
    fireEvent.touchEnd(carousel, { changedTouches: [{ identifier: 1, target: carousel, clientX: 100, clientY: 0 }] });
    expect(screen.getByRole("heading", { name: "Gather with purpose." })).toBeTruthy();
  });

  it("automatically advances, pauses on request, and does not auto-advance for reduced motion", () => {
    vi.useFakeTimers();
    setMotionPreference(false);
    const view = render(<HeroCarousel slides={slides} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole("heading", { name: "Make the day yours." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Pause automatic slides" }));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole("heading", { name: "Make the day yours." })).toBeTruthy();

    view.unmount();
    cleanup();
    vi.clearAllTimers();
    setMotionPreference(true);
    render(<HeroCarousel slides={slides} intervalMs={1000} />);
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole("heading", { name: "Gather with purpose." })).toBeTruthy();
  });
});
