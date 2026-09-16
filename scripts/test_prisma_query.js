const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testPrismaQuery() {
  const sessionUserId = "cmthjoart0075kxflp3ior8zv"; // Chirag
  const sessionEmail = "chirag@siddhivinayaklogistics.co.in";
  const sessionName = "Chirag";

  const userConditions = [];
  if (sessionUserId) userConditions.push({ responsibleId: sessionUserId });
  // THIS WAS IN inquiries/route.ts:
  if (sessionUserId) userConditions.push({ createdById: sessionUserId });
  if (sessionEmail) userConditions.push({ responsible: { email: { equals: sessionEmail } } });
  if (sessionName) userConditions.push({ responsible: { name: { equals: sessionName } } });
  if (sessionEmail) userConditions.push({ createdBy: { email: { equals: sessionEmail } } });

  const where = { OR: userConditions };

  try {
    console.log("Testing Inquiry query with createdById/createdBy...");
    const items = await prisma.inquiry.findMany({
      where,
      include: {
        customer: true,
        responsible: { select: { id: true, name: true, email: true } },
        shippingLine: { select: { id: true, name: true } },
        job: { select: { id: true, jobId: true } },
      }
    });
    console.log("Success! Items count:", items.length);
  } catch (err) {
    console.error("PRISMA ERROR ON INQUIRY QUERY:", err.message);
  }
}

testPrismaQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
