import Link from "next/link";
import Image from "next/image";
import { HeroCarousel } from "../../components/hero-carousel";
import { defaultHomepageIntroduction, getPublicHeroSlides, getPublicHomepageIntroduction, getPublicPortfolio, getPublicServices } from "../../lib/public-content";

export default async function Home() {
  const [services, portfolio, heroSlides, savedIntroduction] = await Promise.all([getPublicServices(), getPublicPortfolio(), getPublicHeroSlides(), getPublicHomepageIntroduction()]);
  const introduction = savedIntroduction ?? defaultHomepageIntroduction;
  return (
    <main id="main-content">
      <HeroCarousel slides={heroSlides ?? []} />

      <section className="intro section-wrap" id="introduction">
        <p className="eyebrow">{introduction.eyebrow}</p>
        <h2>{introduction.heading}<br /><em>{introduction.highlight}</em></h2>
        <p>{introduction.description}</p>
      </section>

      <section className="services section-wrap" id="services"><div className="section-heading"><p className="eyebrow">WHAT WE CAN HELP WITH</p><h2>Every gathering<br />starts somewhere.</h2><Link className="text-link" href="/contact">Find your starting point <span aria-hidden="true">↗</span></Link></div>
        <div className="service-list">{services?.map((service, index) => <Link className="service-card" key={service.id} href={`/services/${service.slug}`}><span className="service-number">{String(index + 1).padStart(2, "0")}</span><span className="service-copy"><span className="service-title">{service.title}</span><span className="service-description">{service.description}</span></span><span className="service-arrow" aria-hidden="true">↗</span></Link>)}{services?.length === 0 ? <p className="catalog-empty">No services are currently listed.</p> : null}{services === null ? <p className="catalog-error" role="status">Services are temporarily unavailable.</p> : null}</div>
      </section>

      <section className="work" id="work"><div className="work-copy"><p className="eyebrow">A FIRST LOOK · CONCEPT ART</p><h2>Stories worth<br /><em>gathering for.</em></h2><p>A small collection of illustrative studies for the kinds of moments we love to plan. These are original placeholders; event photography will be added when available.</p><Link className="text-link" href="/portfolio">Explore the gallery <span aria-hidden="true">↗</span></Link></div>
        <div className="portfolio-grid">{portfolio?.slice(0, 2).map((entry, index) => <Link href="/portfolio" className={`portfolio-tile ${index === 0 ? "tile-wedding" : "tile-table"}`} key={entry.id}><Image src={entry.imageRef} alt={entry.altText} width={900} height={1100} /><span>{String(index + 1).padStart(2, "0")} · {entry.title}{entry.isSample ? " · SAMPLE" : ""}</span></Link>)}{portfolio === null ? <p className="catalog-error" role="status">Portfolio previews are temporarily unavailable.</p> : null}</div>
      </section>

      <section className="about section-wrap" id="about"><p className="eyebrow">A LITTLE ABOUT US</p><h2>Good planning makes<br />space for <em>being there.</em></h2><p className="about-copy">TSG EVENTS is building a home for an event team that cares about the details and the people behind them. Our story and approach will grow here as the company shares more.</p><Link className="text-link" href="/about">A little more about TSG EVENTS <span aria-hidden="true">↗</span></Link></section>

      <section className="contact-band"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>What are you<br />looking forward to?</h2></div><Link className="button button-light" href="/contact">Share your plans <span aria-hidden="true">↗</span></Link><p className="contact-placeholder">Use the enquiry form to start a conversation. Business contact details will be added when supplied.</p></section>
    </main>
  );
}
