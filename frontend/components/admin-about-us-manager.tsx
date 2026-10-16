"use client";

import { FormEvent, useEffect, useId, useState } from "react";

type AboutUs = {
  eyebrow: string;
  heading: string;
  firstParagraph: string;
  secondParagraph: string;
  imageUrl: string;
  imageCaption: string;
  buttonLabel: string;
  destinationUrl: string;
  isVisible: boolean;
};

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body && typeof body.error === "string" ? body.error : "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

export function AdminAboutUsManager() {
  const [aboutUs, setAboutUs] = useState<AboutUs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/about-us", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json();
      setAboutUs(body.aboutUs);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "About Us content could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const content: AboutUs = {
      eyebrow: String(form.get("eyebrow") ?? ""),
      heading: String(form.get("heading") ?? ""),
      firstParagraph: String(form.get("firstParagraph") ?? ""),
      secondParagraph: String(form.get("secondParagraph") ?? ""),
      imageUrl: String(form.get("imageUrl") ?? ""),
      imageCaption: String(form.get("imageCaption") ?? ""),
      buttonLabel: String(form.get("buttonLabel") ?? ""),
      destinationUrl: String(form.get("destinationUrl") ?? ""),
      isVisible: form.get("isVisible") === "on",
    };
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/about-us", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json();
      setAboutUs(body.aboutUs);
      setMessage("About Us section saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "About Us content could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading About Us content…</p>;
  if (!aboutUs) return <p className="admin-notice" role="alert">{error || "About Us content is unavailable."}</p>;

  return <section className="admin-form-card">
    <h2>Edit homepage About Us section</h2>
    <p>Changes are saved to the content database and appear on the public homepage after saving.</p>
    {message ? <p role="status" className="admin-status">{message}</p> : null}
    {error ? <p role="alert" className="admin-notice">{error}</p> : null}
    <form className="admin-editor-form" onSubmit={save}>
      <AboutUsField label="Eyebrow" name="eyebrow" defaultValue={aboutUs.eyebrow} maxLength={120} required />
      <AboutUsField label="Main heading" name="heading" defaultValue={aboutUs.heading} maxLength={200} required />
      <AboutUsField label="First paragraph" name="firstParagraph" defaultValue={aboutUs.firstParagraph} maxLength={2000} required multiline />
      <AboutUsField label="Second paragraph" name="secondParagraph" defaultValue={aboutUs.secondParagraph} maxLength={2000} required multiline />
      <AboutUsField label="Event image URL" name="imageUrl" defaultValue={aboutUs.imageUrl} maxLength={1000} required />
      <AboutUsField label="Image caption" name="imageCaption" defaultValue={aboutUs.imageCaption} maxLength={200} required />
      <AboutUsField label="Button label" name="buttonLabel" defaultValue={aboutUs.buttonLabel} maxLength={80} required />
      <AboutUsField label="Button destination URL" name="destinationUrl" defaultValue={aboutUs.destinationUrl} maxLength={300} required />
      <label className="admin-field admin-about-visibility">
        <span>Show About Us section on the homepage</span>
        <input type="checkbox" name="isVisible" defaultChecked={aboutUs.isVisible} />
      </label>
      <p className="admin-field-hint">Use a root-relative image path, such as /images/gathering-study.svg, or a secure https image URL. Button destinations must be site paths, such as /about.</p>
      <div className="admin-form-actions"><button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save About Us section"}</button></div>
    </form>
  </section>;
}

function AboutUsField({ label, name, multiline, ...props }: { label: string; name: string; multiline?: boolean; defaultValue: string; maxLength: number; required: boolean }) {
  const id = `admin-about-us-${useId().replaceAll(":", "")}`;
  return <label className="admin-field" htmlFor={id}>
    {label}
    {multiline ? <textarea id={id} name={name} defaultValue={props.defaultValue} maxLength={props.maxLength} required={props.required} rows={5} /> : <input id={id} name={name} defaultValue={props.defaultValue} maxLength={props.maxLength} required={props.required} />}
  </label>;
}
