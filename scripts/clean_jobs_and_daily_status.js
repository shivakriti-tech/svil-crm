const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("  CLEANING JOBS & SHIPMENTS AND DAILY STATUS DATA ");
  console.log("==================================================");

  // 1. Delete Status Logs (Daily Status history)
  console.log("1. Deleting Status Logs...");
  const slCount = await prisma.statusLog.deleteMany({});
  console.log(`   ✓ Deleted ${slCount.count} Status Logs.`);

  // 2. Delete Job Remarks
  console.log("2. Deleting Job Remarks...");
  const remCount = await prisma.remark.deleteMany({});
  console.log(`   ✓ Deleted ${remCount.count} Remarks.`);

  // 3. Delete Finance records
  console.log("3. Deleting Finance / Invoicing records...");
  const finCount = await prisma.finance.deleteMany({});
  console.log(`   ✓ Deleted ${finCount.count} Finance records.`);

  // 4. Delete Jobs & Shipments
  console.log("4. Deleting Jobs & Shipments...");
  const jobCount = await prisma.job.deleteMany({});
  console.log(`   ✓ Deleted ${jobCount.count} Jobs / Shipments.`);

  console.log("==================================================");
  console.log("  JOBS & SHIPMENTS AND DAILY STATUS ARE NOW CLEAN! ");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Clean error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
