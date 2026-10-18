"use client";

import Image from "next/image";
import { useState } from "react";
import type { PublicHomepageTestimonials } from "../lib/public-content";

const starChars = ["★", "★", "★", "★", "★"];

const cardTone = [
  "home-testimonial-card coral",
  "home-testimonial-card magenta",
  "home-testimonial-card lavender",
  "home-testimonial-card teal",
  "home-testimonial-card amber",
];

export function HomepageTestimonialsSection({
  section,
}: {
  section: PublicHomepageTestimonials | null;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const visibleTestimonials =
    section?.testimonials.filter(
      (testimonial) =>
        testimonial.name?.trim() && testimonial.text?.trim()
    ) ?? [];

  const count = visibleTestimonials.length;
  const safeActiveIndex =
    count > 0 && activeIndex >= count ? 0 : activeIndex;

  if (!section?.isVisible) return null;

  const previous = () => {
    if (count > 1) {
      setActiveIndex((current) => (current - 1 + count) % count);
    }
  };

  const next = () => {
    if (count > 1) {
      setActiveIndex((current) => (current + 1) % count);
    }
  };

  return (
    <section
      className="home-testimonials"
      id="testimonials"
      aria-labelledby="home-testimonials-heading"
    >
      <div className="home-testimonials-shell">
        <header className="home-testimonials-heading">
          <p className="eyebrow">{section.eyebrow}</p>
          <h2 id="home-testimonials-heading">{section.heading}</h2>
          <p>{section.description}</p>
        </header>

        {count > 0 ? (
          <div className="home-testimonials-layout">
            <div
              className="home-testimonials-controls"
              aria-label="Testimonial navigation"
            >
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={previous}
                disabled={count <= 1}
              >
                ←
              </button>

              <div
                className="home-testimonials-dots"
                aria-label="Choose a testimonial slide"
              >
                {visibleTestimonials.map((testimonial, index) => (
                  <button
                    key={testimonial.id}
                    type="button"
                    aria-label={`Show testimonial ${index + 1}`}
                    aria-current={
                      index === safeActiveIndex ? "true" : undefined
                    }
                    className={
                      index === safeActiveIndex ? "is-current" : ""
                    }
                    onClick={() => setActiveIndex(index)}
                  />
                ))}
              </div>

              <button
                type="button"
                aria-label="Next testimonial"
                onClick={next}
                disabled={count <= 1}
              >
                →
              </button>
            </div>

            <div className="home-testimonials-grid" aria-live="polite">
              {visibleTestimonials.map((testimonial, index) => {
                const tone = cardTone[index % cardTone.length];

                const stars =
                  typeof testimonial.rating === "number"
                    ? starChars.slice(
                        0,
                        Math.max(
                          1,
                          Math.min(5, Math.round(testimonial.rating))
                        )
                      )
                    : null;

                return (
                  <article
                    className={`${tone} ${
                      index === safeActiveIndex ? "is-active" : ""
                    }`}
                    key={testimonial.id}
                    aria-hidden={
                      index === safeActiveIndex ? "false" : "true"
                    }
                  >
                    <div className="home-testimonial-content">
                      <span
                        className="home-testimonial-mark"
                        aria-hidden="true"
                      >
                        “
                      </span>

                      {testimonial.imageRef ? (
                        <div className="home-testimonial-avatar">
                          <Image
                            src={testimonial.imageRef}
                            alt={testimonial.name}
                            fill
                            sizes="64px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div
                          className="home-testimonial-avatar is-initials"
                          aria-label={`Customer ${testimonial.name}`}
                        >
                          {testimonial.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {stars ? (
                        <div
                          className="home-testimonial-stars"
                          aria-label={`${testimonial.rating} out of 5 stars`}
                        >
                          {stars.map((star, starIndex) => (
                            <span key={`${testimonial.id}-star-${starIndex}`}>
                              {star}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <p className="home-testimonial-copy">
                        {testimonial.text}
                      </p>

                      <div className="home-testimonial-meta">
                        <div>
                          <strong>{testimonial.name}</strong>
                          {testimonial.label ? (
                            <span>{testimonial.label}</span>
                          ) : null}
                        </div>

                        {testimonial.eventType || testimonial.eventDate ? (
                          <small>
                            {[testimonial.eventType, testimonial.eventDate]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="home-testimonials-empty">
            We look forward to sharing stories from our happy clients.
          </p>
        )}
      </div>
    </section>
  );
}
