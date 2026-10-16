import { prisma } from "../../../lib/prisma";
import { defaultAboutUs } from "../../../lib/about-us";
import { logAboutUsApiError } from "../../../lib/about-us-api-logging";

export async function GET() {
  try {
    const aboutUs = await prisma.aboutUsSection.findUnique({
      where: { id: "home" },
      select: {
        eyebrow: true,
        heading: true,
        firstParagraph: true,
        secondParagraph: true,
        imageUrl: true,
        imageCaption: true,
        buttonLabel: true,
        destinationUrl: true,
        isVisible: true,
      },
    });
    return Response.json({ aboutUs: aboutUs ?? defaultAboutUs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logAboutUsApiError("public-read", error);
    return Response.json({ error: "About Us content is temporarily unavailable." }, { status: 503 });
  }
}
