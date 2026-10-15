import Link from "next/link";
import { AdminSignOutButton } from "./admin-sign-out-button";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/portfolio", label: "Gallery / Portfolio" },
];

export function AdminNavigation() {
  return <header className="admin-nav"><Link className="admin-brand" href="/admin"><span className="brand-mark" aria-hidden="true">T</span><span>TSG EVENTS <small>ADMIN</small></span></Link><nav className="admin-nav-links" aria-label="Admin navigation">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav><AdminSignOutButton /><details className="admin-mobile-nav"><summary>Menu</summary><nav aria-label="Mobile admin navigation">{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}<AdminSignOutButton /></nav></details></header>;
}
