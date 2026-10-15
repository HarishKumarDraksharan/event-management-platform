"use client";

import { FormEvent, useEffect, useState } from "react";

type Entry = { id: string; title: string; description: string; imageRef: string; altText: string; isSample: boolean; isPublished: boolean; sortOrder: number };
const images = ["/images/gathering-study.svg", "/images/table-study.svg", "/images/colour-study.svg"];

async function responseError(response: Response) {
  try { const data = await response.json(); return typeof data.error === "string" ? data.error : "The request could not be completed."; }
  catch { return "The request could not be completed."; }
}
function fields(form: HTMLFormElement) {
  const data = new FormData(form);
  return { title: String(data.get("title") ?? ""), description: String(data.get("description") ?? ""), imageRef: String(data.get("imageRef") ?? ""), altText: String(data.get("altText") ?? ""), sortOrder: Number(data.get("sortOrder") ?? 0) };
}

export function AdminPortfolioManager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  useEffect(() => {
    fetch("/api/admin/portfolio", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json(); setEntries(data.entries);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Portfolio entries are unavailable.")).finally(() => setLoading(false));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setPending("create"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/portfolio", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields(form)) });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json(); setEntries((current) => [...current, data.entry]); form.reset(); setMessage("Portfolio entry created as unpublished.");
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

  return <div className="admin-manager"><section className="admin-form-card"><h2>Add a gallery entry</h2><p>Image references must use one of the approved local sample assets. New entries remain unpublished until you publish them.</p><form className="admin-editor-form" onSubmit={create}><PortfolioFields prefix="new" /><button className="button button-dark" disabled={pending === "create"}>{pending === "create" ? "Saving…" : "Create entry"}</button></form></section>{message ? <p role="status" className="admin-status">{message}</p> : null}{error ? <p role="alert" className="admin-notice">{error}</p> : null}{loading ? <p role="status">Loading portfolio entries…</p> : entries.length === 0 ? <section className="admin-empty"><h2>No gallery entries yet.</h2><p>Create an entry to begin building the portfolio.</p></section> : <section className="admin-managed-list" aria-label="Existing portfolio entries">{entries.map((entry) => <article className="admin-managed-card" key={entry.id}><header><div><p className="eyebrow">{entry.isSample ? "SAMPLE ARTWORK" : "PORTFOLIO ENTRY"}</p><h2>{entry.title}</h2></div><span className={`admin-state ${entry.isPublished ? "is-active" : "is-inactive"}`}>{entry.isPublished ? "Published" : "Unpublished"}</span></header><form className="admin-editor-form" onSubmit={(event) => update(event, entry)}><PortfolioFields prefix={entry.id} entry={entry} /><div className="admin-form-actions"><button className="button button-dark" disabled={pending === entry.id}>{pending === entry.id ? "Saving…" : "Save changes"}</button><button className="button button-light" type="button" disabled={pending === entry.id} onClick={() => setPublished(entry)}>{entry.isPublished ? "Unpublish" : "Publish"}</button></div></form></article>)}</section>}</div>;
}

function PortfolioFields({ prefix, entry }: { prefix: string; entry?: Entry }) {
  return <><label className="admin-field" htmlFor={`${prefix}-title`}>Title<input id={`${prefix}-title`} name="title" required minLength={2} maxLength={120} defaultValue={entry?.title} /></label><label className="admin-field" htmlFor={`${prefix}-description`}>Description<textarea id={`${prefix}-description`} name="description" required minLength={10} maxLength={1000} defaultValue={entry?.description} /></label><label className="admin-field" htmlFor={`${prefix}-image`}>Approved local image<select id={`${prefix}-image`} name="imageRef" defaultValue={entry?.imageRef ?? images[0]}>{images.map((image) => <option key={image} value={image}>{image}</option>)}</select></label><label className="admin-field" htmlFor={`${prefix}-alt`}>Accessible image description<input id={`${prefix}-alt`} name="altText" required minLength={5} maxLength={300} defaultValue={entry?.altText} /></label><label className="admin-field" htmlFor={`${prefix}-order`}>Display order<input id={`${prefix}-order`} type="number" name="sortOrder" min="0" max="1000" defaultValue={entry?.sortOrder ?? 0} /></label></>;
}
