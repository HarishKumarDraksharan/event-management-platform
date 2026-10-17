ALTER TABLE "Service"
ADD COLUMN "imageRef" VARCHAR(200);

CREATE TABLE "HomepageServicesSection" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'home',
    "eyebrow" VARCHAR(120) NOT NULL,
    "heading" VARCHAR(200) NOT NULL,
    "highlight" VARCHAR(120) NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "serviceIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomepageServicesSection_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HomepageServicesSection" ("id", "eyebrow", "heading", "highlight", "isVisible", "serviceIds")
SELECT
    'home',
    'What We Do',
    'Top Event Planning Services in Chennai',
    'Event Planning Services',
    true,
    COALESCE(array_agg("id" ORDER BY "sortOrder", "title"), ARRAY[]::UUID[])
FROM "Service"
WHERE "isActive" = true
ON CONFLICT ("id") DO NOTHING;
