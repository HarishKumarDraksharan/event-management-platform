"use client";

import { FormEvent, useEffect, useState } from "react";

type Service = { id: string; slug: string; title: string; isActive: boolean; sortOrder: number };
type Section = { eyebrow: string; heading: string; highlight: string; isVisible: boolean };
type EditorData = { section: Section; serviceIds: string[]; services: Service[] };

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body && typeof body.error === "string" ? body.error : "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

export function AdminHomepageServicesManager() {
  const [data, setData] = useState<EditorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/homepage-services", { credentials: "same-origin", cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error(await responseError(response));
      setData(await response.json());
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Homepage services could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  function updateSection(field: keyof Section, value: string | boolean) {
    setData((current) => current ? { ...current, section: { ...current.section, [field]: value } } : current);
  }

  function toggleService(id: string, selected: boolean) {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        serviceIds: selected
          ? [...current.serviceIds, id]
          : current.serviceIds.filter((serviceId) => serviceId !== id),
      };
    });
  }

  function moveService(index: number, direction: -1 | 1) {
    setData((current) => {
      if (!current) return current;
      const serviceIds = [...current.serviceIds];
      const target = index + direction;
      if (target < 0 || target >= serviceIds.length) return current;
      [serviceIds[index], serviceIds[target]] = [serviceIds[target], serviceIds[index]];
      return { ...current, serviceIds };
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/homepage-services", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.section, serviceIds: data.serviceIds }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const saved = await response.json();
      setData((current) => current ? { ...current, section: saved.section, serviceIds: saved.serviceIds } : current);
      setMessage("Homepage services section saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Homepage services could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading homepage services…</p>;
  if (!data) return <p className="admin-notice" role="alert">{error || "Homepage services are unavailable."}</p>;

  const selectedServices = data.serviceIds.flatMap((id) => {
    const service = data.services.find((item) => item.id === id);
    return service ? [service] : [];
  });

  return <section className="admin-form-card">
    <h2>Edit homepage Services section</h2>
    <p>Choose existing services, then adjust their display order. Service titles and images remain managed in Services.</p>
    {message ? <p role="status" className="admin-status">{message}</p> : null}
    {error ? <p role="alert" className="admin-notice">{error}</p> : null}
    <form className="admin-homepage-services-form" onSubmit={save}>
      <label className="admin-field">Section eyebrow<input value={data.section.eyebrow} maxLength={120} required onChange={(event) => updateSection("eyebrow", event.currentTarget.value)} /></label>
      <label className="admin-field">Section heading<input value={data.section.heading} maxLength={200} required onChange={(event) => updateSection("heading", event.currentTarget.value)} /></label>
      <label className="admin-field">Heading accent text<input value={data.section.highlight} maxLength={120} onChange={(event) => updateSection("highlight", event.currentTarget.value)} /></label>
      <label className="admin-about-visibility"><span>Show Services section on the homepage</span><input type="checkbox" checked={data.section.isVisible} onChange={(event) => updateSection("isVisible", event.currentTarget.checked)} /></label>
      <fieldset className="admin-homepage-services-selection">
        <legend>Choose services</legend>
        {data.services.length ? data.services.map((service) => <label className="admin-homepage-service-option" key={service.id}>
          <input type="checkbox" aria-label={`Select ${service.title}`} checked={data.serviceIds.includes(service.id)} onChange={(event) => toggleService(service.id, event.currentTarget.checked)} />
          <span>{service.title}</span><span className={`admin-state ${service.isActive ? "is-active" : "is-inactive"}`}>{service.isActive ? "Active" : "Inactive"}</span>
        </label>) : <p>No services have been created yet. Add services in Services management before selecting them here.</p>}
      </fieldset>
      <fieldset className="admin-homepage-services-order">
        <legend>Carousel display order</legend>
        {selectedServices.length ? <ol>{selectedServices.map((service, index) => <li key={service.id}>
          <span>{index + 1}. {service.title}{service.isActive ? "" : " (inactive)"}</span>
          <span className="admin-homepage-service-order-actions">
            <button type="button" aria-label={`Move ${service.title} up`} disabled={index === 0} onClick={() => moveService(index, -1)}>↑</button>
            <button type="button" aria-label={`Move ${service.title} down`} disabled={index === selectedServices.length - 1} onClick={() => moveService(index, 1)}>↓</button>
          </span>
        </li>)}</ol> : <p>Select one or more services to set their order.</p>}
      </fieldset>
      <div className="admin-form-actions"><button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Services section"}</button></div>
    </form>
  </section>;
}
