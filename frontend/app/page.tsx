const services = [
  { number: "01", title: "Weddings", text: "A considered plan for the moments you want to remember." },
  { number: "02", title: "Corporate events", text: "Clear coordination for gatherings with a purpose." },
  { number: "03", title: "Private celebrations", text: "Thoughtful details for birthdays and life’s milestones." },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="TSG EVENTS home"><span className="brand-mark">T</span> TSG EVENTS</a>
        <nav aria-label="Main navigation">
          <a href="#services">Services</a><a href="#work">Our work</a><a href="#about">About</a>
          <a className="nav-cta" href="#contact">Start a conversation <span aria-hidden="true">↗</span></a>
        </nav>
      </header>

      <section className="hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow"><span /> PLANNED WITH PURPOSE · CELEBRATED WITH JOY</p>
          <h1>Make room<br />for <em>meaningful</em><br />moments.</h1>
          <p className="hero-intro">From the first idea to the final farewell, we bring the details together so you can be right where you belong.</p>
          <a className="button button-dark" href="#contact">Tell us what you’re planning <span aria-hidden="true">↗</span></a>
          <div className="hero-note"><span className="note-line" /> A PLACEHOLDER FOR YOUR STORY</div>
        </div>
        <div className="hero-art" role="img" aria-label="Abstract warm-toned event table illustration">
          <div className="art-sun" /><div className="art-arch arch-back" /><div className="art-arch arch-front" />
          <div className="art-stem stem-one" /><div className="art-stem stem-two" /><div className="art-leaf leaf-one" /><div className="art-leaf leaf-two" />
          <div className="art-caption">GOOD THINGS<br />TAKE SHAPE<br /><span>TOGETHER</span></div>
          <div className="art-index">EST. YOUR YEAR <span>—</span> YOUR CITY</div>
        </div>
        <div className="hero-bottom"><span>WEDDINGS · GATHERINGS · GOOD IDEAS</span><a href="#services">SCROLL TO EXPLORE ↓</a></div>
      </section>

      <section className="services section-wrap" id="services">
        <div className="section-heading"><p className="eyebrow">WHAT WE CAN HELP WITH</p><h2>Every gathering<br />starts somewhere.</h2></div>
        <div className="service-list">{services.map((service) => <article className="service-card" key={service.number}><span className="service-number">{service.number}</span><h3>{service.title}</h3><p>{service.text}</p><span className="service-arrow" aria-hidden="true">↗</span></article>)}</div>
      </section>

      <section className="work" id="work"><div><p className="eyebrow">A FIRST LOOK</p><h2>Stories worth<br /><em>gathering for.</em></h2><p>Portfolio examples will appear here once real event photography and business content are provided.</p></div><div className="work-placeholder"><span>PORTFOLIO PREVIEW</span><div className="placeholder-shape">✳</div><small>IMAGE PLACEHOLDER</small></div></section>

      <section className="about section-wrap" id="about"><p className="eyebrow">A LITTLE ABOUT US</p><h2>Good planning makes<br />space for <em>being there.</em></h2><p className="about-copy">We’re building a home for an event team that cares about the details and the people behind them. Our story and approach will be added when the company details are ready.</p></section>

      <section className="contact" id="contact"><div><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h2>What are you<br />looking forward to?</h2></div><a className="button button-light" href="mailto:hello@example.com">Let’s talk about it <span aria-hidden="true">↗</span></a><p className="contact-placeholder">Placeholder contact · Replace with the business email and phone number</p></section>

      <footer className="site-footer"><a className="brand" href="#home"><span className="brand-mark">T</span> TSG EVENTS</a><span>Thoughtfully planned. Ready to be yours.</span><a href="#home">BACK TO TOP ↑</a></footer>
    </main>
  );
}
