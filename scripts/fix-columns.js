const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixColumns() {
  console.log("Checking User table columns...");

  try {
    await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN permissions TEXT;");
    console.log("Added permissions column to User");
  } catch (e) {
    console.log("permissions column status:", e.message);
  }

  try {
    await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN status TEXT DEFAULT 'ACTIVE';");
    console.log("Added status column to User");
  } catch (e) {
    console.log("status column status:", e.message);
  }

  try {
    await prisma.$executeRawUnsafe("ALTER TABLE User ADD COLUMN lastLogin DATETIME;");
    console.log("Added lastLogin column to User");
  } catch (e) {
    console.log("lastLogin column status:", e.message);
  }

  console.log("Column verification complete!");
}

fixColumns()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
