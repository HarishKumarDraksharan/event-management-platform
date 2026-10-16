import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "Dashboard", description: "TSG EVENTS administration dashboard.", robots: { index: false, follow: false } };

export default async function AdminDashboard() {
  const cookie = (await headers()).get("cookie") ?? "";
  let summary: { enquiries: number; activeServices: number; publishedPortfolio: number } | null = null;
  try {
    const base = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    const response = await fetch(`${base}/api/admin/summary`, { headers: { cookie }, cache: "no-store" });
    if (response.ok) summary = await response.json();
  } catch { /* Render a safe, recoverable state below. */ }

  const sections: { title: string; href: string; description: string; count?: number }[] = [
    { title: "Homepage", href: "/admin/homepage", description: "Manage the homepage carousel and introduction." },
    { title: "About Us", href: "/admin/about-us", description: "Review the About Us page and its content status." },
    { title: "Services", href: "/admin/services", description: "Manage the active public service catalogue.", count: summary?.activeServices },
    { title: "Gallery", href: "/admin/portfolio", description: "Manage gallery entries and publication status.", count: summary?.publishedPortfolio },
    { title: "Enquiries", href: "/admin/enquiries", description: "Review incoming customer enquiries.", count: summary?.enquiries },
  ];

  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading">
      <p className="eyebrow">TSG EVENTS · PRIVATE ADMIN</p>
      <h1>Dashboard <em>overview.</em></h1>
      <p>Manage public content and review new enquiries.</p>
    </header>
    {!summary ? <p className="admin-notice" role="status">Activity counts are temporarily unavailable. The management sections remain available below.</p> : null}
    <section className="admin-dashboard-grid" aria-label="Dashboard management areas">
      {sections.map((section) => <Link className="admin-dashboard-card" href={section.href} key={section.title}>
        <span className="eyebrow">{section.title}</span>
        {section.count !== undefined ? <strong>{section.count}</strong> : null}
        <span>{section.description}</span>
        <span className="text-link">Open section <span aria-hidden="true">↗</span></span>
      </Link>)}
    </section>
  </main>;
}
