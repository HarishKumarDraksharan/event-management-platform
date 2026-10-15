CREATE TABLE "Service" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "kicker" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "detail" VARCHAR(2000) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

CREATE TABLE "PortfolioEntry" (
    "id" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "imageRef" VARCHAR(200) NOT NULL,
    "altText" VARCHAR(300) NOT NULL,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioEntry_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Service" ("id", "slug", "title", "kicker", "description", "detail", "sortOrder") VALUES
('50450c5f-87ec-4f72-97b3-62a74c443001', 'weddings', 'Weddings', 'A DAY THAT FEELS LIKE YOU', 'From the first shared idea to the final farewell, we can help shape a wedding celebration around what matters most to you.', 'Planning support can include finding a direction, coordinating the details, and keeping the day moving with care. The right scope starts with your plans, priorities and place.', 1),
('50450c5f-87ec-4f72-97b3-62a74c443002', 'corporate-events', 'Corporate events', 'GATHER WITH PURPOSE', 'Bring people together around an idea, a milestone or simply the value of being in the same room.', 'From company gatherings to team celebrations, we can help coordinate a clear, considered experience. Share what the event needs to do, and we can begin there.', 2),
('50450c5f-87ec-4f72-97b3-62a74c443003', 'birthdays', 'Birthdays', 'MAKE THEIR DAY THEIR OWN', 'A birthday can be grand or easy-going, a surprise or a long-awaited reunion. Let the person being celebrated set the tone.', 'We can help bring the setting, schedule and personal touches into one thoughtful plan, shaped around the guest of honour and the people they love.', 3),
('50450c5f-87ec-4f72-97b3-62a74c443004', 'private-celebrations', 'Private celebrations', 'FOR THE MOMENTS THAT BRING YOU TOGETHER', 'Mark a milestone, welcome a new chapter or gather your favourite people just because.', 'Every private celebration has its own shape. Tell us about the occasion, the people and the feeling you have in mind, and we can explore a plan together.', 4);

INSERT INTO "PortfolioEntry" ("id", "title", "description", "imageRef", "altText", "isSample", "isPublished", "sortOrder") VALUES
('70450c5f-87ec-4f72-97b3-62a74c443001', 'A gathering study', 'Original sample illustration of a candlelit celebration table.', '/images/gathering-study.svg', 'Sample illustration of a candlelit celebration table', true, true, 1),
('70450c5f-87ec-4f72-97b3-62a74c443002', 'Details in place', 'Original sample illustration of an event table with seasonal flowers.', '/images/table-study.svg', 'Sample illustration of an event table with seasonal flowers', true, true, 2),
('70450c5f-87ec-4f72-97b3-62a74c443003', 'A colour story', 'Original abstract sample illustration of event colours and shapes.', '/images/colour-study.svg', 'Sample abstract illustration of event colours and shapes', true, true, 3);
