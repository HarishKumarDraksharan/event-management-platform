"use client";

import { FormEvent, useEffect, useState } from "react";
import type { PublicHomepageFeature, PublicHomepageWhyChooseUs } from "../lib/public-content";

const iconOptions = [
  ["users", "Friendly team"],
  ["award", "Excellence"],
  ["mapPin", "Venues"],
  ["headphones", "Support"],
  ["sparkles", "Experiences"],
  ["clipboard", "Management"],
  ["lightbulb", "Creative ideas"],
  ["heart", "Personalized events"],
] as const;

type EditorData = PublicHomepageWhyChooseUs;

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body && typeof body.error === "string" ? body.error : "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

export function AdminHomepageWhyChooseUsManager() {
  const [data, setData] = useState<EditorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/homepage-why-choose-us", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        const result: { section: EditorData } = await response.json();
        setData(result.section);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Homepage content could not be loaded."))
      .finally(() => setLoading(false));
  }, []);

  function updateSection(field: "heading" | "supportingText" | "isVisible", value: string | boolean) {
    setData((current) => current ? { ...current, [field]: value } : current);
  }

  function updateFeature(index: number, updates: Partial<PublicHomepageFeature>) {
    setData((current) => current ? {
      ...current,
      featureCards: current.featureCards.map((feature, position) => position === index ? { ...feature, ...updates } : feature),
    } : current);
  }

  function moveFeature(index: number, direction: -1 | 1) {
    setData((current) => {
      if (!current) return current;
      const featureCards = [...current.featureCards];
      const target = index + direction;
      if (target < 0 || target >= featureCards.length) return current;
      [featureCards[index], featureCards[target]] = [featureCards[target], featureCards[index]];
      return { ...current, featureCards };
    });
  }

  function addFeature() {
    if (!data || data.featureCards.length >= 12) return;
    const feature = { id: crypto.randomUUID(), title: "", description: "", icon: "sparkles" };
    setData((current) => current ? { ...current, featureCards: [...current.featureCards, feature] } : current);
    setExpandedFeatures((expanded) => [...expanded, feature.id]);
  }

  function removeFeature(index: number) {
    if (!data || data.featureCards.length <= 1) return;
    const removedId = data.featureCards[index]?.id;
    if (removedId) setExpandedFeatures((expanded) => expanded.filter((id) => id !== removedId));
    setData((current) => current ? {
      ...current,
      featureCards: current.featureCards.filter((_, position) => position !== index),
    } : current);
  }

  function toggleFeature(id: string) {
    setExpandedFeatures((expanded) => expanded.includes(id)
      ? expanded.filter((featureId) => featureId !== id)
      : [...expanded, id]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/homepage-why-choose-us", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const result: { section: EditorData } = await response.json();
      setData(result.section);
      setMessage("Why Choose Us section saved.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Homepage content could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading Why Choose Us section…</p>;
  if (!data) return <p className="admin-notice" role="alert">{error || "Homepage content is unavailable."}</p>;

  return <section className="admin-form-card">
    <h2>Edit homepage Why Choose Us section</h2>
    <p>Update the section message and arrange up to twelve feature cards. Changes appear on the public homepage after saving.</p>
    {message ? <p role="status" className="admin-status">{message}</p> : null}
    {error ? <p role="alert" className="admin-notice">{error}</p> : null}
    <form className="admin-home-why-form" onSubmit={save}>
      <label className="admin-field">Section heading<input value={data.heading} maxLength={200} required onChange={(event) => updateSection("heading", event.currentTarget.value)} /></label>
      <label className="admin-field">Supporting text<textarea value={data.supportingText} maxLength={500} required rows={3} onChange={(event) => updateSection("supportingText", event.currentTarget.value)} /></label>
      <label className="admin-about-visibility"><span>Show Why Choose Us section on the homepage</span><input type="checkbox" checked={data.isVisible} onChange={(event) => updateSection("isVisible", event.currentTarget.checked)} /></label>
      <fieldset className="admin-home-why-cards">
        <legend>Feature cards ({data.featureCards.length}/12)</legend>
        {data.featureCards.map((feature, index) => {
          const expanded = expandedFeatures.includes(feature.id);
          const editorId = `admin-home-why-feature-${feature.id}`;
          const cardLabel = feature.title.trim() || `Feature ${index + 1}`;
          return <article className={`admin-home-why-card${expanded ? " is-expanded" : ""}`} key={feature.id}>
            <div className="admin-home-why-card-header">
              <button
                className="admin-home-why-card-toggle"
                type="button"
                aria-expanded={expanded}
                aria-controls={editorId}
                onClick={() => toggleFeature(feature.id)}
              >
                <span className="admin-home-why-card-summary">
                  <span className="admin-home-why-card-number">FEATURE {String(index + 1).padStart(2, "0")}</span>
                  <span className="admin-home-why-card-title">{cardLabel}</span>
                  <span className="admin-home-why-card-preview">{feature.description || "Add a short feature description."}</span>
                </span>
                <span className="admin-home-why-chevron" aria-hidden="true" />
              </button>
              <div className="admin-home-why-card-actions">
                <button type="button" aria-label={`Move ${cardLabel} up`} disabled={index === 0} onClick={() => moveFeature(index, -1)}>Move up</button>
                <button type="button" aria-label={`Move ${cardLabel} down`} disabled={index === data.featureCards.length - 1} onClick={() => moveFeature(index, 1)}>Move down</button>
                <button type="button" aria-label={`Remove ${cardLabel}`} disabled={data.featureCards.length === 1} onClick={() => removeFeature(index)}>Remove</button>
              </div>
            </div>
            <div className="admin-home-why-card-editor" id={editorId} hidden={!expanded}>
              <label className="admin-field">Title<input value={feature.title} maxLength={100} required={expanded} onChange={(event) => updateFeature(index, { title: event.currentTarget.value })} /></label>
              <label className="admin-field">Description<textarea value={feature.description} maxLength={300} required={expanded} rows={2} onChange={(event) => updateFeature(index, { description: event.currentTarget.value })} /></label>
              <label className="admin-field">Icon
                <select value={feature.icon} onChange={(event) => updateFeature(index, { icon: event.currentTarget.value })}>
                  {iconOptions.map(([icon, label]) => <option value={icon} key={icon}>{label}</option>)}
                </select>
              </label>
            </div>
          </article>;
        })}
      </fieldset>
      <div className="admin-form-actions admin-home-why-actions">
        <button className="button button-secondary" type="button" disabled={data.featureCards.length >= 12} onClick={addFeature}>Add feature</button>
        <button className="button button-dark" type="submit" disabled={saving}>{saving ? "Saving…" : "Save Why Choose Us section"}</button>
      </div>
    </form>
  </section>;
}
