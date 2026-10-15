function isolatedTestDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL;
  if (!value) {
    throw new Error("TEST_DATABASE_URL is required; run backend tests with the isolated event_management_test database.");
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(new URL(value).pathname.slice(1));
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  if (databaseName !== "event_management_test") {
    throw new Error("Backend tests are restricted to the isolated event_management_test database.");
  }
  return value;
}

process.env.DATABASE_URL = isolatedTestDatabaseUrl();
