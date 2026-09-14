import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

function getDatabaseUrl(): string {
  if (process.env.VERCEL === "1") {
    const tmpDbPath = "/tmp/dev.db";
    try {
      if (!fs.existsSync(tmpDbPath)) {
        const projectDbPath = path.join(process.cwd(), "prisma", "dev.db");
        if (fs.existsSync(projectDbPath)) {
          fs.copyFileSync(projectDbPath, tmpDbPath);
          try {
            fs.chmodSync(tmpDbPath, 0o666);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error("Error setting up /tmp/dev.db:", e);
    }
    return `file:${tmpDbPath}`;
  }
  return process.env.DATABASE_URL || "file:./dev.db";
}

const dbUrl = getDatabaseUrl();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  walEnabled: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (!globalForPrisma.walEnabled && process.env.VERCEL !== "1") {
  globalForPrisma.walEnabled = true;
  prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL;").catch(() => {});
  prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL;").catch(() => {});
}
