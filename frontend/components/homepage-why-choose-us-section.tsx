import type { PublicHomepageWhyChooseUs } from "../lib/public-content";
import type { ReactNode } from "react";

function FeatureIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    award: <><circle cx="12" cy="8" r="6" /><path d="m8.2 13.3-1 8.2 4.8-2.8 4.8 2.8-1-8.2" /></>,
    mapPin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    headphones: <><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M5 14h2v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Zm14 0h-2v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z" /></>,
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3" /></>,
    lightbulb: <><path d="M9 18h6m-5 4h4m-2-20a7 7 0 0 0-4 12.7c.6.4 1 1.1 1 1.8h6c0-.7.4-1.4 1-1.8A7 7 0 0 0 12 2Z" /></>,
    heart: <><path d="M20.8 8.6c0 5.5-8.8 11.1-8.8 11.1S3.2 14.1 3.2 8.6A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.2Z" /></>,
  };
  if (!Object.hasOwn(paths, name)) return null;
  return <svg className="home-why-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function HomepageWhyChooseUsSection({ section }: { section: PublicHomepageWhyChooseUs | null }) {
  if (!section?.isVisible) return null;
  return <section className="home-why" id="why-choose-us" aria-labelledby="home-why-heading">
    <header className="home-why-heading">
      <p className="eyebrow">The TSG difference</p>
      <h2 id="home-why-heading">{section.heading}</h2>
      <p>{section.supportingText}</p>
    </header>
    <p className="home-why-index" aria-hidden="true">MADE FOR THE MOMENTS THAT MATTER <span>01 — {String(section.featureCards.length).padStart(2, "0")}</span></p>
    <div className="home-why-grid">
      {section.featureCards.map((feature, index) => <article className="home-why-card" key={feature.id}>
        <div className="home-why-card-top"><FeatureIcon name={feature.icon} /><span>{String(index + 1).padStart(2, "0")}</span></div>
        <h3>{feature.title}</h3>
        <p>{feature.description}</p>
      </article>)}
    </div>
  </section>;
}
