import type { Metadata } from "next";
import { AdminHomepageServicesManager } from "../../../../components/admin-homepage-services-manager";

export const metadata: Metadata = { title: "Homepage services section", description: "Edit the Services section shown on the TSG EVENTS homepage.", robots: { index: false, follow: false } };

export default function AdminHomepageServicesPage() {
  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · HOMEPAGE</p><h1>Services <em>section.</em></h1><p>Choose which active services appear on the homepage and arrange their display order.</p></header>
    <AdminHomepageServicesManager />
  </main>;
}
