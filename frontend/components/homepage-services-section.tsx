"use client";

import Image from "next/image";
import Link from "next/link";
import { TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import type { PublicHomepageServices, PublicService } from "../lib/public-content";

type HomepageServicesSectionProps = {
  section: PublicHomepageServices | null;
  services: PublicService[] | null;
};

const fallbackImage = "/images/gathering-study.svg";
const pixelsPerSecond = 34;

export function HomepageServicesSection({ section, services }: HomepageServicesSectionProps) {
  if (!section?.isVisible) return null;
  const orderedServices = services === null
    ? []
    : section.serviceIds === null
      ? services
      : section.serviceIds.flatMap((id) => {
        const service = services.find((item) => item.id === id);
        return service ? [service] : [];
      });

  return <ServicesCarousel section={section} services={orderedServices} />;
}

function HomepageServiceCard({ service, duplicate = false }: { service: PublicService; duplicate?: boolean }) {
  const content = <>
    <span className="home-service-image">
      <Image
        src={service.imageRef || fallbackImage}
        alt={duplicate ? "" : `${service.title} event planning service`}
        fill
        sizes="(max-width: 767px) 90vw, (max-width: 1100px) 44vw, 30vw"
        unoptimized
      />
    </span>
    <span className="home-service-title">{service.title}</span>
  </>;

  return duplicate
    ? <span className="home-service-card">{content}</span>
    : <Link className="home-service-card" href={`/services/${service.slug}`}>{content}</Link>;
}

function ServicesCarousel({ section, services }: { section: PublicHomepageServices; services: PublicService[] }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const displayCount = Math.min(visibleCount, Math.max(services.length, 1));
  const touchStartX = useRef<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);
  const distanceRef = useRef(0);
  const interactionRef = useRef(false);
  const setupLoopRef = useRef<(offset?: number) => void>(() => undefined);

  const moveByCard = useCallback((direction: -1 | 1) => {
    const viewport = viewportRef.current;
    const sequence = sequenceRef.current;
    const track = trackRef.current;
    if (!viewport || !sequence || !track || distanceRef.current <= 0) return;
    const firstCard = sequence.querySelector<HTMLElement>(".home-service-slide");
    const cardWidth = firstCard?.getBoundingClientRect().width ?? viewport.clientWidth / visibleCount;
    const distance = distanceRef.current;
    const transform = getComputedStyle(track).transform;
    const matrix = transform.startsWith("matrix") ? new DOMMatrixReadOnly(transform) : null;
    const currentOffset = matrix ? ((-matrix.m41 % distance) + distance) % distance : 0;
    const targetOffset = currentOffset + direction * cardWidth;
    animationRef.current?.cancel();
    animationRef.current = null;

    const finishManualMove = () => {
      const normalizedOffset = ((targetOffset % distance) + distance) % distance;
      if (reducedMotion) {
        track.style.transform = `translate3d(-${normalizedOffset}px, 0, 0)`;
      } else {
        animationRef.current?.cancel();
        animationRef.current = null;
        track.style.transform = "";
        setupLoopRef.current(normalizedOffset);
      }
    };

    if (reducedMotion) {
      finishManualMove();
      return;
    }
    const manualAnimation = track.animate(
      [
        { transform: `translate3d(-${currentOffset}px, 0, 0)` },
        { transform: `translate3d(-${targetOffset}px, 0, 0)` },
      ],
      { duration: 480, easing: "cubic-bezier(.22,.61,.36,1)", fill: "forwards" },
    );
    animationRef.current = manualAnimation;
    manualAnimation.onfinish = finishManualMove;
  }, [reducedMotion, visibleCount]);

  useEffect(() => {
    const mobile = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 767px)") : null;
    const tablet = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 1100px)") : null;
    const preference = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const updateVisibleCount = () => {
      setVisibleCount(mobile?.matches ? 1 : tablet?.matches ? 2 : 3);
    };
    const updateMotionPreference = () => {
      setReducedMotion(preference?.matches ?? false);
      setMotionPreferenceReady(true);
    };
    const updatePageVisibility = () => setIsPageVisible(document.visibilityState === "visible");
    updateVisibleCount();
    updateMotionPreference();
    updatePageVisibility();
    window.addEventListener("resize", updateVisibleCount);
    preference?.addEventListener("change", updateMotionPreference);
    document.addEventListener("visibilitychange", updatePageVisibility);
    return () => {
      window.removeEventListener("resize", updateVisibleCount);
      preference?.removeEventListener("change", updateMotionPreference);
      document.removeEventListener("visibilitychange", updatePageVisibility);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const sequence = sequenceRef.current;
    const track = trackRef.current;
    if (!viewport || !sequence || !track) return;

    const updateMeasurements = () => {
      const previousDistance = distanceRef.current;
      const transform = getComputedStyle(track).transform;
      const matrix = transform.startsWith("matrix") ? new DOMMatrixReadOnly(transform) : null;
      const offset = previousDistance > 0 && matrix ? ((-matrix.m41 % previousDistance) + previousDistance) % previousDistance : 0;
      viewport.style.setProperty("--service-card-width", `${viewport.clientWidth / displayCount}px`);
      const distance = sequence.getBoundingClientRect().width;
      if (distance <= 0) return;
      distanceRef.current = distance;
      animationRef.current?.cancel();
      animationRef.current = null;
      track.style.transform = reducedMotion ? `translate3d(-${offset / Math.max(previousDistance, 1) * distance}px, 0, 0)` : "";
      setupLoopRef.current(previousDistance > 0 ? offset / previousDistance * distance : 0);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateMeasurements);

    const startLoop = (offset = 0) => {
      if (distanceRef.current <= 0 || reducedMotion || !motionPreferenceReady || services.length < 2) return;
      const distance = distanceRef.current;
      const normalizedOffset = ((offset % distance) + distance) % distance;
      const animation = track.animate(
        [
          { transform: `translate3d(-${normalizedOffset}px, 0, 0)` },
          { transform: `translate3d(-${normalizedOffset + distance}px, 0, 0)` },
        ],
        { duration: distance / pixelsPerSecond * 1000, iterations: Infinity, easing: "linear" },
      );
      animationRef.current = animation;
      if (interactionRef.current || document.visibilityState !== "visible") animation.pause();
    };
    setupLoopRef.current = startLoop;

    if (observer) {
      observer.observe(viewport);
      observer.observe(sequence);
    } else {
      window.addEventListener("resize", updateMeasurements);
    }
    updateMeasurements();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateMeasurements);
      animationRef.current?.cancel();
      animationRef.current = null;
      distanceRef.current = 0;
      setupLoopRef.current = () => undefined;
      track.style.transform = "";
    };
  }, [services.length, reducedMotion, motionPreferenceReady, displayCount]);

  useEffect(() => {
    interactionRef.current = isHovered || isFocused || !isPageVisible;
    const animation = animationRef.current;
    if (!animation || animation.effect?.getTiming().iterations !== Infinity) return;
    if (interactionRef.current) animation.pause();
    else animation.play();
  }, [isHovered, isFocused, isPageVisible]);

  function finishTouch(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartX.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 45) return;
    moveByCard(endX < startX ? 1 : -1);
  }

  const prefix = section.highlight ? section.heading.split(section.highlight, 2) : [section.heading];
  const hasHighlight = section.highlight.length > 0 && section.heading.includes(section.highlight);

  return <section className="home-services" id="services" aria-labelledby="home-services-heading">
    <p className="eyebrow">{section.eyebrow}</p>
    <h2 id="home-services-heading">{hasHighlight ? <>{prefix[0]}<em>{section.highlight}</em>{prefix[1]}</> : section.heading}</h2>
    <div
      className="home-services-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Event planning services"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocused(false); }}
      onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={finishTouch}
    >
      {services.length > visibleCount ? <button className="home-services-arrow" type="button" aria-label="Previous services" onClick={() => moveByCard(-1)}><span aria-hidden="true">‹</span></button> : <span className="home-services-arrow-spacer" aria-hidden="true" />}
      <div className="home-services-viewport" ref={viewportRef} data-visible-count={visibleCount}>
        {services.length ? <div className="home-services-track" ref={trackRef} aria-live="off">
          <div className="home-services-sequence" ref={sequenceRef}>
            {services.map((service, index) => <article className="home-service-slide" key={service.id} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${services.length}`}>
              <HomepageServiceCard service={service} />
            </article>)}
          </div>
          {services.length > 1 && !reducedMotion ? <div className="home-services-sequence home-services-loop-copy" aria-hidden="true" inert>
            {services.map((service) => <article className="home-service-slide" key={`loop-${service.id}`}>
              <HomepageServiceCard service={service} duplicate />
            </article>)}
          </div> : null}
        </div> : <p className="home-services-empty" role="status">Our services are currently being updated.</p>}
      </div>
      {services.length > visibleCount ? <button className="home-services-arrow" type="button" aria-label="Next services" onClick={() => moveByCard(1)}><span aria-hidden="true">›</span></button> : <span className="home-services-arrow-spacer" aria-hidden="true" />}
    </div>
  </section>;
}
