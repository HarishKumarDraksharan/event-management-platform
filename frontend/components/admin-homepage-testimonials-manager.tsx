"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type Testimonial = {
  id: string;
  name: string;
  text: string;
  eventType: string | null;
  eventDate: string | null;
  rating: number | null;
  label: string | null;
  imageRef: string | null;
  isPublished: boolean;
  sortOrder: number;
};

type Section = {
  eyebrow: string;
  heading: string;
  description: string;
  isVisible: boolean;
};

type EditorData = {
  section: Section;
  testimonialIds: string[];
  testimonials: Testimonial[];
};

type TestimonialForm = {
  name: string;
  text: string;
  eventType: string;
  eventDate: string;
  rating: string;
  label: string;
  imageRef: string;
  isPublished: boolean;
  sortOrder: string;
};

const maximumSelectedTestimonials = 20;

const emptyForm: TestimonialForm = {
  name: "",
  text: "",
  eventType: "",
  eventDate: "",
  rating: "5",
  label: "",
  imageRef: "",
  isPublished: false,
  sortOrder: "0",
};

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return typeof body?.error === "string"
      ? body.error
      : "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

function formFromTestimonial(item: Testimonial): TestimonialForm {
  return {
    name: item.name,
    text: item.text,
    eventType: item.eventType ?? "",
    eventDate: item.eventDate ?? "",
    rating: item.rating == null ? "" : String(item.rating),
    label: item.label ?? "",
    imageRef: item.imageRef ?? "",
    isPublished: item.isPublished,
    sortOrder: String(item.sortOrder),
  };
}

function payloadFromForm(form: TestimonialForm) {
  return {
    name: form.name.trim(),
    text: form.text.trim(),
    eventType: form.eventType.trim() || null,
    eventDate: form.eventDate.trim() || null,
    rating: form.rating === "" ? null : Number(form.rating),
    label: form.label.trim() || null,
    imageRef: form.imageRef.trim() || null,
    isPublished: form.isPublished,
    sortOrder: Number(form.sortOrder),
  };
}

export function AdminHomepageTestimonialsManager() {
  const [data, setData] = useState<EditorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialForm>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  const loadData = useCallback(async () => {
    const response = await fetch("/api/admin/homepage-testimonials", {
      credentials: "same-origin",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await responseError(response));
    }

    const result = (await response.json()) as EditorData;
    setData(result);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/admin/homepage-testimonials", {
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await responseError(response));
        }

        const result = (await response.json()) as EditorData;
        if (!cancelled) setData(result);
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Homepage testimonials could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshData() {
    await loadData();
  }

  function updateSection(field: keyof Section, value: string | boolean) {
    setData((current) =>
      current
        ? {
            ...current,
            section: { ...current.section, [field]: value },
          }
        : current,
    );
  }

  function updateForm<K extends keyof TestimonialForm>(
    field: K,
    value: TestimonialForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
    setMessage("");
  }

  function startEdit(item: Testimonial) {
    setEditingId(item.id);
    setForm(formFromTestimonial(item));
    setFormOpen(true);
    setError("");
    setMessage("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  function toggleTestimonial(id: string, selected: boolean) {
    setData((current) => {
      if (!current) return current;

      if (selected && current.testimonialIds.length >= maximumSelectedTestimonials) {
        return current;
      }

      return {
        ...current,
        testimonialIds: selected
          ? [...current.testimonialIds, id]
          : current.testimonialIds.filter((itemId) => itemId !== id),
      };
    });
  }

  function moveTestimonial(index: number, direction: -1 | 1) {
    setData((current) => {
      if (!current) return current;

      const ids = [...current.testimonialIds];
      const target = index + direction;

      if (target < 0 || target >= ids.length) return current;

      [ids[index], ids[target]] = [ids[target], ids[index]];
      return { ...current, testimonialIds: ids };
    });
  }

  async function saveTestimonial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (form.text.trim().length < 20) {
      setError("Testimonial text must contain at least 20 characters.");
      return;
    }

    const rating = form.rating === "" ? null : Number(form.rating);
    const sortOrder = Number(form.sortOrder);

    if (
      (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) ||
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError("Choose a rating from 1–5 and a non-negative whole-number sort order.");
      return;
    }

    setRecordSaving(true);

    try {
      const response = await fetch("/api/admin/homepage-testimonials", {
        method: editingId ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          ...payloadFromForm(form),
        }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      await refreshData();
      setMessage(editingId ? "Testimonial updated." : "Testimonial created.");
      cancelEdit();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The testimonial could not be saved.",
      );
    } finally {
      setRecordSaving(false);
    }
  }

  async function togglePublished(item: Testimonial) {
    setError("");
    setMessage("");
    setRecordSaving(true);

    try {
      const response = await fetch("/api/admin/homepage-testimonials", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          ...payloadFromForm(formFromTestimonial(item)),
          isPublished: !item.isPublished,
        }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      await refreshData();
      setMessage(
        item.isPublished
          ? "Testimonial unpublished."
          : "Testimonial published.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The publication status could not be changed.",
      );
    } finally {
      setRecordSaving(false);
    }
  }

  async function deleteTestimonial(item: Testimonial) {
    const confirmed = window.confirm(
      `Delete the testimonial from "${item.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setRecordSaving(true);

    try {
      const response = await fetch("/api/admin/homepage-testimonials", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      await refreshData();

      if (editingId === item.id) cancelEdit();

      setMessage("Testimonial deleted.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The testimonial could not be deleted.",
      );
    } finally {
      setRecordSaving(false);
    }
  }

  async function saveSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/homepage-testimonials", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data.section,
          testimonialIds: data.testimonialIds,
        }),
      });

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      const result = (await response.json()) as {
        section: Section;
        testimonialIds: string[];
      };

      setData((current) =>
        current
          ? {
              ...current,
              section: result.section,
              testimonialIds: result.testimonialIds,
            }
          : current,
      );

      setMessage("Homepage testimonials section saved.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Homepage testimonials settings could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status">Loading homepage testimonials…</p>;

  if (!data) {
    return (
      <p className="admin-notice" role="alert">
        {error || "Homepage testimonials are unavailable."}
      </p>
    );
  }

  const selectedTestimonials = data.testimonialIds.flatMap((id) => {
    const item = data.testimonials.find((testimonial) => testimonial.id === id);
    return item ? [item] : [];
  });

  return (
    <section className="admin-form-card">
      <h2>Manage testimonials</h2>
      <p>Create customer testimonials, publish them, and select which ones appear on the homepage.</p>

      {message ? <p role="status" className="admin-status">{message}</p> : null}
      {error ? <p role="alert" className="admin-notice">{error}</p> : null}

      <div className="admin-form-actions">
        <button type="button" className="button button-dark" onClick={startCreate}>
          Add Testimonial
        </button>
      </div>

      {formOpen ? (
        <form className="admin-home-gallery-form" onSubmit={saveTestimonial}>
          <h3>{editingId ? "Edit testimonial" : "Create testimonial"}</h3>

          <label className="admin-field">
            Customer name
            <input
              value={form.name}
              minLength={2}
              maxLength={120}
              required
              onChange={(event) => updateForm("name", event.currentTarget.value)}
            />
          </label>

          <label className="admin-field">
            Testimonial
            <textarea
              value={form.text}
              minLength={20}
              maxLength={1000}
              required
              rows={5}
              onChange={(event) => updateForm("text", event.currentTarget.value)}
            />
          </label>

          <label className="admin-field">
            Event type
            <input
              value={form.eventType}
              maxLength={100}
              placeholder="Wedding, birthday, corporate event…"
              onChange={(event) => updateForm("eventType", event.currentTarget.value)}
            />
          </label>

          <label className="admin-field">
            Event date
            <input
              value={form.eventDate}
              maxLength={40}
              placeholder="e.g. December 2025"
              onChange={(event) => updateForm("eventDate", event.currentTarget.value)}
            />
          </label>

          <label className="admin-field">
            Rating
            <select
              value={form.rating}
              onChange={(event) => updateForm("rating", event.currentTarget.value)}
            >
              <option value="">No rating</option>
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating} value={String(rating)}>{rating} / 5</option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            Label
            <input
              value={form.label}
              maxLength={80}
              placeholder="e.g. Happy couple"
              onChange={(event) => updateForm("label", event.currentTarget.value)}
            />
          </label>

          <label className="admin-field">
            Image reference (optional)
            <input
              value={form.imageRef}
              maxLength={500}
              placeholder="/images/example.webp or an existing /api/uploads/... path"
              onChange={(event) => updateForm("imageRef", event.currentTarget.value)}
            />
          </label>

          <label className="admin-field">
            Sort order
            <input
              type="number"
              min={0}
              step={1}
              value={form.sortOrder}
              required
              onChange={(event) => updateForm("sortOrder", event.currentTarget.value)}
            />
          </label>

          <label className="admin-about-visibility">
            <span>Published (visible to site visitors when selected)</span>
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => updateForm("isPublished", event.currentTarget.checked)}
            />
          </label>

          <div className="admin-form-actions">
            <button type="submit" className="button button-dark" disabled={recordSaving}>
              {recordSaving ? "Saving…" : editingId ? "Save changes" : "Create testimonial"}
            </button>
            <button type="button" onClick={cancelEdit} disabled={recordSaving}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <h3>Existing testimonials ({data.testimonials.length})</h3>

      {data.testimonials.length === 0 ? (
        <p>No testimonials have been created yet. Select Add Testimonial to create the first one.</p>
      ) : (
        <div className="admin-home-gallery-options">
          {data.testimonials.map((item) => (
            <article className="admin-home-gallery-option" key={item.id}>
              {item.imageRef ? (
                <Image src={item.imageRef} alt="" width={72} height={56} unoptimized />
              ) : (
                <div className="admin-testimonial-avatar" aria-hidden="true">
                  {item.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <span className="admin-home-gallery-option-copy">
                <strong>{item.name}</strong>
                <small>{item.isPublished ? "Published" : "Unpublished"}</small>
                <small>{item.eventType || "General feedback"} · Rating: {item.rating ?? "None"}</small>
                <small>{item.text}</small>
              </span>

              <span className="admin-home-gallery-order-actions">
                <button type="button" disabled={recordSaving} onClick={() => startEdit(item)}>
                  Edit
                </button>
                <button type="button" disabled={recordSaving} onClick={() => void togglePublished(item)}>
                  {item.isPublished ? "Unpublish" : "Publish"}
                </button>
                <button type="button" disabled={recordSaving} onClick={() => void deleteTestimonial(item)}>
                  Delete
                </button>
              </span>
            </article>
          ))}
        </div>
      )}

      <hr />

      <h2>Edit homepage Testimonials section</h2>
      <p>Select published testimonials and arrange their homepage display order. Unpublished testimonials remain hidden from site visitors.</p>

      <form className="admin-home-gallery-form" onSubmit={saveSection}>
        <label className="admin-field">
          Section eyebrow
          <input
            value={data.section.eyebrow}
            maxLength={80}
            required
            onChange={(event) => updateSection("eyebrow", event.currentTarget.value)}
          />
        </label>

        <label className="admin-field">
          Section heading
          <input
            value={data.section.heading}
            maxLength={200}
            required
            onChange={(event) => updateSection("heading", event.currentTarget.value)}
          />
        </label>

        <label className="admin-field">
          Section description
          <textarea
            value={data.section.description}
            maxLength={500}
            required
            onChange={(event) => updateSection("description", event.currentTarget.value)}
          />
        </label>

        <label className="admin-about-visibility">
          <span>Show Testimonials section on the homepage</span>
          <input
            type="checkbox"
            checked={data.section.isVisible}
            onChange={(event) => updateSection("isVisible", event.currentTarget.checked)}
          />
        </label>

        <fieldset className="admin-home-gallery-selection">
          <legend>Published testimonials · {data.testimonialIds.length}/{maximumSelectedTestimonials} selected</legend>

          {data.testimonials.filter((item) => item.isPublished).length === 0 ? (
            <p>Publish at least one testimonial above to select it for the homepage.</p>
          ) : (
            <div className="admin-home-gallery-options">
              {data.testimonials.filter((item) => item.isPublished).map((item) => {
                const selected = data.testimonialIds.includes(item.id);
                const disabled = !selected && data.testimonialIds.length >= maximumSelectedTestimonials;

                return (
                  <label className="admin-home-gallery-option" key={item.id}>
                    <input
                      type="checkbox"
                      aria-label={`Show ${item.name} on homepage`}
                      checked={selected}
                      disabled={disabled}
                      onChange={(event) => toggleTestimonial(item.id, event.currentTarget.checked)}
                    />
                    {item.imageRef ? (
                      <Image src={item.imageRef} alt="" width={72} height={56} unoptimized />
                    ) : (
                      <div className="admin-testimonial-avatar" aria-hidden="true">
                        {item.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="admin-home-gallery-option-copy">
                      <strong>{item.name}</strong>
                      <small>{item.eventType || "General feedback"}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <fieldset className="admin-home-gallery-order">
          <legend>Homepage display order</legend>

          {selectedTestimonials.length ? (
            <ol>
              {selectedTestimonials.map((item, index) => (
                <li key={item.id}>
                  <span className="admin-home-gallery-order-entry">
                    {index + 1}. {item.name}
                    {!item.isPublished ? " (unpublished)" : ""}
                  </span>
                  <span className="admin-home-gallery-order-actions">
                    <button
                      type="button"
                      aria-label={`Move ${item.name} up`}
                      disabled={index === 0}
                      onClick={() => moveTestimonial(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${item.name} down`}
                      disabled={index === selectedTestimonials.length - 1}
                      onClick={() => moveTestimonial(index, 1)}
                    >
                      ↓
                    </button>
                    <button type="button" onClick={() => toggleTestimonial(item.id, false)}>
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p>Select one or more published testimonials to build the homepage section.</p>
          )}
        </fieldset>

        <div className="admin-form-actions">
          <button type="submit" className="button button-dark" disabled={saving}>
            {saving ? "Saving…" : "Save Testimonials section"}
          </button>
        </div>
      </form>
    </section>
  );
}
