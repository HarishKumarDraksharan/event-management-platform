import { logApiDatabaseError } from "./api-error-logging";

export function logAboutUsApiError(operation: "public-read" | "admin-read" | "admin-write", error: unknown) {
  logApiDatabaseError("about-us", operation, error);
}
