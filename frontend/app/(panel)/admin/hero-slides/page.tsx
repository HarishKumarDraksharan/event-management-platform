import type { Metadata } from "next";
import { AdminHeroSlideManager } from "../../../../components/admin-hero-slide-manager";

export const metadata: Metadata = { title: "Manage homepage slides", description: "Manage published TSG EVENTS homepage carousel slides.", robots: { index: false, follow: false } };

export default function AdminHeroSlidesPage() {
  return <main id="main-content" className="admin-page"><header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · MANAGEMENT</p><h1>Homepage <em>slides.</em></h1><p>Only published slides appear in the homepage carousel. Use approved local artwork and site paths.</p></header><AdminHeroSlideManager /></main>;
}
