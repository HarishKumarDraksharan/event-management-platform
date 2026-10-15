"use client";

import { FormEvent, useEffect, useId, useState } from "react";

type Service = { id: string; slug: string; title: string; kicker: string; description: string; detail: string; isActive: boolean; sortOrder: number };
const emptyService = { slug: "", title: "", kicker: "", description: "", detail: "", sortOrder: "0" };

function fields(form: HTMLFormElement) {
  const data = new FormData(form);
  return { slug: String(data.get("slug") ?? ""), title: String(data.get("title") ?? ""), kicker: String(data.get("kicker") ?? ""), description: String(data.get("description") ?? ""), detail: String(data.get("detail") ?? ""), sortOrder: Number(data.get("sortOrder") ?? 0) };
}

async function responseError(response: Response) {
  try { const data = await response.json(); return typeof data.error === "string" ? data.error : "The request could not be completed."; }
  catch { return "The request could not be completed."; }
}

export function AdminServiceManager() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");

  useEffect(() => {
    fetch("/api/admin/services", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      setServices(data.services);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Services are unavailable.")).finally(() => setLoading(false));
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending("create"); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/services", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields(form)) });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      setServices((current) => [...current, data.service].sort((a, b) => a.sortOrder - b.sortOrder));
      form.reset(); setMessage("Service created.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Service could not be saved."); }
    finally { setPending(""); }
  }

  async function update(event: FormEvent<HTMLFormElement>, service: Service) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(service.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/services/${service.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fields(form)) });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      setServices((current) => current.map((item) => item.id === service.id ? data.service : item).sort((a, b) => a.sortOrder - b.sortOrder));
      setMessage("Service updated.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Service could not be updated."); }
    finally { setPending(""); }
  }

  async function setActive(service: Service) {
    setPending(service.id); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/services/${service.id}`, { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !service.isActive }) });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();
      setServices((current) => current.map((item) => item.id === service.id ? data.service : item));
      setMessage(service.isActive ? "Service deactivated." : "Service activated.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Service status could not be changed."); }
    finally { setPending(""); }
  }

  return <div className="admin-manager"><section className="admin-form-card"><h2>Add a service</h2><p>Describe a service using information approved for the public website.</p><form className="admin-editor-form" onSubmit={create}><TextField label="URL slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} placeholder="private-celebrations" /><TextField label="Title" name="title" required maxLength={100} /><TextField label="Kicker" name="kicker" required maxLength={120} /><TextField label="Description" name="description" required maxLength={1000} multiline /><TextField label="Details" name="detail" required maxLength={2000} multiline /><TextField label="Display order" name="sortOrder" type="number" min="0" max="1000" defaultValue={emptyService.sortOrder} /><button className="button button-dark" disabled={pending === "create"}>{pending === "create" ? "Saving…" : "Create service"}</button></form></section>
    {message ? <p role="status" className="admin-status">{message}</p> : null}{error ? <p role="alert" className="admin-notice">{error}</p> : null}
    {loading ? <p role="status">Loading services…</p> : services.length === 0 ? <section className="admin-empty"><h2>No services yet.</h2><p>Create a service to add it to the public site.</p></section> : <section className="admin-managed-list" aria-label="Existing services">{services.map((service) => <article className="admin-managed-card" key={service.id}><header><div><p className="eyebrow">/{service.slug}</p><h2>{service.title}</h2></div><span className={`admin-state ${service.isActive ? "is-active" : "is-inactive"}`}>{service.isActive ? "Active" : "Inactive"}</span></header><form className="admin-editor-form" onSubmit={(event) => update(event, service)}><TextField label="URL slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} defaultValue={service.slug} /><TextField label="Title" name="title" required maxLength={100} defaultValue={service.title} /><TextField label="Kicker" name="kicker" required maxLength={120} defaultValue={service.kicker} /><TextField label="Description" name="description" required maxLength={1000} multiline defaultValue={service.description} /><TextField label="Details" name="detail" required maxLength={2000} multiline defaultValue={service.detail} /><TextField label="Display order" name="sortOrder" type="number" min="0" max="1000" defaultValue={String(service.sortOrder)} /><div className="admin-form-actions"><button className="button button-dark" disabled={pending === service.id}>{pending === service.id ? "Saving…" : "Save changes"}</button><button className="button button-light" type="button" disabled={pending === service.id} onClick={() => setActive(service)}>{service.isActive ? "Deactivate" : "Activate"}</button></div></form></article>)}</section>}</div>;
}

type TextFieldProps = { label: string; name: string; multiline?: boolean; required?: boolean; pattern?: string; maxLength?: number; type?: string; min?: string | number; max?: string | number; placeholder?: string; defaultValue?: string };
function TextField({ label, name, multiline, ...props }: TextFieldProps) {
  const id = `service-${useId().replaceAll(":", "")}-${name}`;
  return <label className="admin-field" htmlFor={id}>{label}{multiline ? <textarea id={id} name={name} required={props.required} maxLength={props.maxLength} defaultValue={props.defaultValue} /> : <input id={id} name={name} required={props.required} pattern={props.pattern} maxLength={props.maxLength} type={props.type} min={props.min} max={props.max} placeholder={props.placeholder} defaultValue={props.defaultValue} />}</label>;
}
