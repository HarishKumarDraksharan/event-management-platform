import type { Metadata } from "next";
import { AdminHomepageTestimonialsManager } from "../../../../components/admin-homepage-testimonials-manager";

export const metadata: Metadata = { title: "Homepage testimonials section", description: "Manage the testimonials section shown on the TSG EVENTS homepage.", robots: { index: false, follow: false } };

export default function AdminHomepageTestimonialsPage() {
  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · HOMEPAGE</p><h1>Testimonials <em>section.</em></h1><p>Choose published testimonials, arrange their homepage order, and update the section copy shown on the public homepage.</p></header>
    <AdminHomepageTestimonialsManager />
  </main>;
}
