import type { Metadata } from "next";
import { AdminHomepageGalleryManager } from "../../../../components/admin-homepage-gallery-manager";

export const metadata: Metadata = { title: "Homepage Gallery section", description: "Choose published gallery moments for the TSG EVENTS homepage.", robots: { index: false, follow: false } };

export default function AdminHomepageGalleryPage() {
  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · HOMEPAGE</p><h1>Our Gallery <em>section.</em></h1><p>Choose published portfolio moments and arrange their display on the homepage.</p></header>
    <AdminHomepageGalleryManager />
  </main>;
}
