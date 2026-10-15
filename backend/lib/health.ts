export type DatabaseProbe = () => Promise<unknown>;

export function createHealthHandler(databaseProbe: DatabaseProbe) {
  return async function GET() {
    try {
      await databaseProbe();
      return Response.json({ status: "ok", database: "connected" });
    } catch {
      return Response.json(
        { status: "unavailable", database: "disconnected" },
        { status: 503 },
      );
    }
  };
}
