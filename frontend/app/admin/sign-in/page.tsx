import type { Metadata } from "next";
import { AdminSignInForm } from "../../../components/admin-sign-in-form";

export const metadata: Metadata = {
  title: "Administrator sign in",
  description: "Sign in to the TSG EVENTS administration area.",
  robots: { index: false, follow: false },
};

export default function AdminSignInPage() {
  return (
    <main id="main-content" className="admin-shell">
      <section className="admin-card" aria-labelledby="admin-sign-in-title">
        <p className="eyebrow">TSG EVENTS · ADMINISTRATION</p>
        <h1 id="admin-sign-in-title">Welcome <em>back.</em></h1>
        <p className="admin-lede">Sign in to review incoming event enquiries.</p>
        <AdminSignInForm />
      </section>
    </main>
  );
}
