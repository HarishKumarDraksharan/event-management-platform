"use client";

import { FormEvent, useEffect, useId, useState } from "react";

type Introduction = { eyebrow: string; heading: string; highlight: string; description: string };

function errorMessage(response: Response) {
  return response.json().then((body: unknown) => {
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") return body.error;
    return "The request could not be completed.";
  }).catch(() => "The request could not be completed.");
}

export function AdminHomepageIntroductionManager() {
  const [introduction, setIntroduction] = useState<Introduction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/homepage-introduction", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await errorMessage(response));
      const body = await response.json();
      setIntroduction(body.introduction);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "The introduction could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content = {
      eyebrow: String(form.get("eyebrow") ?? ""),
      heading: String(form.get("heading") ?? ""),
      highlight: String(form.get("highlight") ?? ""),
      description: String(form.get("description") ?? ""),
    };
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/homepage-introduction", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const body = await response.json();
      setIntroduction(body.introduction);
      setMessage("Homepage introduction saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The introduction could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading homepage introduction…</p>;
  if (!introduction) return <p className="admin-notice" role="alert">{error || "Homepage introduction is unavailable."}</p>;

  return <section className="admin-form-card">
    <h2>Edit introduction section</h2>
    <p>Update the copy displayed below the homepage hero. The emphasis styling and layout are preserved automatically.</p>
    {message ? <p role="status" className="admin-status">{message}</p> : null}
    {error ? <p role="alert" className="admin-notice">{error}</p> : null}
    <form className="admin-editor-form" onSubmit={save}>
      <IntroductionField label="Eyebrow" name="eyebrow" defaultValue={introduction.eyebrow} maxLength={120} required />
      <IntroductionField label="Heading" name="heading" defaultValue={introduction.heading} maxLength={200} required />
      <IntroductionField label="Highlighted heading" name="highlight" defaultValue={introduction.highlight} maxLength={120} required />
      <IntroductionField label="Description" name="description" defaultValue={introduction.description} maxLength={1000} required multiline />
      <div className="admin-form-actions"><button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save introduction"}</button></div>
    </form>
  </section>;
}

function IntroductionField({ label, name, multiline, ...props }: { label: string; name: string; multiline?: boolean; defaultValue: string; maxLength: number; required: boolean }) {
  const id = `homepage-introduction-${useId().replaceAll(":", "")}`;
  return <label className="admin-field" htmlFor={id}>
    {label}
    {multiline ? <textarea id={id} name={name} defaultValue={props.defaultValue} maxLength={props.maxLength} required={props.required} rows={5} /> : <input id={id} name={name} defaultValue={props.defaultValue} maxLength={props.maxLength} required={props.required} />}
  </label>;
}
