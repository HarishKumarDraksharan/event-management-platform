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
  const cards = [
    { title: "Enquiries", count: summary?.enquiries, href: "/admin/enquiries", description: "Review incoming messages." },
    { title: "Services", count: summary?.activeServices, href: "/admin/services", description: "Manage active public services." },
    { title: "Gallery / Portfolio", count: summary?.publishedPortfolio, href: "/admin/portfolio", description: "Manage published portfolio entries." },
  ];
  return <main id="main-content" className="admin-page"><header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · PRIVATE ADMIN</p><h1>Dashboard <em>overview.</em></h1><p>Manage public content and review new enquiries.</p></header>{summary ? <section className="admin-summary-grid" aria-label="Management summary">{cards.map((card) => <Link className="admin-summary-card" href={card.href} key={card.href}><span className="eyebrow">{card.title}</span><strong>{card.count}</strong><span>{card.description}</span><span className="text-link">Open section ↗</span></Link>)}</section> : <p className="admin-notice" role="alert">Dashboard summary is temporarily unavailable. The management sections remain available below.</p>}<nav className="admin-shortcuts" aria-label="Management sections">{cards.map((card) => <Link className="admin-section-link" href={card.href} key={card.href}>{card.title} <span aria-hidden="true">↗</span></Link>)}</nav></main>;
}
