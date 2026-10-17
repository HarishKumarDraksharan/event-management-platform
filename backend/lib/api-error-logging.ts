function safeErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return { errorName: "UnknownError" };
  const record = error as { name?: unknown; code?: unknown };
  const errorName = typeof record.name === "string" && /^[A-Za-z0-9_$]{1,80}$/.test(record.name) ? record.name : "UnknownError";
  const errorCode = typeof record.code === "string" && /^[A-Z0-9_]{1,32}$/.test(record.code) ? record.code : undefined;
  return errorCode ? { errorName, errorCode } : { errorName };
}

export function logApiDatabaseError(area: string, operation: string, error: unknown) {
  console.error(`[${area}] database operation failed`, { operation, ...safeErrorDetails(error) });
}
