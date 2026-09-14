const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const fullPerm = () => ({ view: true, add: true, edit: true, delete: true });
const readOnlyPerm = () => ({ view: true, add: false, edit: false, delete: false });
const operationalPerm = () => ({ view: true, add: true, edit: true, delete: false });
const emptyPerm = () => ({ view: false, add: false, edit: false, delete: false });

const ROLE_PRESETS = {
  ADMIN: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: fullPerm(),
    hr: fullPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: fullPerm(),
  },
  MANAGER: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: fullPerm(),
    hr: fullPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: operationalPerm(),
  },
  SALES: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: readOnlyPerm(),
    hr: emptyPerm(),
    reports: fullPerm(),
    masters: operationalPerm(),
    users: emptyPerm(),
  },
  FINANCE: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: fullPerm(),
    hr: fullPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: emptyPerm(),
  },
  OPERATIONS: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: operationalPerm(),
    hr: emptyPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: emptyPerm(),
  },
  QUOTATION: {
    dashboard: fullPerm(),
    inquiries: fullPerm(),
    quotations: fullPerm(),
    jobs: fullPerm(),
    dailyStatus: fullPerm(),
    finance: readOnlyPerm(),
    hr: emptyPerm(),
    reports: fullPerm(),
    masters: fullPerm(),
    users: emptyPerm(),
  },
};

function getPermissions(role) {
  const norm = (role || "SALES").toUpperCase();
  return JSON.stringify(ROLE_PRESETS[norm] || ROLE_PRESETS.SALES);
}

async function main() {
  console.log("==================================================");
  console.log("  UPDATING USER PERMISSIONS FOR SIMULTANEOUS WORK ");
  console.log("==================================================");

  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users in database.`);

  for (const u of users) {
    const newPerms = getPermissions(u.role);
    await prisma.user.update({
      where: { id: u.id },
      data: { permissions: newPerms },
    });
    console.log(`✓ Updated permissions for user: ${u.name} (${u.email}) [Role: ${u.role}]`);
  }

  console.log("==================================================");
  console.log("  ALL USER PERMISSIONS UPDATED SUCCESSFULLY!       ");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Error updating user permissions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
