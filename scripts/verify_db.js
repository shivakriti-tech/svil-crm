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
  console.log("Inquiries count:", inq);
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
