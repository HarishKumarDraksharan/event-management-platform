import Link from "next/link";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/portfolio", label: "Our work" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="TSG EVENTS home">
        <span className="brand-mark" aria-hidden="true">T</span><span>TSG EVENTS</span>
      </Link>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <Link className="nav-cta" href="/contact">Let’s talk <span aria-hidden="true">↗</span></Link>
      </nav>
      <details className="mobile-nav">
        <summary aria-label="Open navigation menu"><span>Menu</span><span className="menu-icon" aria-hidden="true">☰</span></summary>
        <nav aria-label="Mobile navigation">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          <Link href="/services/birthdays">Birthdays</Link>
          <Link href="/services/private-celebrations">Private celebrations</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </details>
    </header>
  );
}
