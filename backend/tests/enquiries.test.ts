import { describe, expect, it, vi } from "vitest";
import { createEnquiryHandler, validateEnquiry } from "../lib/enquiries";

const validInput = {
  name: "Asha Kumar",
  email: "asha@example.org",
  phone: "+91 98765 43210",
  eventType: "Wedding",
  eventDate: "2027-02-14",
  guestCount: "120",
  message: "We are planning a family wedding and would love to discuss thoughtful coordination.",
};
const key = "cbab649a-425b-4962-835c-d5142b000052";
const request = (body: unknown, idempotencyKey = key) => new Request("http://localhost/api/enquiries", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
  body: JSON.stringify(body),
});

describe("enquiry validation", () => {
  it("normalizes and accepts a valid enquiry", () => {
    const result = validateEnquiry({ ...validInput, name: "  Asha Kumar  ", email: " ASHA@EXAMPLE.ORG " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatchObject({ name: "Asha Kumar", email: "asha@example.org", guestCount: 120, eventType: "Wedding" });
  });

  it.each([
    [{ ...validInput, email: "bad-address" }, "email"],
    [{ ...validInput, eventType: "Unknown" }, "event types"],
    [{ ...validInput, eventDate: "2027-02-30" }, "event date"],
    [{ ...validInput, guestCount: "10001" }, "Guest count"],
    [{ ...validInput, message: "short" }, "10 to 3,000"],
  ])("rejects malformed enquiry fields", (value, expected) => {
    const result = validateEnquiry(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(expected);
  });
});

describe("POST /api/enquiries", () => {
  it("validates and stores an enquiry, returning only a safe receipt", async () => {
    const create = vi.fn().mockResolvedValue({ id: "internal-id" });
    const response = await createEnquiryHandler(create)(request(validInput));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ status: "received" });
    expect(create).toHaveBeenCalledOnce();
    expect(create).toHaveBeenCalledWith(key, expect.objectContaining({ name: "Asha Kumar", guestCount: 120 }));
  });

  it("rejects invalid input without calling storage", async () => {
    const create = vi.fn();
    const response = await createEnquiryHandler(create)(request({ ...validInput, email: "not-an-email" }));
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("requires an idempotency key and sanitizes storage failures", async () => {
    const create = vi.fn().mockRejectedValue(new Error("private database connection detail"));
    const handler = createEnquiryHandler(create);
    const missingKey = await handler(request(validInput, ""));
    expect(missingKey.status).toBe(400);
    const failure = await handler(request(validInput));
    expect(failure.status).toBe(503);
    expect(await failure.text()).not.toContain("private database connection detail");
  });
});
