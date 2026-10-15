import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicPortfolio } from "../../../lib/public-content";

export const metadata: Metadata = { title: "Portfolio", description: "Published portfolio entries and clearly labelled sample artwork for TSG EVENTS." };

export default async function PortfolioPage() {
  const entries = await getPublicPortfolio();
  const isSamples = entries?.some((entry) => entry.isSample) ?? true;
  return <main id="main-content"><section className="page-hero"><p className="eyebrow">PORTFOLIO · {isSamples ? "SAMPLE ARTWORK" : "SELECTED WORK"}</p><h1>Stories worth<br /><em>gathering for.</em></h1><p className="hero-intro">A first look at the colours and forms that inspire a celebration. Sample illustrations are clearly identified and do not represent completed customer events.</p></section><section className="gallery-grid section-wrap">{entries?.map((entry) => <article className="gallery-card" key={entry.id}><Image src={entry.imageRef} alt={entry.altText} width={900} height={1100} /><p className="eyebrow">{entry.isSample ? "CONCEPT ART · SAMPLE" : "PORTFOLIO"}</p><h2>{entry.title}</h2><p>{entry.description}</p></article>)}{entries?.length === 0 ? <p className="catalog-empty">There are no published portfolio entries yet.</p> : null}{entries === null ? <p className="catalog-error" role="status">Portfolio entries are temporarily unavailable.</p> : null}</section><section className="gallery-cta"><h2>Have a story in mind?</h2><Link className="button button-dark" href="/contact">Let’s start with your plans <span aria-hidden="true">↗</span></Link></section></main>;
}
