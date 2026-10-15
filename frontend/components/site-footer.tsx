import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link className="brand" href="/" aria-label="TSG EVENTS home"><span className="brand-mark" aria-hidden="true">T</span><span>TSG EVENTS</span></Link>
      <span>Thoughtfully planned. Ready to be yours.</span>
      <nav aria-label="Footer navigation"><Link href="/services/weddings">Services</Link><Link href="/portfolio">Portfolio</Link><Link href="/contact">Contact</Link></nav>
    </footer>
  );
}
