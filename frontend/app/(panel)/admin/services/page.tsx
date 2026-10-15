import type { Metadata } from "next";
import { AdminServiceManager } from "../../../../components/admin-service-manager";

export const metadata: Metadata = { title: "Manage services", description: "Manage the services shown on the TSG EVENTS public website.", robots: { index: false, follow: false } };

export default function AdminServicesPage() {
  return <main id="main-content" className="admin-page"><header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · MANAGEMENT</p><h1>Our <em>services.</em></h1><p>Active services appear on the public website. Deactivated services remain saved here.</p></header><AdminServiceManager /></main>;
}
