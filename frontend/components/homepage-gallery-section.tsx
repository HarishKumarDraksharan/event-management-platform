"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { PublicHomepageGallery } from "../lib/public-content";

export function HomepageGallerySection({ gallery }: { gallery: PublicHomepageGallery | null }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let observer: IntersectionObserver | null = null;

    const updateMotion = () => {
      observer?.disconnect();
      observer = null;
      if (preference?.matches || typeof IntersectionObserver === "undefined") {
        section.classList.remove("has-gallery-reveal");
        section.querySelectorAll(".home-gallery-card.is-visible").forEach((card) => card.classList.remove("is-visible"));
        return;
      }

      section.classList.add("has-gallery-reveal");
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0.12 });
      section.querySelectorAll(".home-gallery-card").forEach((card) => observer?.observe(card));
    };

    updateMotion();
    preference?.addEventListener("change", updateMotion);
    return () => {
      observer?.disconnect();
      preference?.removeEventListener("change", updateMotion);
      section.classList.remove("has-gallery-reveal");
    };
  }, [gallery?.entries.length]);

  if (!gallery?.isVisible) return null;
  return <section className="home-gallery" id="gallery" aria-labelledby="home-gallery-heading" ref={sectionRef}>
    <header className="home-gallery-heading">
      <p className="eyebrow">{gallery.eyebrow}</p>
      <h2 id="home-gallery-heading">{gallery.heading}</h2>
      <span className="home-gallery-rule" aria-hidden="true" />
    </header>
    {gallery.entries.length ? <div className="home-gallery-grid">
      {gallery.entries.map((entry) => <figure className="home-gallery-card" key={entry.id} tabIndex={0}>
        <div className="home-gallery-image">
          <Image src={entry.imageRef} alt={entry.altText} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized />
        </div>
        <figcaption>{entry.title}</figcaption>
      </figure>)}
    </div> : <p className="home-gallery-empty" role="status">Our gallery is taking shape. Memorable moments will be shared here soon.</p>}
  </section>;
}
