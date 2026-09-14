const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const defaultAdminPermissions = {
  dashboard: { view: true, add: true, edit: true, delete: true },
  inquiries: { view: true, add: true, edit: true, delete: true },
  quotations: { view: true, add: true, edit: true, delete: true },
  jobs: { view: true, add: true, edit: true, delete: true },
  dailyStatus: { view: true, add: true, edit: true, delete: true },
  finance: { view: true, add: true, edit: true, delete: true },
  hr: { view: true, add: true, edit: true, delete: true },
  reports: { view: true, add: true, edit: true, delete: true },
  masters: { view: true, add: true, edit: true, delete: true },
  users: { view: true, add: true, edit: true, delete: true },
};

async function main() {
  console.log("=========================================");
  console.log("  TOTAL FLUSH OF ALL CRM DATA & MASTERS  ");
  console.log("=========================================");

  // 1. Delete all transactional / operational data in proper dependency order
  console.log("1. Deleting Status Logs...");
  await prisma.statusLog.deleteMany({});

  console.log("2. Deleting Job Remarks...");
  await prisma.remark.deleteMany({});

  console.log("3. Deleting Finance & Invoice records...");
  await prisma.finance.deleteMany({});

  console.log("4. Deleting Jobs & Shipments...");
  await prisma.job.deleteMany({});

  console.log("5. Deleting Inquiries...");
  await prisma.inquiry.deleteMany({});

  console.log("6. Deleting Quotations...");
  try {
    await prisma.quotationItem.deleteMany({});
  } catch (e) {}
  await prisma.quotation.deleteMany({});

  console.log("7. Deleting Attendance & Payroll records...");
  await prisma.attendance.deleteMany({});
  await prisma.payroll.deleteMany({});
  await prisma.employeeProfile.deleteMany({});
  await prisma.employee.deleteMany({});

  // 2. Delete all Master Data entities
  console.log("8. Deleting Customers Master...");
  await prisma.customer.deleteMany({});

  console.log("9. Deleting Ports Master...");
  await prisma.port.deleteMany({});

  console.log("10. Deleting Shipping Lines (Liners) Master...");
  await prisma.liner.deleteMany({});

  console.log("11. Deleting CHAs Master...");
  await prisma.cHA.deleteMany({});

  console.log("12. Deleting Airlines Master...");
  await prisma.airline.deleteMany({});

  console.log("13. Deleting Transporters Master...");
  await prisma.transporter.deleteMany({});

  console.log("14. Deleting Overseas Agents Master...");
  await prisma.overseasAgent.deleteMany({});

  // 3. Clean Users: Delete all non-admin users
  console.log("15. Cleaning Users table (keeping only Admin)...");
  await prisma.user.deleteMany({
    where: {
      NOT: {
        email: {
          in: ["admin@svil.com", "admin@svil.in"],
        },
      },
    },
  });

  // 4. Upsert clean Master Admin user
  console.log("16. Setting up Master Admin account...");
  const hashedPassword = await bcrypt.hash("admin@svil2026", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@svil.com" },
    update: {
      name: "Administrator",
      role: "ADMIN",
      password: hashedPassword,
      permissions: JSON.stringify(defaultAdminPermissions),
      status: "ACTIVE",
    },
    create: {
      email: "admin@svil.com",
      name: "Administrator",
      role: "ADMIN",
      password: hashedPassword,
      permissions: JSON.stringify(defaultAdminPermissions),
      status: "ACTIVE",
    },
  });

  console.log("=========================================");
  console.log("  TOTAL DATABASE & MASTERS FLUSH COMPLETE ");
  console.log("=========================================");
  console.log("Active Admin User:", admin.email);
  console.log("Role:", admin.role);
  console.log("Ready for 100% clean production start.");
}

main()
  .catch((e) => {
    console.error("Flush error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
