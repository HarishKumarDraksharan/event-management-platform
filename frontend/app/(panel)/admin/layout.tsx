import "../../admin.css";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminNavigation } from "../../../components/admin-navigation";
import { AdminSignOutButton } from "../../../components/admin-sign-out-button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookie = (await headers()).get("cookie") ?? "";
  let response: Response;
  try {
    const base = process.env.BACKEND_INTERNAL_URL ?? "http://backend:3001";
    response = await fetch(`${base}/api/auth/get-session`, { headers: { cookie }, cache: "no-store" });
  } catch {
    return <main id="main-content" className="admin-shell"><p role="alert">The admin area is temporarily unavailable. Please try again.</p></main>;
  }
  if (response.status === 401) redirect("/admin/sign-in");
  if (!response.ok) return <main id="main-content" className="admin-shell"><p role="alert">The admin area is temporarily unavailable. Please try again.</p></main>;
  let session: { user?: { role?: string } } | null;
  try {
    session = await response.json();
  } catch {
    return <main id="main-content" className="admin-shell"><p role="alert">The admin area is temporarily unavailable. Please try again.</p></main>;
  }
  if (!session?.user) redirect("/admin/sign-in");
  if (session.user.role !== "admin") return <div className="admin-frame"><a className="skip-link" href="#main-content">Skip to content</a><header className="admin-nav"><Link className="admin-brand" href="/admin">TSG EVENTS <small>ADMIN</small></Link></header><main id="main-content" className="admin-shell"><section className="admin-card"><h1>Access <em>denied.</em></h1><p>This account does not have administrator access.</p><AdminSignOutButton /></section></main></div>;
  return <div className="admin-frame"><a className="skip-link" href="#main-content">Skip to content</a><AdminNavigation />{children}</div>;
}
