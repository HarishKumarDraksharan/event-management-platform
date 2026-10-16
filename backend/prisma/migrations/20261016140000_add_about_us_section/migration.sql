CREATE TABLE "AboutUsSection" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'home',
    "eyebrow" VARCHAR(120) NOT NULL,
    "heading" VARCHAR(200) NOT NULL,
    "firstParagraph" VARCHAR(2000) NOT NULL,
    "secondParagraph" VARCHAR(2000) NOT NULL,
    "imageUrl" VARCHAR(1000) NOT NULL,
    "imageCaption" VARCHAR(200) NOT NULL,
    "buttonLabel" VARCHAR(80) NOT NULL,
    "destinationUrl" VARCHAR(300) NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AboutUsSection_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AboutUsSection" (
    "id",
    "eyebrow",
    "heading",
    "firstParagraph",
    "secondParagraph",
    "imageUrl",
    "imageCaption",
    "buttonLabel",
    "destinationUrl",
    "isVisible"
) VALUES (
    'home',
    'Our story',
    'Best Event Management Company In Chennai, Tamil Nadu',
    'TSG EVENTS brings thoughtful event management to Chennai, Tamil Nadu, turning important occasions into welcoming, memorable experiences. We plan corporate events, weddings, receptions, birthdays and baby showers with care for the people, purpose and details behind every gathering.',
    'From stage setup and lighting to catering and event logistics, our team coordinates each moving part so you can spend less time managing arrangements and more time being present for the celebration.',
    '/images/gathering-study.svg',
    'The Powerhouse of Events Management',
    'More About Us',
    '/about',
    true
)
ON CONFLICT ("id") DO NOTHING;
