export const eventTypes = ["Wedding", "Corporate event", "Birthday", "Private celebration"] as const;

export type EnquiryInput = {
  name: string;
  email: string;
  phone: string | null;
  eventType: (typeof eventTypes)[number];
  eventDate: Date | null;
  guestCount: number | null;
  message: string;
};

export type EnquiryCreate = (submissionKey: string, input: EnquiryInput) => Promise<unknown>;

type ValidationResult = { ok: true; value: EnquiryInput } | { ok: false; message: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEnquiry(value: unknown): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, message: "Enter your enquiry details." };
  const input = value as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const eventType = input.eventType;
  const rawDate = typeof input.eventDate === "string" ? input.eventDate.trim() : "";
  const rawGuests = typeof input.guestCount === "string" ? input.guestCount.trim() : input.guestCount;
  const message = typeof input.message === "string" ? input.message.trim() : "";

  if (name.length < 2 || name.length > 100) return { ok: false, message: "Enter a name between 2 and 100 characters." };
  if (email.length > 254 || !emailPattern.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (phone && (!/^[+()\- .\d]{7,25}$/.test(phone) || phone.replace(/\D/g, "").length < 7)) return { ok: false, message: "Enter a valid phone number or leave it blank." };
  if (typeof eventType !== "string" || !eventTypes.includes(eventType as (typeof eventTypes)[number])) return { ok: false, message: "Choose one of the listed event types." };
  let eventDate: Date | null = null;
  if (rawDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return { ok: false, message: "Enter a valid event date." };
    eventDate = new Date(`${rawDate}T00:00:00.000Z`);
    if (Number.isNaN(eventDate.getTime()) || eventDate.toISOString().slice(0, 10) !== rawDate) return { ok: false, message: "Enter a valid event date." };
  }
  let guestCount: number | null = null;
  if (rawGuests !== undefined && rawGuests !== null && rawGuests !== "") {
    const parsed = typeof rawGuests === "number" ? rawGuests : Number(rawGuests);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10000) return { ok: false, message: "Guest count must be a whole number from 1 to 10,000." };
    guestCount = parsed;
  }
  if (message.length < 10 || message.length > 3000) return { ok: false, message: "Tell us a little more in 10 to 3,000 characters." };
  return { ok: true, value: { name, email, phone: phone || null, eventType: eventType as EnquiryInput["eventType"], eventDate, guestCount, message } };
}

export function createEnquiryHandler(createEnquiry: EnquiryCreate) {
  return async function POST(request: Request) {
    const key = request.headers.get("Idempotency-Key") ?? "";
    if (!uuidPattern.test(key)) return Response.json({ error: "A valid submission key is required." }, { status: 400 });
    const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
    if (declaredLength > 10_000) return Response.json({ error: "The enquiry is too large." }, { status: 413 });

    let body: unknown;
    try {
      const text = await request.text();
      if (text.length > 10_000) return Response.json({ error: "The enquiry is too large." }, { status: 413 });
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: "Enter your enquiry details." }, { status: 400 });
    }
    const result = validateEnquiry(body);
    if (!result.ok) return Response.json({ error: result.message }, { status: 400 });

    try {
      await createEnquiry(key, result.value);
      return Response.json({ status: "received" }, { status: 201 });
    } catch {
      return Response.json({ error: "We could not save your enquiry right now. Please try again." }, { status: 503 });
    }
  };
}
