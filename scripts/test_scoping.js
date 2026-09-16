const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testScoping() {
  const users = await prisma.user.findMany({ where: { role: "SALES" } });
  for (const u of users) {
    const sessionUserId = u.id;
    const sessionEmail = u.email.trim().toLowerCase();
    const sessionName = u.name.trim();

    // 1. Inquiries
    const inqUserConds = [
      { responsibleId: sessionUserId },
      { responsible: { email: { equals: sessionEmail } } },
      { responsible: { name: { contains: sessionName } } }
    ];
    const userInquiries = await prisma.inquiry.findMany({
      where: { OR: inqUserConds },
      select: { id: true, inquiryNo: true, customerId: true, customer: { select: { name: true } } }
    });

    const custIds = Array.from(new Set(userInquiries.map(i => i.customerId).filter(Boolean)));
    const custNames = Array.from(new Set(userInquiries.map(i => i.customer?.name).filter(Boolean)));

    // 2. Quotations
    const quoteUserConds = [
      { createdById: sessionUserId },
      { createdBy: { email: { equals: sessionEmail } } },
      { createdBy: { name: { contains: sessionName } } },
      ...(custIds.length > 0 ? [{ customerId: { in: custIds } }] : []),
      ...(custNames.length > 0 ? [{ companyName: { in: custNames } }] : [])
    ];
    const userQuotes = await prisma.quotation.findMany({
      where: { OR: quoteUserConds }
    });

    // 3. Jobs
    const jobUserConds = [
      { responsibleId: sessionUserId },
      { responsible: { email: { equals: sessionEmail } } },
      { responsible: { name: { contains: sessionName } } },
      {
        inquiry: {
          OR: [
            { responsibleId: sessionUserId },
            { responsible: { email: { equals: sessionEmail } } },
            { responsible: { name: { contains: sessionName } } }
          ]
        }
      },
      ...(custIds.length > 0 ? [{ customerId: { in: custIds } }] : []),
      ...(custNames.length > 0 ? [{ partyName: { in: custNames } }] : [])
    ];
    const userJobs = await prisma.job.findMany({
      where: { OR: jobUserConds }
    });

    console.log(`\n========================================`);
    console.log(`Sales User: ${u.name} (${u.email})`);
    console.log(`  - Inquiries count: ${userInquiries.length}`);
    console.log(`  - Quotations count: ${userQuotes.length}`);
    console.log(`  - Jobs count: ${userJobs.length}`);
  }
}

testScoping()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
