"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminAccordion } from "./admin-accordion";
import { AdminGalleryImageField } from "./admin-gallery-image-field";

type Entry = { id: string; title: string; description: string; imageRef: string; altText: string; isSample: boolean; isPublished: boolean; sortOrder: number };
const defaultMaxImageSize = 10 * 1024 * 1024;
const images = ["/images/gathering-study.svg", "/images/table-study.svg", "/images/colour-study.svg"];

async function responseError(response: Response) {
  try { const data = await response.json(); return typeof data.error === "string" ? data.error : "The request could not be completed."; }
  catch { return "The request could not be completed."; }
}

function fields(form: HTMLFormElement) {
  const data = new FormData(form);
  const uploadToken = String(data.get("imageUploadToken") ?? "");
  const imageRef = String(data.get("imageRef") ?? "");
  const originalImageRef = String(data.get("initialImageRef") ?? "");
  const result: Record<string, unknown> = {
    title: String(data.get("title") ?? ""),
    description: String(data.get("description") ?? ""),
    altText: String(data.get("altText") ?? ""),
    sortOrder: Number(data.get("sortOrder") ?? 0),
  };
  if (uploadToken) {
    result.imageUploadToken = uploadToken;
    if (originalImageRef) result.expectedImageRef = originalImageRef;
  } else if (!originalImageRef || originalImageRef !== imageRef) {
    result.imageRef = imageRef;
  }
  return result;
}

export function AdminPortfolioManager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  const [maxImageSize, setMaxImageSize] = useState(defaultMaxImageSize);
  const [createFormKey, setCreateFormKey] = useState(0);
  useEffect(() => {
    fetch("/api/admin/portfolio", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      setEntries(data.entries);
      const configuredLimit = Number(response.headers?.get("X-Max-Gallery-Image-Size-Bytes"));
      if (Number.isSafeInteger(configuredLimit) && configuredLimit > 0) setMaxImageSize(configuredLimit);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Portfolio entries are unavailable.")).finally(() => setLoading(false));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setPending("create"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/portfolio", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields(form)) });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json(); setEntries((current) => [...current, data.entry]); setCreateFormKey((current) => current + 1); setMessage("Portfolio entry created as unpublished.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Portfolio entry could not be saved."); }
    finally { setPending(""); }
  }

  async function update(event: FormEvent<HTMLFormElement>, entry: Entry) {
    event.preventDefault(); const form = event.currentTarget; setPending(entry.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/portfolio/${entry.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields(form)) });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json(); setEntries((current) => current.map((item) => item.id === entry.id ? data.entry : item)); setMessage("Portfolio entry updated.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Portfolio entry could not be updated."); }
    finally { setPending(""); }
  }

  async function setPublished(entry: Entry) {
    setPending(entry.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/portfolio/${entry.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished: !entry.isPublished }) });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json(); setEntries((current) => current.map((item) => item.id === entry.id ? data.entry : item)); setMessage(entry.isPublished ? "Portfolio entry unpublished." : "Portfolio entry published.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publication status could not be changed."); }
    finally { setPending(""); }
  }

  return <div className="admin-manager"><AdminAccordion className="admin-form-card" title="Add a gallery entry" eyebrow="CREATE CONTENT" status={<span className="admin-accordion-action-label">Add entry</span>}><p>Choose an approved sample image or upload a JPEG, PNG, or WebP. New entries remain unpublished until you publish them.</p><form className="admin-editor-form" onSubmit={create}><PortfolioFields key={createFormKey} prefix="new" maxImageSize={maxImageSize} disabled={pending === "create"} /><button className="button button-dark" disabled={pending === "create"}>{pending === "create" ? "Saving…" : "Create entry"}</button></form></AdminAccordion>{message ? <p role="status" className="admin-status">{message}</p> : null}{error ? <p role="alert" className="admin-notice">{error}</p> : null}{loading ? <p role="status">Loading portfolio entries…</p> : entries.length === 0 ? <section className="admin-empty"><h2>No gallery entries yet.</h2><p>Create an entry to begin building the portfolio.</p></section> : <section className="admin-managed-list" aria-label="Existing portfolio entries">{entries.map((entry) => <AdminAccordion key={entry.id} eyebrow={entry.isSample ? "SAMPLE ARTWORK" : "PORTFOLIO ENTRY"} title={entry.title} status={<span className={`admin-state ${entry.isPublished ? "is-active" : "is-inactive"}`}>{entry.isPublished ? "Published" : "Unpublished"}</span>}><form className="admin-editor-form" onSubmit={(event) => update(event, entry)}><PortfolioFields key={`${entry.id}:${entry.title}:${entry.imageRef}:${entry.description}:${entry.altText}:${entry.sortOrder}`} prefix={entry.id} entry={entry} maxImageSize={maxImageSize} disabled={pending === entry.id} /><div className="admin-form-actions"><button className="button button-dark" disabled={pending === entry.id}>{pending === entry.id ? "Saving…" : "Save changes"}</button><button className="button button-light" type="button" disabled={pending === entry.id} onClick={() => setPublished(entry)}>{entry.isPublished ? "Unpublish" : "Publish"}</button></div></form></AdminAccordion>)}</section>}</div>;
}

function PortfolioFields({ prefix, entry, maxImageSize, disabled }: { prefix: string; entry?: Entry; maxImageSize: number; disabled: boolean }) {
  const initialImageRef = entry?.imageRef ?? "";
  const currentImageRef = entry?.imageRef ?? images[0];

  return <>
    <label className="admin-field" htmlFor={`${prefix}-title`}>Title<input id={`${prefix}-title`} name="title" required minLength={2} maxLength={120} defaultValue={entry?.title} /></label>
    <label className="admin-field" htmlFor={`${prefix}-description`}>Description<textarea id={`${prefix}-description`} name="description" required minLength={10} maxLength={1000} defaultValue={entry?.description} /></label>
    <AdminGalleryImageField prefix={prefix} label={entry ? "Replace image" : "Upload image"} currentImageRef={currentImageRef} initialImageRef={initialImageRef} currentImageAlt={entry?.altText ?? "Current image selection"} chooseImageLabel={entry ? "Choose replacement image" : "Choose gallery image"} maxImageSize={maxImageSize} disabled={disabled} />
    <label className="admin-field" htmlFor={`${prefix}-alt`}>Accessible image description<input id={`${prefix}-alt`} name="altText" required minLength={5} maxLength={300} defaultValue={entry?.altText} /></label>
    <label className="admin-field" htmlFor={`${prefix}-order`}>Display order<input id={`${prefix}-order`} type="number" name="sortOrder" min="0" max="1000" defaultValue={entry?.sortOrder ?? 0} /></label>
  </>;
}
