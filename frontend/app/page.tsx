import Image from "next/image";
import Link from "next/link";

const services = [
  { number: "01", title: "Weddings", copy: "A thoughtful plan for the day, and all the moments around it.", href: "/services/weddings", color: "rose" },
  { number: "02", title: "Corporate events", copy: "Purposeful gatherings shaped around your people and plans.", href: "/services/corporate-events", color: "sage" },
  { number: "03", title: "Birthdays", copy: "A personal celebration for the person at the centre of it.", href: "/services/birthdays", color: "ochre" },
  { number: "04", title: "Private celebrations", copy: "An intimate get-together, made to feel unmistakably yours.", href: "/services/private-celebrations", color: "plum" },
];

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero" id="home">
        <div className="hero-copy"><p className="eyebrow"><span /> PLANNED WITH PURPOSE · CELEBRATED WITH JOY</p>
          <h1>Make room<br />for <em>meaningful</em><br />moments.</h1>
          <p className="hero-intro">From the first idea to the final farewell, we bring the details together so you can be right where you belong.</p>
          <Link className="button button-dark" href="/contact">Tell us what you’re planning <span aria-hidden="true">↗</span></Link>
          <div className="hero-note"><span className="note-line" /> A PLACE FOR YOUR STORY</div>
        </div>
        <div className="hero-art" role="img" aria-label="Illustrated setting for an intimate garden celebration"><div className="art-sun" /><div className="art-arch arch-back" /><div className="art-arch arch-front" /><div className="art-table" /><div className="art-stem stem-one" /><div className="art-stem stem-two" /><div className="art-leaf leaf-one" /><div className="art-leaf leaf-two" /><div className="art-caption">GOOD THINGS<br />TAKE SHAPE<br /><span>TOGETHER</span></div><div className="art-index">AN ORIGINAL ILLUSTRATION · TSG EVENTS</div></div>
        <div className="hero-bottom"><span>WEDDINGS · GATHERINGS · GOOD IDEAS</span><a href="#services">SCROLL TO EXPLORE ↓</a></div>
      </section>

      <section className="intro section-wrap"><p className="eyebrow">TSG EVENTS · EVENT PLANNING</p><h2>Big days, little details,<br /><em>all thoughtfully held.</em></h2><p>Every gathering has its own rhythm. We help bring the people, place and many moving pieces together, so the experience feels considered from the first welcome to the last goodbye.</p></section>

      <section className="services section-wrap" id="services"><div className="section-heading"><p className="eyebrow">WHAT WE CAN HELP WITH</p><h2>Every gathering<br />starts somewhere.</h2><Link className="text-link" href="/contact">Find your starting point <span aria-hidden="true">↗</span></Link></div>
        <div className="service-list">{services.map((service) => <Link className="service-card" key={service.number} href={service.href}><span className="service-number">{service.number}</span><span className="service-copy"><span className="service-title">{service.title}</span><span className="service-description">{service.copy}</span></span><span className="service-arrow" aria-hidden="true">↗</span></Link>)}</div>
      </section>

      <section className="work" id="work"><div className="work-copy"><p className="eyebrow">A FIRST LOOK · CONCEPT ART</p><h2>Stories worth<br /><em>gathering for.</em></h2><p>A small collection of illustrative studies for the kinds of moments we love to plan. These are original placeholders; event photography will be added when available.</p><Link className="text-link" href="/portfolio">Explore the gallery <span aria-hidden="true">↗</span></Link></div>
        <div className="portfolio-grid"><Link href="/portfolio" className="portfolio-tile tile-wedding"><Image src="/images/gathering-study.svg" alt="Illustration of a candlelit celebration table, sample artwork" width={900} height={1100} /><span>01 · A GATHERING STUDY</span></Link><Link href="/portfolio" className="portfolio-tile tile-table"><Image src="/images/table-study.svg" alt="Illustration of a considered event table, sample artwork" width={900} height={1100} /><span>02 · DETAILS IN PLACE</span></Link></div>
      </section>

      <section className="about section-wrap" id="about"><p className="eyebrow">A LITTLE ABOUT US</p><h2>Good planning makes<br />space for <em>being there.</em></h2><p className="about-copy">TSG EVENTS is building a home for an event team that cares about the details and the people behind them. Our story and approach will grow here as the company shares more.</p><Link className="text-link" href="/about">A little more about TSG EVENTS <span aria-hidden="true">↗</span></Link></section>

      <section className="contact-band"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>What are you<br />looking forward to?</h2></div><Link className="button button-light" href="/contact">Share your plans <span aria-hidden="true">↗</span></Link><p className="contact-placeholder">Use the enquiry form to start a conversation. Business contact details will be added when supplied.</p></section>
    </main>
  );
}
