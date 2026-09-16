const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function linkEmployees() {
  console.log("=== LINKING EMPLOYEES TO USERS ===");
  const users = await prisma.user.findMany();
  const employees = await prisma.employee.findMany();

  for (const user of users) {
    const firstName = user.name.trim().toLowerCase();
    let matchedEmp = employees.find(e => e.name.toLowerCase().includes(firstName) || e.userId === user.id);
    
    if (matchedEmp) {
      await prisma.employee.update({
        where: { id: matchedEmp.id },
        data: {
          userId: user.id,
          displayName: user.name
        }
      });
      console.log(`✓ Linked Employee "${matchedEmp.name}" to User "${user.name}" (${user.email})`);
    } else {
      // Create employee record for user (e.g. Yogesh or others)
      const newEmp = await prisma.employee.create({
        data: {
          name: user.name,
          displayName: user.name,
          userId: user.id,
          profile: {
            create: {
              designation: user.role === "SALES" ? "Sales Executive" : user.role === "FINANCE" ? "Finance Executive" : "Operations Executive",
              department: user.role,
              email: user.email,
              status: "ACTIVE"
            }
          }
        }
      });
      console.log(`+ Created and linked new Employee record for User "${user.name}" (${user.email})`);
    }
  }

  console.log("\n=== SYNCING USER PERMISSIONS TO ROLE PRESETS ===");
  const FULL_PERM = { view: true, add: true, edit: true, delete: true };
  const READ_ONLY = { view: true, add: false, edit: false, delete: false };
  const OPERATIONAL = { view: true, add: true, edit: true, delete: false };
  const NO_PERM = { view: false, add: false, edit: false, delete: false };

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

  for (const u of users) {
    const roleKey = (u.role || "SALES").toUpperCase();
    const permObj = ROLE_PERMS[roleKey] || ROLE_PERMS.SALES;
    await prisma.user.update({
      where: { id: u.id },
      data: {
        permissions: JSON.stringify(permObj)
      }
    });
    console.log(`✓ Synchronized permissions for ${u.name} (${u.email}) [Role: ${u.role}]`);
  }
}

linkEmployees()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
