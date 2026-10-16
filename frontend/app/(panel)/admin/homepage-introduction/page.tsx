import type { Metadata } from "next";
import { AdminHomepageIntroductionManager } from "../../../../components/admin-homepage-introduction-manager";

export const metadata: Metadata = { title: "Manage homepage introduction", description: "Edit the TSG EVENTS homepage introduction section.", robots: { index: false, follow: false } };

export default function AdminHomepageIntroductionPage() {
  return <main id="main-content" className="admin-page"><header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · MANAGEMENT</p><h1>Homepage <em>introduction.</em></h1><p>Edit the introduction copy shown beneath the hero carousel.</p></header><AdminHomepageIntroductionManager /></main>;
}
