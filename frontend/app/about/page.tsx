import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About", description: "Learn about the thoughtful approach behind TSG EVENTS." };

export default function AboutPage() {
  return <main id="main-content"><section className="page-hero about-hero"><p className="eyebrow">A LITTLE ABOUT US</p><h1>Good planning makes<br />space for <em>being there.</em></h1><p className="hero-intro">We believe the best celebrations feel effortless to the people in them, because every detail has been given a little thought.</p></section><section className="about-story section-wrap"><div><p className="eyebrow">OUR APPROACH</p><h2>People first.<br /><em>Details with purpose.</em></h2></div><div><p>TSG EVENTS is building a home for an event team that cares about the details and the people behind them. We’re creating gatherings with a clear point of view and room for the unexpected moments that make a day your own.</p><p>This introduction is intentionally a starting point. Company history, team details and location will be added when they are supplied.</p><Link className="text-link" href="/contact">Tell us what you’re planning <span aria-hidden="true">↗</span></Link></div></section><div className="about-art" role="img" aria-label="Decorative abstract illustration of layered celebration forms"><span>THE SHAPE OF A GOOD GATHERING</span></div></main>;
}
