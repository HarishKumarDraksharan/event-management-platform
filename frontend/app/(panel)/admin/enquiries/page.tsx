import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Enquiries", description: "Review TSG EVENTS customer enquiries.", robots: { index: false, follow: false } };
type Enquiry = { id: string; name: string; email: string; phone: string | null; eventType: string; eventDate: string | null; guestCount: number | null; message: string; createdAt: string };

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = /^\d{1,3}$/.test(pageParam ?? "") ? Math.max(1, Number(pageParam)) : 1;
  const cookie = (await headers()).get("cookie") ?? "";
  let listing: { enquiries: Enquiry[]; page: number; total: number; totalPages: number } | null = null;
  try {
    const base = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    const response = await fetch(`${base}/api/admin/enquiries?page=${page}`, { headers: { cookie }, cache: "no-store" });
    if (response.ok) listing = await response.json();
  } catch { /* Render a safe, recoverable state below. */ }
  if (listing && page > listing.totalPages) redirect(`/admin/enquiries?page=${listing.totalPages}`);
  return <main id="main-content" className="admin-page"><header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · ENQUIRIES</p><h1>Enquiry <em>inbox.</em></h1><p>Customer details are visible only to administrator accounts.</p></header>{!listing ? <p className="admin-notice" role="alert">Enquiries are temporarily unavailable. Please refresh in a moment.</p> : listing.enquiries.length === 0 ? <section className="admin-empty"><h2>A quiet moment.</h2><p>No enquiries have arrived yet.</p></section> : <section className="admin-enquiries" aria-label="Enquiries">{listing.enquiries.map((enquiry) => <article className="admin-enquiry" key={enquiry.id}><header><div><p className="eyebrow">{enquiry.eventType}</p><h2>{enquiry.name}</h2></div><time dateTime={enquiry.createdAt}>{new Date(enquiry.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })}</time></header><dl><div><dt>Email</dt><dd><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a></dd></div>{enquiry.phone ? <div><dt>Phone</dt><dd><a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a></dd></div> : null}{enquiry.eventDate ? <div><dt>Event date</dt><dd>{new Date(`${enquiry.eventDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "UTC" })}</dd></div> : null}{enquiry.guestCount ? <div><dt>Guests</dt><dd>{enquiry.guestCount}</dd></div> : null}</dl><p className="admin-message">{enquiry.message}</p></article>)}</section>}{listing ? <nav className="admin-pagination" aria-label="Enquiry pages">{page > 1 ? <Link href={`/admin/enquiries?page=${page - 1}`}>Newer</Link> : <span /> }<span>Page {page} of {listing.totalPages} · {listing.total} enquiries</span>{page < listing.totalPages ? <Link href={`/admin/enquiries?page=${page + 1}`}>Older</Link> : <span />}</nav> : null}</main>;
}
