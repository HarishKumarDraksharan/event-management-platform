import { describe, expect, it, vi } from "vitest";
import { createHealthHandler } from "../lib/health";

describe("GET /api/health", () => {
  it("returns healthy only after the database probe succeeds", async () => {
    const databaseProbe = vi.fn().mockResolvedValue([{ result: 1 }]);
    const response = await createHealthHandler(databaseProbe)();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "connected" });
    expect(databaseProbe).toHaveBeenCalledOnce();
  });

  it("returns a sanitized 503 response when the database probe fails", async () => {
    const databaseProbe = vi.fn().mockRejectedValue(new Error("private connection detail"));
    const response = await createHealthHandler(databaseProbe)();

    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ status: "unavailable", database: "disconnected" });
    expect(body).not.toContain("private connection detail");
  });
});
