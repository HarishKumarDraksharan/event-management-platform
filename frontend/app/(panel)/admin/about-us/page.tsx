import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "About Us content", description: "Review the TSG EVENTS About Us page and its current content status.", robots: { index: false, follow: false } };

export default function AdminAboutUsPage() {
  return <main id="main-content" className="admin-page">
    <header className="admin-page-heading"><p className="eyebrow">TSG EVENTS · CONTENT MANAGEMENT</p><h1>About Us <em>content.</em></h1><p>Review the current public page and its content status.</p></header>
    <section className="admin-form-card admin-about-content" aria-labelledby="about-content-heading">
      <p className="eyebrow">CONTENT STATUS</p><h2 id="about-content-heading">Public content is currently static</h2>
      <p>The About Us page currently contains the company introduction, approach copy, and a decorative illustration. These items do not have a database editor yet, so this area does not present them as editable.</p>
      <Link className="text-link" href="/about">View the public About Us page <span aria-hidden="true">↗</span></Link>
    </section>
  </main>;
}
