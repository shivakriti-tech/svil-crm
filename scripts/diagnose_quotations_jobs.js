const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkQuotesAndJobs() {
  console.log("=== QUOTATIONS ANALYSIS ===");
  const quotes = await prisma.quotation.findMany({
    include: {
      customer: { include: { employee: true } },
      createdBy: true
    }
  });
  console.log(`Total quotations: ${quotes.length}`);
  for (const q of quotes) {
    console.log(`Quote #${q.quotationNo} | Company: "${q.companyName}" | CustID: ${q.customerId} | CustEmp: ${q.customer?.employee?.name || 'NONE'} | CreatedBy: ${q.createdBy?.name}`);
  }

  console.log("\n=== JOBS ANALYSIS ===");
  const jobs = await prisma.job.findMany({
    take: 20,
    include: {
      customer: { include: { employee: true } },
      responsible: true,
      inquiry: { include: { responsible: true } }
    }
  });
  console.log(`Total jobs: ${await prisma.job.count()}`);
  for (const j of jobs) {
    console.log(`Job: ${j.jobId} | Party: "${j.partyName}" | CustID: ${j.customerId} | CustEmp: ${j.customer?.employee?.name || 'NONE'} | Resp: ${j.responsible?.name || 'NONE'} | InqResp: ${j.inquiry?.responsible?.name || 'NONE'}`);
  }

  // Check if customers have employeeId assigned or how customers were linked to sales executives
  const custWithEmp = await prisma.customer.findMany({
    where: { employeeId: { not: null } },
    include: { employee: true }
  });
  console.log(`\nCustomers with employee assigned: ${custWithEmp.length}`);

  // Check Inquiries to see how customers and sales executives link
  const inqs = await prisma.inquiry.findMany({
    select: {
      id: true,
      inquiryNo: true,
      customerId: true,
      customer: { select: { name: true, employeeId: true } },
      responsibleId: true,
      responsible: { select: { id: true, name: true } }
    }
  });
  console.log(`\nTotal Inquiries: ${inqs.length}`);
  const custToSalesMap = new Map();
  for (const inq of inqs) {
    if (inq.customer?.name && inq.responsible?.name) {
      custToSalesMap.set(inq.customer.name.toLowerCase().trim(), inq.responsible.name);
    }
  }
  console.log(`Distinct customer->sales mapping from inquiries: ${custToSalesMap.size}`);

  // How many quotations match these customer names?
  let quoteMatchCount = 0;
  for (const q of quotes) {
    const assignedSales = custToSalesMap.get((q.companyName || "").toLowerCase().trim());
    if (assignedSales) {
      quoteMatchCount++;
      console.log(`  Quote #${q.quotationNo} (${q.companyName}) -> Assigned Sales Exec from Inquiries: ${assignedSales}`);
    }
  }
  console.log(`Total quotations matched to sales executives via customer name: ${quoteMatchCount} / ${quotes.length}`);
}

checkQuotesAndJobs()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
