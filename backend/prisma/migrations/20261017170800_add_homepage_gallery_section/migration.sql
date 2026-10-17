CREATE TABLE "HomepageGallerySection" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'home',
    "eyebrow" VARCHAR(120) NOT NULL,
    "heading" VARCHAR(200) NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "entryIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomepageGallerySection_pkey" PRIMARY KEY ("id")
);
