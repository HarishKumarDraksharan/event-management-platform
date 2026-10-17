"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { AdminAccordion } from "./admin-accordion";
import { AdminGalleryImageField } from "./admin-gallery-image-field";

type HeroSlide = { id: string; heading: string; description: string; buttonLabel: string; destinationUrl: string; imageRef: string; isPublished: boolean; sortOrder: number };
const images = ["/images/gathering-study.svg", "/images/table-study.svg", "/images/colour-study.svg"];

function fields(form: HTMLFormElement) {
  const data = new FormData(form);
  const uploadToken = String(data.get("imageUploadToken") ?? "");
  const result: Record<string, unknown> = {
    heading: String(data.get("heading") ?? ""),
    description: String(data.get("description") ?? ""),
    buttonLabel: String(data.get("buttonLabel") ?? ""),
    destinationUrl: String(data.get("destinationUrl") ?? ""),
    imageRef: String(data.get("imageRef") ?? ""),
    sortOrder: Number(data.get("sortOrder") ?? 0),
    isPublished: data.get("isPublished") === "true",
    expectedImageRef: String(data.get("initialImageRef") ?? ""),
  };
  if (uploadToken) {
    result.imageUploadToken = uploadToken;
  }
  return result;
}

async function responseError(response: Response) {
  try { const data = await response.json(); return typeof data.error === "string" ? data.error : "The request could not be completed."; }
  catch { return "The request could not be completed."; }
}

export function AdminHeroSlideManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  const [createFormKey, setCreateFormKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/hero-slides", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      setSlides((await response.json()).slides);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Homepage slides are unavailable.")).finally(() => setLoading(false));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending("create"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/hero-slides", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields(form)) });
      if (!response.ok) throw new Error(await responseError(response));
      const { slide } = await response.json();
      setSlides((current) => [...current, slide].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)));
      setCreateFormKey((current) => current + 1);
      form.reset(); setMessage("Homepage slide created as a draft.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Homepage slide could not be saved."); }
    finally { setPending(""); }
  }

  async function update(event: FormEvent<HTMLFormElement>, slide: HeroSlide) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(slide.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/hero-slides/" + slide.id, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields(form)) });
      if (!response.ok) throw new Error(await responseError(response));
      const { slide: updated } = await response.json();
      setSlides((current) => current.map((item) => item.id === slide.id ? updated : item).sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)));
      setMessage("Homepage slide updated.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Homepage slide could not be updated."); }
    finally { setPending(""); }
  }

  async function setPublished(slide: HeroSlide) {
    setPending(slide.id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/hero-slides/" + slide.id, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished: !slide.isPublished }) });
      if (!response.ok) throw new Error(await responseError(response));
      const { slide: updated } = await response.json();
      setSlides((current) => current.map((item) => item.id === slide.id ? updated : item));
      setMessage(updated.isPublished ? "Homepage slide published." : "Homepage slide unpublished.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Slide publication status could not be changed."); }
    finally { setPending(""); }
  }

  return <div className="admin-manager"><AdminAccordion className="admin-form-card" title="Add a homepage slide" eyebrow="CREATE CONTENT" status={<span className="admin-accordion-action-label">Add slide</span>}>
      <p>Upload an event image for each slide. New slides are saved as drafts until published.</p>
      <SlideForm key={createFormKey} onSubmit={create} submitLabel={pending === "create" ? "Saving…" : "Create slide"} pending={pending === "create"} />
    </AdminAccordion>
    {message ? <p role="status" className="admin-status">{message}</p> : null}{error ? <p role="alert" className="admin-notice">{error}</p> : null}
    {loading ? <p role="status">Loading homepage slides…</p> : slides.length === 0 ? <section className="admin-empty"><h2>No slides yet.</h2><p>Create and publish a slide to show a homepage hero.</p></section> : <section className="admin-managed-list" aria-label="Homepage slide editors">{slides.map((slide) => <AdminAccordion key={slide.id} eyebrow={`DISPLAY ORDER ${slide.sortOrder}`} title={slide.heading} status={<span className={`admin-state ${slide.isPublished ? "is-active" : "is-inactive"}`}>{slide.isPublished ? "Published" : "Draft"}</span>}>
      <SlideForm key={slide.id + "-" + String(slide.isPublished)} slide={slide} onSubmit={(event) => update(event, slide)} submitLabel={pending === slide.id ? "Saving…" : "Save changes"} pending={pending === slide.id} onToggle={() => setPublished(slide)} toggleLabel={slide.isPublished ? "Unpublish" : "Publish"} />
    </AdminAccordion>)}</section>}
  </div>;
}

function SlideForm({ slide, onSubmit, submitLabel, pending, onToggle, toggleLabel }: { slide?: HeroSlide; onSubmit: (event: FormEvent<HTMLFormElement>) => void; submitLabel: string; pending: boolean; onToggle?: () => void; toggleLabel?: string }) {
  return <form className="admin-editor-form" onSubmit={onSubmit}>
    <SlideTextField label="Heading" name="heading" required maxLength={120} defaultValue={slide?.heading} />
    <SlideTextField label="Button label" name="buttonLabel" required maxLength={80} defaultValue={slide?.buttonLabel} />
    <SlideTextField label="Description" name="description" required maxLength={500} multiline defaultValue={slide?.description} />
    <SlideTextField label="Destination URL" name="destinationUrl" required maxLength={300} placeholder="/contact" defaultValue={slide?.destinationUrl} />
    <AdminGalleryImageField prefix={`hero-${slide?.id ?? "new"}`} label={slide ? "Replace slide image" : "Upload slide image"} currentImageRef={slide?.imageRef ?? images[0]} initialImageRef={slide?.imageRef ?? ""} chooseImageLabel={slide ? "Choose replacement image" : "Choose slide image"} disabled={pending} />
    <SlideTextField label="Display order" name="sortOrder" type="number" min="0" max="1000" required defaultValue={String(slide?.sortOrder ?? 0)} />
    <label className="admin-field">Publication status<select name="isPublished" defaultValue={String(slide?.isPublished ?? false)}><option value="false">Draft</option><option value="true">Published</option></select></label>
    <p className="admin-slide-hint">Use a root-relative site path for the button destination. Uploads are saved only when you save the slide.</p>
    <div className="admin-form-actions"><button className="button button-dark" disabled={pending}>{submitLabel}</button>{onToggle && toggleLabel ? <button className="button button-light" type="button" disabled={pending} onClick={onToggle}>{toggleLabel}</button> : null}</div>
  </form>;
}

function SlideTextField({ label, name, multiline, ...props }: { label: string; name: string; multiline?: boolean; required?: boolean; maxLength?: number; type?: string; min?: string; max?: string; placeholder?: string; defaultValue?: string }) {
  const id = "hero-slide-" + useId().replaceAll(":", "");
  return <label className="admin-field" htmlFor={id}>{label}{multiline ? <textarea id={id} name={name} required={props.required} maxLength={props.maxLength} defaultValue={props.defaultValue} /> : <input id={id} name={name} required={props.required} maxLength={props.maxLength} type={props.type ?? "text"} min={props.min} max={props.max} placeholder={props.placeholder} defaultValue={props.defaultValue} />}</label>;
}
