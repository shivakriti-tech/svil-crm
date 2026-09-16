const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true } });
  const inq = await prisma.inquiry.count();
  const jobs = await prisma.job.count();
  const quotes = await prisma.quotation.count();
  const emps = await prisma.employee.count();
  const cust = await prisma.customer.count();
  const att = await prisma.attendance.count();
  const pay = await prisma.payroll.count();
  const fin = await prisma.finance.count();
  const ports = await prisma.port.count();
  const liners = await prisma.liner.count();
  const chas = await prisma.cHA.count();
  const airlines = await prisma.airline.count();
  const transporters = await prisma.transporter.count();
  const agents = await prisma.overseasAgent.count();

  console.log("=== LIVE DATABASE STATUS ===");
  console.log("Users in system:", users);
  const fromDate = "2026-08-31";
  const toDate = "2026-09-29";
  const where = {};
  if (fromDate || toDate) {
    where.inquiryDate = {};
    if (fromDate) where.inquiryDate.gte = new Date(fromDate);
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      where.inquiryDate.lte = t;
    }
  }
  const apiTest = await prisma.inquiry.findMany({
    where,
    include: {
      customer: true,
      responsible: { select: { id: true, name: true, email: true } },
      shippingLine: { select: { id: true, name: true } },
      job: { select: { id: true, jobId: true } },
    }
  });
  console.log("SIMULATED API QUERY RESULT COUNT:", apiTest.length);
  if (apiTest.length === 0) {
    console.log("WHERE CLAUSE WAS:", JSON.stringify(where, null, 2));
    const first5 = await prisma.inquiry.findMany({ take: 5, select: { id: true, inquiryNo: true, inquiryDate: true } });
    console.log("FIRST 5 INQUIRY DATES:", first5);
  }
  console.log("Jobs / Shipments count:", jobs);
  console.log("Quotations count:", quotes);
  console.log("Employees count:", emps);
  console.log("Attendance records:", att);
  console.log("Payroll records:", pay);
  console.log("Finance records:", fin);
  console.log("--- MASTERS ---");
  console.log("Customers count:", cust);
  console.log("Ports count:", ports);
  console.log("Shipping Liners count:", liners);
  console.log("CHAs count:", chas);
  console.log("Airlines count:", airlines);
  console.log("Transporters count:", transporters);
  console.log("Overseas Agents count:", agents);
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
