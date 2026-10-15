"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";

const eventTypes = ["Wedding", "Corporate event", "Birthday", "Private celebration"];

export function EnquiryForm({ initialEventType = "" }: { initialEventType?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const submissionKey = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    submissionKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": submissionKey.current },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error("The enquiry could not be sent.");
      form.reset();
      submissionKey.current = null;
      setState("success");
      setMessage("Thank you. Your enquiry has been received.");
    } catch {
      setState("error");
      setMessage("We couldn’t send your enquiry just now. Please try again in a moment.");
    }
  }

  return (
    <form className="enquiry-form" onSubmit={submit}>
      <div className="form-grid">
        <label>Your name <span aria-hidden="true">*</span><input autoComplete="name" name="name" maxLength={100} required /></label>
        <label>Email address <span aria-hidden="true">*</span><input autoComplete="email" name="email" type="email" maxLength={254} required /></label>
        <label>Phone number <small>optional</small><input autoComplete="tel" name="phone" type="tel" maxLength={25} /></label>
        <label>What are you planning? <span aria-hidden="true">*</span>
          <select name="eventType" required defaultValue={eventTypes.includes(initialEventType) ? initialEventType : ""}><option value="" disabled>Select an event</option>{eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
        </label>
        <label>Event date <small>optional</small><input name="eventDate" type="date" /></label>
        <label>Approximate guest count <small>optional</small><input name="guestCount" type="number" min="1" max="10000" /></label>
        <label className="form-wide">A little about your plans <span aria-hidden="true">*</span><textarea name="message" rows={5} maxLength={3000} required /></label>
      </div>
      <button className="button button-dark" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send your enquiry"}<span aria-hidden="true">↗</span></button>
      <p className={`form-status ${state}`} role="status" aria-live="polite">{message}</p>
      <p className="form-note">Your details are used only to respond to this enquiry.</p>
    </form>
  );
}
