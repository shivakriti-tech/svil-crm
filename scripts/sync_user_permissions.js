const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const FULL_PERM = { view: true, add: true, edit: true, delete: true };
const READ_ONLY = { view: true, add: false, edit: false, delete: false };
const OPERATIONAL = { view: true, add: true, edit: true, delete: false };
const NO_PERM = { view: false, add: false, edit: false, delete: false };

// Standard permissions preset by role
const ROLE_PERMS = {
  ADMIN: {
    dashboard: FULL_PERM,
    inquiries: FULL_PERM,
    quotations: FULL_PERM,
    jobs: FULL_PERM,
    dailyStatus: FULL_PERM,
    finance: FULL_PERM,
    hr: FULL_PERM,
    reports: FULL_PERM,
    masters: FULL_PERM,
    users: FULL_PERM,
  },
  OPERATIONS: {
    dashboard: FULL_PERM,
    inquiries: FULL_PERM,
    quotations: FULL_PERM,
    jobs: FULL_PERM,
    dailyStatus: FULL_PERM,
    finance: OPERATIONAL,
    hr: READ_ONLY,
    reports: FULL_PERM,
    masters: FULL_PERM,
    users: NO_PERM,
  },
  SALES: {
    dashboard: FULL_PERM,
    inquiries: FULL_PERM,
    quotations: FULL_PERM,
    jobs: FULL_PERM,
    dailyStatus: FULL_PERM,
    finance: READ_ONLY,
    hr: READ_ONLY,
    reports: FULL_PERM,
    masters: OPERATIONAL,
    users: NO_PERM,
  },
  FINANCE: {
    dashboard: FULL_PERM,
    inquiries: FULL_PERM,
    quotations: FULL_PERM,
    jobs: FULL_PERM,
    dailyStatus: FULL_PERM,
    finance: FULL_PERM,
    hr: FULL_PERM,
    reports: FULL_PERM,
    masters: FULL_PERM,
    users: NO_PERM,
  },
  QUOTATION: {
    dashboard: FULL_PERM,
    inquiries: FULL_PERM,
    quotations: FULL_PERM,
    jobs: FULL_PERM,
    dailyStatus: FULL_PERM,
    finance: READ_ONLY,
    hr: READ_ONLY,
    reports: FULL_PERM,
    masters: FULL_PERM,
    users: NO_PERM,
  }
};

async function fixUserPermissions() {
  const users = await prisma.user.findMany();
  console.log("Updating permissions for users in DB...");
  for (const u of users) {
    const roleKey = (u.role || "SALES").toUpperCase();
    const permObj = ROLE_PERMS[roleKey] || ROLE_PERMS.SALES;
    await prisma.user.update({
      where: { id: u.id },
      data: {
        permissions: JSON.stringify(permObj)
      }
    });
    console.log(`✓ Updated permissions for ${u.name} (${u.email}) [Role: ${u.role}]`);
  }
}

fixUserPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
