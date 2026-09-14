const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function deduplicate() {
  console.log("Starting Masters Deduplication...");

  // 1. Deduplicate Liners (Shipping Lines)
  const liners = await prisma.liner.findMany({ orderBy: { createdAt: "asc" } });
  const linerMap = new Map();
  for (const l of liners) {
    const key = l.name.trim().toLowerCase();
    if (!linerMap.has(key)) {
      linerMap.set(key, l);
    } else {
      const primary = linerMap.get(key);
      console.log(`Merging duplicate Liner "${l.name}" (${l.id}) -> Primary (${primary.id})`);
      // Repoint inquiries
      await prisma.inquiry.updateMany({
        where: { shippingLineId: l.id },
        data: { shippingLineId: primary.id },
      });
      // Delete duplicate
      await prisma.liner.delete({ where: { id: l.id } });
    }
  }

  // 2. Deduplicate Ports
  const ports = await prisma.port.findMany({ orderBy: { createdAt: "asc" } });
  const portMap = new Map();
  for (const p of ports) {
    const key = p.name.trim().toLowerCase();
    if (!portMap.has(key)) {
      portMap.set(key, p);
    } else {
      console.log(`Deleting duplicate Port "${p.name}" (${p.id})`);
      await prisma.port.delete({ where: { id: p.id } });
    }
  }

  // 3. Deduplicate Airlines
  const airlines = await prisma.airline.findMany({ orderBy: { createdAt: "asc" } });
  const airlineMap = new Map();
  for (const a of airlines) {
    const key = a.name.trim().toLowerCase();
    if (!airlineMap.has(key)) {
      airlineMap.set(key, a);
    } else {
      console.log(`Deleting duplicate Airline "${a.name}" (${a.id})`);
      await prisma.airline.delete({ where: { id: a.id } });
    }
  }

  // 4. Deduplicate Transporters
  const transporters = await prisma.transporter.findMany({ orderBy: { createdAt: "asc" } });
  const transporterMap = new Map();
  for (const t of transporters) {
    const key = t.name.trim().toLowerCase();
    if (!transporterMap.has(key)) {
      transporterMap.set(key, t);
    } else {
      console.log(`Deleting duplicate Transporter "${t.name}" (${t.id})`);
      await prisma.transporter.delete({ where: { id: t.id } });
    }
  }

  // 5. Deduplicate CHAs
  const chas = await prisma.cHA.findMany({ orderBy: { createdAt: "asc" } });
  const chaMap = new Map();
  for (const c of chas) {
    const key = c.name.trim().toLowerCase();
    if (!chaMap.has(key)) {
      chaMap.set(key, c);
    } else {
      console.log(`Deleting duplicate CHA "${c.name}" (${c.id})`);
      await prisma.cHA.delete({ where: { id: c.id } });
    }
  }

  // 6. Deduplicate Overseas Agents
  const agents = await prisma.overseasAgent.findMany({ orderBy: { createdAt: "asc" } });
  const agentMap = new Map();
  for (const ag of agents) {
    const key = ag.name.trim().toLowerCase();
    if (!agentMap.has(key)) {
      agentMap.set(key, ag);
    } else {
      console.log(`Deleting duplicate Overseas Agent "${ag.name}" (${ag.id})`);
      await prisma.overseasAgent.delete({ where: { id: ag.id } });
    }
  }

  // 7. Deduplicate Employees
  const employees = await prisma.employee.findMany({ orderBy: { createdAt: "asc" } });
  const employeeMap = new Map();
  for (const e of employees) {
    const key = e.name.trim().toLowerCase();
    if (!employeeMap.has(key)) {
      employeeMap.set(key, e);
    } else {
      const primary = employeeMap.get(key);
      console.log(`Merging duplicate Employee "${e.name}" (${e.id}) -> Primary (${primary.id})`);
      await prisma.customer.updateMany({
        where: { employeeId: e.id },
        data: { employeeId: primary.id },
      });
      await prisma.attendance.updateMany({
        where: { employeeId: e.id },
        data: { employeeId: primary.id },
      });
      await prisma.payroll.updateMany({
        where: { employeeId: e.id },
        data: { employeeId: primary.id },
      });
      await prisma.employee.delete({ where: { id: e.id } });
    }
  }

  // 8. Deduplicate Customers
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: "asc" } });
  const customerMap = new Map();
  for (const c of customers) {
    const key = c.name.trim().toLowerCase();
    if (!customerMap.has(key)) {
      customerMap.set(key, c);
    } else {
      const primary = customerMap.get(key);
      console.log(`Merging duplicate Customer "${c.name}" (${c.id}) -> Primary (${primary.id})`);
      await prisma.inquiry.updateMany({
        where: { customerId: c.id },
        data: { customerId: primary.id },
      });
      await prisma.job.updateMany({
        where: { customerId: c.id },
        data: { customerId: primary.id },
      });
      await prisma.quotation.updateMany({
        where: { customerId: c.id },
        data: { customerId: primary.id },
      });
      await prisma.customer.delete({ where: { id: c.id } });
    }
  }

  console.log("Masters deduplication completed successfully!");
}

deduplicate()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
