CREATE TABLE "HomepageWhyChooseUsSection" (
    "id" VARCHAR(20) NOT NULL DEFAULT 'home',
    "heading" VARCHAR(200) NOT NULL,
    "supportingText" VARCHAR(500) NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "featureCards" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomepageWhyChooseUsSection_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HomepageWhyChooseUsSection" ("id", "heading", "supportingText", "isVisible", "featureCards")
VALUES (
    'home',
    'Why Choose Chennai Events Management Company?',
    'Thoughtful planning, trusted people and a steady hand make every celebration feel effortless.',
    true,
    '[
      {"id":"friendly-team","title":"Friendly Team","description":"We make every client feel welcome.","icon":"users"},
      {"id":"committed-to-excellence","title":"Committed to Excellence","description":"We deliver on our promises.","icon":"award"},
      {"id":"perfect-venues","title":"Perfect Venues","description":"The right setting for every occasion.","icon":"mapPin"},
      {"id":"dedicated-support","title":"Dedicated Support","description":"We''re here when you need us.","icon":"headphones"},
      {"id":"unforgettable-experiences","title":"Unforgettable Experiences","description":"Creating memories that last.","icon":"sparkles"},
      {"id":"expert-management","title":"Expert Management","description":"Professional planning and coordination.","icon":"clipboard"},
      {"id":"creative-ideas","title":"Creative Ideas","description":"Fresh ideas for extraordinary events.","icon":"lightbulb"},
      {"id":"personalized-events","title":"Personalized Events","description":"Every celebration is uniquely yours.","icon":"heart"}
    ]'::jsonb
)
ON CONFLICT ("id") DO NOTHING;
