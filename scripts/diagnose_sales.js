const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function diagnose() {
  console.log("=== SALES SCOPING DIAGNOSIS ===");
  
  const users = await prisma.user.findMany();
  console.log("USERS IN DB:");
  users.forEach(u => console.log(`  - [${u.role}] ID: ${u.id} | Name: "${u.name}" | Email: "${u.email}" | Status: ${u.status} | Perms: ${u.permissions ? "CUSTOM" : "DEFAULT"}`));

  const employees = await prisma.employee.findMany();
  console.log("\nEMPLOYEES IN DB:");
  employees.forEach(e => console.log(`  - ID: ${e.id} | Name: "${e.name}" | userId: ${e.userId}`));

  // Check Inquiries responsible IDs
  const inqResponsibleCounts = await prisma.inquiry.groupBy({
    by: ['responsibleId'],
    _count: { id: true }
  });
  console.log("\nINQUIRIES GROUPED BY responsibleId:", inqResponsibleCounts);

  // Check Quotations createdBy IDs
  const quoteCreatedByCounts = await prisma.quotation.groupBy({
    by: ['createdById'],
    _count: { id: true }
  });
  console.log("\nQUOTATIONS GROUPED BY createdById:", quoteCreatedByCounts);

  // Check Jobs responsible IDs
  const jobResponsibleCounts = await prisma.job.groupBy({
    by: ['responsibleId'],
    _count: { id: true }
  });
  console.log("\nJOBS GROUPED BY responsibleId:", jobResponsibleCounts);

  // Check Jobs with null responsibleId
  const jobsNullResp = await prisma.job.count({ where: { responsibleId: null } });
  console.log("Jobs with null responsibleId:", jobsNullResp);

  // Test simulated queries for each SALES user:
  const salesUsers = users.filter(u => u.role === "SALES");
  console.log(`\nTesting simulated queries for ${salesUsers.length} SALES users:`);
  for (const sUser of salesUsers) {
    const sessionUserId = sUser.id;
    const sessionEmail = sUser.email.trim().toLowerCase();
    const sessionName = sUser.name.trim();

    // 1. Inquiries query
    const inqUserConds = [
      { responsibleId: sessionUserId },
      { responsible: { email: { equals: sessionEmail } } },
      { responsible: { name: { equals: sessionName } } }
    ];
    const userInquiries = await prisma.inquiry.findMany({
      where: { OR: inqUserConds }
    });

    // 2. Quotations query
    const quoteUserConds = [
      { createdById: sessionUserId },
      { createdBy: { email: { equals: sessionEmail } } },
      { createdBy: { name: { equals: sessionName } } }
    ];
    const userQuotes = await prisma.quotation.findMany({
      where: { OR: quoteUserConds }
    });

    // 3. Jobs query
    const jobUserConds = [
      { responsibleId: sessionUserId },
      { responsible: { email: { equals: sessionEmail } } },
      { responsible: { name: { equals: sessionName } } }
    ];
    const userJobs = await prisma.job.findMany({
      where: { OR: jobUserConds }
    });

    // 4. Also check customer link (customers assigned to employee with name = sessionName or id)
    const matchingEmp = employees.find(e => e.name.trim().toLowerCase() === sessionName.toLowerCase() || e.userId === sessionUserId);
    let custCount = 0;
    let jobViaCustomerCount = 0;
    if (matchingEmp) {
      custCount = await prisma.customer.count({ where: { employeeId: matchingEmp.id } });
      jobViaCustomerCount = await prisma.job.count({ where: { customer: { employeeId: matchingEmp.id } } });
    }

    console.log(`\n  * User: ${sUser.name} (${sUser.email})`);
    console.log(`    - Matching Inquiries (by responsibleId): ${userInquiries.length}`);
    console.log(`    - Matching Quotations (by createdById): ${userQuotes.length}`);
    console.log(`    - Matching Jobs (by responsibleId): ${userJobs.length}`);
    console.log(`    - Matching Employee record: ${matchingEmp ? `${matchingEmp.name} (ID: ${matchingEmp.id})` : "NONE"}`);
    console.log(`    - Customers assigned to employee: ${custCount}`);
    console.log(`    - Jobs linked via Customer->Employee: ${jobViaCustomerCount}`);
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
