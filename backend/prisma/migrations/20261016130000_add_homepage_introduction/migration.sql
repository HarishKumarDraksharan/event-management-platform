CREATE TABLE "HomepageIntroduction" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'home',
    "eyebrow" VARCHAR(120) NOT NULL,
    "heading" VARCHAR(200) NOT NULL,
    "highlight" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomepageIntroduction_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HomepageIntroduction" ("id", "eyebrow", "heading", "highlight", "description") VALUES
('home', 'TSG EVENTS · EVENT PLANNING', 'Big days, little details,', 'all thoughtfully held.', 'Every gathering has its own rhythm. We help bring the people, place and many moving pieces together, so the experience feels considered from the first welcome to the last goodbye.');
