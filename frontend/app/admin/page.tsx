import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminSignOutButton } from "../../components/admin-sign-out-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Enquiry dashboard",
  description: "Review TSG EVENTS enquiries.",
  robots: { index: false, follow: false },
};

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  eventType: string;
  eventDate: string | null;
  guestCount: number | null;
  message: string;
  createdAt: string;
};

function apiBase() {
  return process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const cookie = (await headers()).get("cookie") ?? "";
  let sessionResponse: Response;
  try {
    sessionResponse = await fetch(`${apiBase()}/api/auth/get-session`, { headers: { cookie }, cache: "no-store" });
  } catch {
    return <main id="main-content" className="admin-shell"><p role="alert">The admin area is temporarily unavailable. Please try again.</p></main>;
  }
  if (sessionResponse.status === 401) redirect("/admin/sign-in");
  if (!sessionResponse.ok) return <main id="main-content" className="admin-shell"><p role="alert">The admin area is temporarily unavailable. Please try again.</p></main>;
  let session;
  try {
    session = await sessionResponse.json();
  } catch {
    return <main id="main-content" className="admin-shell"><p role="alert">The admin area is temporarily unavailable. Please try again.</p></main>;
  }
  if (!session?.user) redirect("/admin/sign-in");
  if (session.user.role !== "admin") {
    return <main id="main-content" className="admin-shell"><section className="admin-card"><h1>Access <em>denied.</em></h1><p>This account does not have administrator access.</p><AdminSignOutButton /></section></main>;
  }

  const { page: pageParam } = await searchParams;
  const page = /^\d{1,3}$/.test(pageParam ?? "") ? Math.max(1, Number(pageParam)) : 1;
  let listing: { enquiries: Enquiry[]; page: number; total: number; totalPages: number } | null = null;
  let listingUnavailable = false;
  try {
    const response = await fetch(`${apiBase()}/api/admin/enquiries?page=${page}`, { headers: { cookie }, cache: "no-store" });
    if (response.ok) listing = await response.json();
    else listingUnavailable = true;
  } catch {
    listingUnavailable = true;
  }
  if (listing && page > listing.totalPages) redirect(`/admin?page=${listing.totalPages}`);

  return (
    <main id="main-content" className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div><p className="eyebrow">TSG EVENTS · PRIVATE ADMIN</p><h1>Enquiry <em>inbox.</em></h1><p>Review the details shared through the public enquiry form.</p></div>
        <AdminSignOutButton />
      </header>
      {listingUnavailable ? <p className="admin-notice" role="alert">Enquiries are temporarily unavailable. Please refresh in a moment.</p> : null}
      {listing && listing.enquiries.length === 0 ? <section className="admin-empty"><h2>A quiet moment.</h2><p>No enquiries have arrived yet.</p></section> : null}
      <section className="admin-enquiries" aria-label="Enquiries">
        {listing?.enquiries.map((enquiry) => (
          <article className="admin-enquiry" key={enquiry.id}>
            <header><div><p className="eyebrow">{enquiry.eventType}</p><h2>{enquiry.name}</h2></div><time dateTime={enquiry.createdAt}>{new Date(enquiry.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })}</time></header>
            <dl><div><dt>Email</dt><dd><a href={`mailto:${enquiry.email}`}>{enquiry.email}</a></dd></div>{enquiry.phone ? <div><dt>Phone</dt><dd><a href={`tel:${enquiry.phone}`}>{enquiry.phone}</a></dd></div> : null}{enquiry.eventDate ? <div><dt>Event date</dt><dd>{new Date(`${enquiry.eventDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "UTC" })}</dd></div> : null}{enquiry.guestCount ? <div><dt>Guests</dt><dd>{enquiry.guestCount}</dd></div> : null}</dl>
            <p className="admin-message">{enquiry.message}</p>
          </article>
        ))}
      </section>
      {listing && listing.totalPages > 1 ? <nav className="admin-pagination" aria-label="Enquiry pages">{page > 1 ? <a href={`/admin?page=${page - 1}`}>← Newer</a> : <span /> }<span>Page {page} of {listing.totalPages} · {listing.total} enquiries</span>{page < listing.totalPages ? <a href={`/admin?page=${page + 1}`}>Older →</a> : <span />}</nav> : null}
      {listing && listing.totalPages <= 1 ? <p className="admin-count">{listing.total} {listing.total === 1 ? "enquiry" : "enquiries"}</p> : null}
    </main>
  );
}
