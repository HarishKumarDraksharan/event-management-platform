import type { Metadata } from "next";
import Link from "next/link";
import { AdminAboutUsManager } from "../../../../components/admin-about-us-manager";

export const metadata: Metadata = { title: "About Us content", description: "Manage the TSG EVENTS homepage About Us section.", robots: { index: false, follow: false } };

export default function AdminAboutUsPage() {
  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · CONTENT MANAGEMENT</p><h1>About Us <em>content.</em></h1><p>Manage the editable About Us section shown below the homepage carousel.</p></header>
    <AdminAboutUsManager />
    <p><Link className="text-link" href="/about">View the public About Us page <span aria-hidden="true">↗</span></Link></p>
  </main>;
}
