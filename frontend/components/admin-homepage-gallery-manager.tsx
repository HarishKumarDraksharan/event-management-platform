"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

type GalleryEntry = { id: string; title: string; imageRef: string; altText: string; isPublished: boolean; isSample: boolean };
type Section = { eyebrow: string; heading: string; isVisible: boolean };
type EditorData = { section: Section; entryIds: string[]; entries: GalleryEntry[] };
const maximumSelectedEntries = 30;

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body && typeof body.error === "string" ? body.error : "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

export function AdminHomepageGalleryManager() {
  const [data, setData] = useState<EditorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/homepage-gallery", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        setData(await response.json());
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Homepage Gallery settings could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  function updateSection(field: keyof Section, value: string | boolean) {
    setData((current) => current ? { ...current, section: { ...current.section, [field]: value } } : current);
  }

  function toggleEntry(id: string, selected: boolean) {
    setData((current) => {
      if (!current) return current;
      if (selected && current.entryIds.length >= maximumSelectedEntries) return current;
      return {
        ...current,
        entryIds: selected ? [...current.entryIds, id] : current.entryIds.filter((entryId) => entryId !== id),
      };
    });
  }

  function moveEntry(index: number, direction: -1 | 1) {
    setData((current) => {
      if (!current) return current;
      const entryIds = [...current.entryIds];
      const target = index + direction;
      if (target < 0 || target >= entryIds.length) return current;
      [entryIds[index], entryIds[target]] = [entryIds[target], entryIds[index]];
      return { ...current, entryIds };
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/homepage-gallery", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.section, entryIds: data.entryIds }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const result: { section: Section; entryIds: string[] } = await response.json();
      setData((current) => current ? { ...current, section: result.section, entryIds: result.entryIds } : current);
      setMessage("Homepage Gallery section saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Homepage Gallery settings could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading Homepage Gallery settings…</p>;
  if (!data) return <p className="admin-notice" role="alert">{error || "Homepage Gallery settings are unavailable."}</p>;

  const selectedEntries = data.entryIds.flatMap((id) => {
    const entry = data.entries.find((item) => item.id === id);
    return entry ? [entry] : [];
  });
  const hasSelectableEntries = data.entries.length > 0;

  return <section className="admin-form-card">
    <h2>Edit homepage Gallery section</h2>
    <p>Select any gallery image and arrange its homepage display order. Unpublished selections remain hidden from visitors until published; sample artwork remains excluded from the public gallery. Removing an item here only removes it from this homepage section; it does not delete or unpublish the gallery entry.</p>
    {message ? <p role="status" className="admin-status">{message}</p> : null}
    {error ? <p role="alert" className="admin-notice">{error}</p> : null}
    <form className="admin-home-gallery-form" onSubmit={save}>
      <label className="admin-field">Section eyebrow<input value={data.section.eyebrow} maxLength={120} required onChange={(event) => updateSection("eyebrow", event.currentTarget.value)} /></label>
      <label className="admin-field">Section heading<input value={data.section.heading} maxLength={200} required onChange={(event) => updateSection("heading", event.currentTarget.value)} /></label>
      <label className="admin-about-visibility"><span>Show Gallery section on the homepage</span><input type="checkbox" checked={data.section.isVisible} onChange={(event) => updateSection("isVisible", event.currentTarget.checked)} /></label>
      <fieldset className="admin-home-gallery-selection">
        <legend>Gallery items · {data.entryIds.length}/{maximumSelectedEntries} selected</legend>
        {hasSelectableEntries || selectedEntries.length ? <div className="admin-home-gallery-options">
          {data.entries.map((entry) => {
            const selected = data.entryIds.includes(entry.id);
            const disabled = !selected && data.entryIds.length >= maximumSelectedEntries;
            const status = entry.isSample
              ? `Sample artwork · ${entry.isPublished ? "excluded from public gallery" : "unpublished and hidden from visitors"}`
              : entry.isPublished ? "Published" : "Unpublished · selected, but hidden from visitors until published";
            return <label className={`admin-home-gallery-option${!entry.isPublished ? " is-unpublished" : ""}`} key={entry.id}>
              <input type="checkbox" aria-label={`Show ${entry.title} on homepage`} checked={selected} disabled={disabled} onChange={(event) => toggleEntry(entry.id, event.currentTarget.checked)} />
              <Image src={entry.imageRef} alt="" width={72} height={56} unoptimized />
              <span className="admin-home-gallery-option-copy"><strong>{entry.title}</strong><small>{status}</small></span>
            </label>;
          })}
        </div> : <p>No gallery entries with valid images are available.</p>}
      </fieldset>
      <fieldset className="admin-home-gallery-order">
        <legend>Homepage display order</legend>
        {selectedEntries.length ? <ol>{selectedEntries.map((entry, index) => <li key={entry.id}>
          <span className="admin-home-gallery-order-entry"><span>{index + 1}.</span> {entry.title}{entry.isPublished ? "" : " (unpublished)"}</span>
          <span className="admin-home-gallery-order-actions">
            <button type="button" aria-label={`Move ${entry.title} up`} disabled={index === 0} onClick={() => moveEntry(index, -1)}>↑</button>
            <button type="button" aria-label={`Move ${entry.title} down`} disabled={index === selectedEntries.length - 1} onClick={() => moveEntry(index, 1)}>↓</button>
            <button type="button" aria-label={`Remove ${entry.title} from homepage`} onClick={() => toggleEntry(entry.id, false)}>Remove</button>
          </span>
        </li>)}</ol> : <p>Select published items above to build the homepage gallery.</p>}
      </fieldset>
      <div className="admin-form-actions"><button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Gallery section"}</button></div>
    </form>
  </section>;
}
