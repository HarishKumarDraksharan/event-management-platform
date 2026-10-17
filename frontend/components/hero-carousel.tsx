"use client";

import Image from "next/image";
import Link from "next/link";
import { TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import type { PublicHeroSlide } from "../lib/public-content";

type HeroCarouselProps = { slides: PublicHeroSlide[]; intervalMs?: number };

export function HeroCarousel({ slides, intervalMs = 6500 }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = useCallback((index: number) => {
    setActiveIndex(((index % count) + count) % count);
  }, [count]);

  useEffect(() => {
    const preference = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const updatePreference = () => setReducedMotion(preference?.matches ?? false);
    const updateVisibility = () => setIsVisible(document.visibilityState === "visible");
    updatePreference();
    updateVisibility();
    preference?.addEventListener("change", updatePreference);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      preference?.removeEventListener("change", updatePreference);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (count < 2 || reducedMotion || isHovered || isFocused || isPausedByUser || !isVisible) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % count), intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, reducedMotion, isHovered, isFocused, isPausedByUser, isVisible]);

  if (count === 0) {
    return <section className="hero-empty" id="home" aria-labelledby="hero-empty-heading">
      <p className="eyebrow">TSG EVENTS · EVENT PLANNING</p>
      <h1 id="hero-empty-heading">Thoughtful events,<br />made for <em>your story.</em></h1>
      <Link className="button button-dark" href="/contact">Tell us what you are planning <span aria-hidden="true">↗</span></Link>
    </section>;
  }

  function finishTouch(event: TouchEvent<HTMLElement>) {
    const startingPoint = touchStartX.current;
    const endingPoint = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startingPoint === null || endingPoint === undefined || Math.abs(endingPoint - startingPoint) < 45) return;
    goTo(activeIndex + (endingPoint < startingPoint ? 1 : -1));
  }

  return <section
    className="hero-carousel"
    id="home"
    aria-roledescription="carousel"
    aria-label="TSG EVENTS featured moments"
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    onFocusCapture={() => setIsFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false); }}
    onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
    onTouchEnd={finishTouch}
  >
    <div className="hero-slide-stack" aria-live="off">
      {slides.map((slide, index) => <article className={`hero-slide${index === activeIndex ? " is-current" : ""}`} key={slide.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${count}`} aria-hidden={index !== activeIndex}>
        <Image src={slide.imageRef} alt="" fill priority={index === 0} sizes="100vw" className="hero-slide-image" unoptimized={slide.imageRef.startsWith("/api/uploads/")} />
        <div className="hero-slide-shade" />
        <div className="hero-slide-copy">
          <p className="eyebrow">TSG EVENTS <span aria-hidden="true">·</span> THOUGHTFULLY PLANNED</p>
          <h1>{slide.heading}</h1>
          <p className="hero-slide-description">{slide.description}</p>
          <Link className="button button-light" href={slide.destinationUrl}>{slide.buttonLabel}<span aria-hidden="true">↗</span></Link>
        </div>
      </article>)}
    </div>
    {count > 1 ? <div className="hero-carousel-controls" role="group" aria-label="Carousel controls">
      <button className="hero-control" type="button" aria-label="Previous slide" onClick={() => goTo(activeIndex - 1)}><span aria-hidden="true">←</span></button>
      <div className="hero-indicators" role="group" aria-label="Choose a slide">{slides.map((slide, index) => <button className={`hero-indicator${index === activeIndex ? " is-current" : ""}`} type="button" key={slide.id} aria-label={`Go to slide ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} onClick={() => goTo(index)} />)}</div>
      <button className="hero-control" type="button" aria-label="Next slide" onClick={() => goTo(activeIndex + 1)}><span aria-hidden="true">→</span></button>
      <button className="hero-control hero-pause" type="button" aria-label={isPausedByUser ? "Resume automatic slides" : "Pause automatic slides"} onClick={() => setIsPausedByUser((paused) => !paused)}><span aria-hidden="true">{isPausedByUser ? "▶" : "Ⅱ"}</span></button>
    </div> : null}
    <p className="hero-caption">ILLUSTRATIVE SAMPLE ART <span>·</span> WEDDINGS <span>·</span> CORPORATE EVENTS <span>·</span> PRIVATE CELEBRATIONS</p>
  </section>;
}
