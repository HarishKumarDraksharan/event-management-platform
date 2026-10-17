import type { Metadata } from "next";
import { AdminHomepageWhyChooseUsManager } from "../../../../components/admin-homepage-why-choose-us-manager";

export const metadata: Metadata = { title: "Homepage Why Choose Us section", description: "Edit the Why Choose Us section shown on the TSG EVENTS homepage.", robots: { index: false, follow: false } };

export default function AdminHomepageWhyChooseUsPage() {
  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · HOMEPAGE</p><h1>Why Choose Us <em>section.</em></h1><p>Edit the supporting message and ordered feature cards displayed after Homepage Services.</p></header>
    <AdminHomepageWhyChooseUsManager />
  </main>;
}
