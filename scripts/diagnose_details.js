const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDetails() {
  console.log("=== DETAILED INSPECTION ===");

  // 1. Check User.permissions JSON
  const users = await prisma.user.findMany();
  console.log("\n--- USER PERMISSIONS JSON ---");
  users.forEach(u => {
    console.log(`User: ${u.name} (${u.email}) [Role: ${u.role}]`);
    console.log(`  Permissions: ${u.permissions}`);
  });

  // 2. Check Employee records and match with User records
  const employees = await prisma.employee.findMany({
    include: { _count: { select: { customers: true } } }
  });
  console.log("\n--- EMPLOYEES & CUSTOMER COUNTS ---");
  employees.forEach(e => {
    console.log(`Emp ID: ${e.id} | Name: "${e.name}" | userId: ${e.userId} | Customers count: ${e._count.customers}`);
  });

  // 3. Check Customers without employeeId
  const custNoEmp = await prisma.customer.count({ where: { employeeId: null } });
  console.log(`\nCustomers with null employeeId: ${custNoEmp}`);

  // 4. Check Quotations fields
  const sampleQuotes = await prisma.quotation.findMany({
    take: 5,
    include: { createdBy: true, customer: true }
  });
  console.log("\n--- SAMPLE QUOTATIONS (first 5) ---");
  sampleQuotes.forEach(q => {
    console.log(`Quote #${q.quotationNo} | Customer: "${q.companyName}" (Cust ID: ${q.customerId}) | CreatedBy: ${q.createdBy?.name} (${q.createdById})`);
  });

  // 5. Check Jobs linking
  const sampleJobs = await prisma.job.findMany({
    take: 5,
    include: { customer: { include: { employee: true } }, responsible: true, inquiry: { include: { responsible: true } } }
  });
  console.log("\n--- SAMPLE JOBS (first 5) ---");
  sampleJobs.forEach(j => {
    console.log(`Job: ${j.jobId} | Party: "${j.partyName}" | Cust: "${j.customer?.name}" | CustEmp: "${j.customer?.employee?.name}" | Resp: "${j.responsible?.name}" | InqResp: "${j.inquiry?.responsible?.name}"`);
  });

  // 6. Check how many Jobs can be linked to sales users via:
  // a) job.responsibleId
  // b) job.customer.employee (matching name or userId)
  // c) job.inquiry.responsibleId
  for (const u of users.filter(u => u.role === "SALES")) {
    const firstName = u.name.trim().toLowerCase();
    const matchingEmps = employees.filter(e => e.name.toLowerCase().includes(firstName) || e.userId === u.id);
    const empIds = matchingEmps.map(e => e.id);

    const jobsCount = await prisma.job.count({
      where: {
        OR: [
          { responsibleId: u.id },
          { customer: { employeeId: { in: empIds } } },
          { inquiry: { responsibleId: u.id } }
        ]
      }
    });

    const quotesCount = await prisma.quotation.count({
      where: {
        OR: [
          { createdById: u.id },
          { customer: { employeeId: { in: empIds } } }
        ]
      }
    });

    const inqCount = await prisma.inquiry.count({
      where: {
        OR: [
          { responsibleId: u.id },
          { customer: { employeeId: { in: empIds } } }
        ]
      }
    });

    console.log(`\n* User ${u.name} (matching emps: ${matchingEmps.map(e => e.name).join(', ') || 'none'}):`);
    console.log(`  - Total Linked Jobs: ${jobsCount}`);
    console.log(`  - Total Linked Quotations: ${quotesCount}`);
    console.log(`  - Total Linked Inquiries: ${inqCount}`);
  }
}

checkDetails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
