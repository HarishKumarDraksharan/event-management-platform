import Image from "next/image";
import Link from "next/link";
import type { PublicAboutUs } from "../lib/public-content";

export function AboutUsSection({ content }: { content: PublicAboutUs | null }) {
  if (!content?.isVisible) return null;

  return <section className="home-about" id="about" aria-labelledby="home-about-heading">
    <div className="home-about-copy">
      <p className="eyebrow">{content.eyebrow}</p>
      <h2 id="home-about-heading">{content.heading}</h2>
      <p>{content.firstParagraph}</p>
      <p>{content.secondParagraph}</p>
      <Link className="home-about-link" href={content.destinationUrl}>{content.buttonLabel} <span aria-hidden="true">↗</span></Link>
    </div>
    <figure className="home-about-image">
      <div className="home-about-image-frame" aria-hidden="true" />
      <Image src={content.imageUrl} alt={content.imageCaption} fill sizes="(max-width: 760px) 100vw, 50vw" unoptimized />
      <div className="home-about-image-shade" aria-hidden="true" />
      <figcaption>{content.imageCaption}</figcaption>
    </figure>
  </section>;
}
