CREATE TABLE "HeroSlide" (
    "id" UUID NOT NULL,
    "heading" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "buttonLabel" VARCHAR(80) NOT NULL,
    "destinationUrl" VARCHAR(300) NOT NULL,
    "imageRef" VARCHAR(200) NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HeroSlide_isPublished_sortOrder_idx" ON "HeroSlide"("isPublished", "sortOrder");

INSERT INTO "HeroSlide" ("id", "heading", "description", "buttonLabel", "destinationUrl", "imageRef", "isPublished", "sortOrder") VALUES
('80450c5f-87ec-4f72-97b3-62a74c443001', 'Make room for meaningful moments.', 'From the first idea to the final farewell, we bring the details together so you can be right where you belong.', 'Tell us what you are planning', '/contact', '/images/gathering-study.svg', true, 1),
('80450c5f-87ec-4f72-97b3-62a74c443002', 'Every gathering starts somewhere.', 'Thoughtful plans make space for the people and moments that matter to you.', 'Explore our services', '/#services', '/images/table-study.svg', true, 2),
('80450c5f-87ec-4f72-97b3-62a74c443003', 'Stories worth gathering for.', 'Discover a collection of illustrative studies for celebrations and shared moments.', 'Explore the gallery', '/portfolio', '/images/colour-study.svg', true, 3);
