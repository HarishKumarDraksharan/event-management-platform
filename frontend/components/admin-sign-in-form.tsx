"use client";

import { FormEvent, useState } from "react";

export function AdminSignInForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      if (!response.ok) {
        setError("Sign in failed. Check your details and try again.");
        return;
      }
      window.location.replace("/admin");
    } catch {
      setError("Sign in is temporarily unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label htmlFor="admin-email">Email address</label>
      <input id="admin-email" name="email" type="email" autoComplete="username" maxLength={254} required />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={128} required />
      <button className="button button-dark" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span>
      </button>
      <p className="admin-form-message" role="alert" aria-live="polite">{error}</p>
    </form>
  );
}
