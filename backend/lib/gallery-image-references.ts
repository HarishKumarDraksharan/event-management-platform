import { prisma } from "./prisma";
import { retryPendingGalleryImageCleanup, scheduleManagedGalleryImageCleanup } from "./gallery-image-storage";

const referenceLockKey = 1_370_421_651;

type GalleryImageReferenceTransaction = Pick<typeof prisma, "$executeRaw"> & {
  portfolioEntry: Pick<typeof prisma.portfolioEntry, "findFirst">;
  heroSlide: Pick<typeof prisma.heroSlide, "findFirst">;
  service: Pick<typeof prisma.service, "findFirst">;
  aboutUsSection: Pick<typeof prisma.aboutUsSection, "findFirst">;
};

export async function lockGalleryImageReferences(transaction: GalleryImageReferenceTransaction) {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${referenceLockKey})`;
}

export async function withGalleryImageReferenceLock(imageRef: string, removeFile: () => Promise<boolean>) {
  return prisma.$transaction(async (transaction) => {
    await lockGalleryImageReferences(transaction);
    const references = await Promise.all([
      transaction.portfolioEntry.findFirst({ where: { imageRef }, select: { id: true } }),
      transaction.heroSlide.findFirst({ where: { imageRef }, select: { id: true } }),
      transaction.service.findFirst({ where: { imageRef }, select: { id: true } }),
      transaction.aboutUsSection.findFirst({ where: { imageUrl: imageRef }, select: { id: true } }),
    ]);
    if (references.some(Boolean)) return false;
    return removeFile();
  });
}

export async function scheduleGalleryImageCleanup(imageRef: string) {
  await scheduleManagedGalleryImageCleanup(imageRef, withGalleryImageReferenceLock);
}

export async function retryGalleryImageCleanup() {
  await retryPendingGalleryImageCleanup(withGalleryImageReferenceLock);
}
