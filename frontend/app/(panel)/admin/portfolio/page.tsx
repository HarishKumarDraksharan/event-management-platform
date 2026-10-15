import type { Metadata } from "next";
import { AdminPortfolioManager } from "../../../../components/admin-portfolio-manager";

export const metadata: Metadata = { title: "Manage gallery", description: "Manage published sample artwork and portfolio entries for TSG EVENTS.", robots: { index: false, follow: false } };

export default function AdminPortfolioPage() {
  return <main id="main-content" className="admin-page"><header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · MANAGEMENT</p><h1>Gallery / <em>portfolio.</em></h1><p>Local image references only. Sample artwork stays labelled as sample content.</p></header><AdminPortfolioManager /></main>;
}
