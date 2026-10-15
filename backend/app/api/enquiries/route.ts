import { prisma } from "../../../lib/prisma";
import { createEnquiryHandler } from "../../../lib/enquiries";

export const dynamic = "force-dynamic";

export const POST = createEnquiryHandler((submissionKey, enquiry) => prisma.enquiry.upsert({
  where: { submissionKey },
  update: {},
  create: { submissionKey, ...enquiry },
}));
