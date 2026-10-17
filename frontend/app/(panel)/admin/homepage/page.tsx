import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Homepage management", description: "Manage the editable sections of the TSG EVENTS homepage.", robots: { index: false, follow: false } };

const sections = [
  { number: "SECTION 1", title: "Hero Carousel", href: "/admin/hero-slides", description: "Edit slides, display order, and publication status." },
  { number: "SECTION 2", title: "About Us", href: "/admin/about-us", description: "Edit the story, event image, button, and section visibility." },
  { number: "SECTION 3", title: "Services", href: "/admin/homepage-services", description: "Choose services, adjust their order, and manage section visibility." },
  { number: "SECTION 4", title: "Why Choose Us", href: "/admin/homepage-why-choose-us", description: "Edit the section story, feature cards, icons, order, and visibility." },
  { number: "SECTION 5", title: "Our Gallery", href: "/admin/homepage-gallery", description: "Choose and arrange published gallery moments for the homepage." },
];

export default function AdminHomepagePage() {
  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · CONTENT MANAGEMENT</p><h1>Homepage <em>sections.</em></h1><p>Manage each implemented homepage section in its own focused editor.</p></header>
    <section className="admin-homepage-sections" aria-labelledby="admin-homepage-sections-heading">
      <header className="admin-homepage-sections-heading"><h2 id="admin-homepage-sections-heading">Homepage Sections</h2><p>Sections are listed in public display order.</p></header>
      <div className="admin-homepage-section-grid">
        {sections.map((section) => <Link className="admin-homepage-section-card" href={section.href} key={section.href}>
          <span className="eyebrow">{section.number}</span><h3>{section.title}</h3><p>{section.description}</p><span className="text-link">Manage Section <span aria-hidden="true">↗</span></span>
        </Link>)}
      </div>
    </section>
  </main>;
}
