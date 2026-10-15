import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "Portfolio", description: "Illustrative sample artwork for TSG EVENTS. Real event photography will be added when available." };

const studies = [
  { src: "/images/gathering-study.svg", alt: "Sample illustration of a candlelit celebration table", title: "A gathering study", type: "CONCEPT ART · PLACEHOLDER" },
  { src: "/images/table-study.svg", alt: "Sample illustration of an event table with seasonal flowers", title: "Details in place", type: "CONCEPT ART · PLACEHOLDER" },
  { src: "/images/colour-study.svg", alt: "Sample abstract illustration of event colours and shapes", title: "A colour story", type: "CONCEPT ART · PLACEHOLDER" },
];

export default function PortfolioPage() {
  return <main id="main-content"><section className="page-hero"><p className="eyebrow">PORTFOLIO · SAMPLE ARTWORK</p><h1>Stories worth<br /><em>gathering for.</em></h1><p className="hero-intro">A first look at the colours and forms that inspire a celebration. These original illustrations are clearly labelled samples, not photographs of completed events.</p></section><section className="gallery-grid section-wrap">{studies.map((study) => <article className="gallery-card" key={study.src}><Image src={study.src} alt={study.alt} width={900} height={1100} /><p className="eyebrow">{study.type}</p><h2>{study.title}</h2></article>)}</section><section className="gallery-cta"><h2>Have a story in mind?</h2><Link className="button button-dark" href="/contact">Let’s start with your plans <span aria-hidden="true">↗</span></Link></section></main>;
}
