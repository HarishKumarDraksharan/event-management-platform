CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "HomepageTestimonialsSection" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'home',
    "eyebrow" VARCHAR(80) NOT NULL,
    "heading" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "testimonialIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomepageTestimonialsSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "text" VARCHAR(1000) NOT NULL,
    "eventType" VARCHAR(100),
    "eventDate" VARCHAR(40),
    "rating" SMALLINT,
    "label" VARCHAR(80),
    "imageRef" VARCHAR(200),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Testimonial_isPublished_sortOrder_idx"
ON "Testimonial" ("isPublished", "sortOrder");
