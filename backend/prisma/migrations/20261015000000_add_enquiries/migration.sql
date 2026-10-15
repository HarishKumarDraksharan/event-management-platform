CREATE TABLE "Enquiry" (
    "id" UUID NOT NULL,
    "submissionKey" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(25),
    "eventType" VARCHAR(40) NOT NULL,
    "eventDate" DATE,
    "guestCount" INTEGER,
    "message" VARCHAR(3000) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Enquiry_submissionKey_key" ON "Enquiry"("submissionKey");
