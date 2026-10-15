import { createHealthHandler } from "../../../lib/health";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

export const GET = createHealthHandler(() => prisma.$queryRaw`SELECT 1`);
