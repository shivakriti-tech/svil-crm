const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=========================================");
  console.log("  SEEDING MASTER DATA INTO SVIL CRM      ");
  console.log("=========================================");

  // 1. Forwarders / Overseas Agents
  console.log("1. Seeding Forwarders / Overseas Agents...");
  const forwarders = [
    {
      name: "TOTAL TRANSPORT PVT LTD",
      country: "INDIA",
      contactPerson: "OM BHANUSALI",
      phone: null,
      email: null,
      address: null,
    },
  ];

  for (const f of forwarders) {
    await prisma.overseasAgent.upsert({
      where: { name: f.name },
      update: f,
      create: f,
    });
    console.log(`   + Added Forwarder: ${f.name}`);
  }

  // 2. Transporters
  console.log("2. Seeding Transporters...");
  const transporters = [
    {
      name: "G M TRANSPORT",
      contactPerson: "SANJAY",
      phone: "9702031009",
      email: null,
      country: "INDIA",
      address: "MUMBAI",
    },
  ];

  for (const t of transporters) {
    await prisma.transporter.upsert({
      where: { name: t.name },
      update: t,
      create: t,
    });
    console.log(`   + Added Transporter: ${t.name}`);
  }

  // 3. Essential Major Sea & Air Ports
  console.log("3. Seeding Major Indian & International Ports...");
  const ports = [
    { name: "MUNDRA", code: "INMUN", country: "India" },
    { name: "NHAVA SHEVA", code: "INNSA", country: "India" },
    { name: "HAZIRA", code: "INHZR", country: "India" },
    { name: "CHENNAI", code: "INMAA", country: "India" },
    { name: "KOLKATA", code: "INCCU", country: "India" },
    { name: "COCHIN", code: "INCOK", country: "India" },
    { name: "PIPAVAV", code: "INPAV", country: "India" },
    { name: "COLOMBO", code: "LKCMB", country: "Sri Lanka" },
    { name: "JEBEL ALI", code: "AEJEA", country: "United Arab Emirates" },
    { name: "SINGAPORE", code: "SGSIN", country: "Singapore" },
    { name: "PORT KLANG", code: "MYPKG", country: "Malaysia" },
    { name: "SHANGHAI", code: "CNSHA", country: "China" },
    { name: "NINGBO", code: "CNNGB", country: "China" },
    { name: "SHENZHEN", code: "CNSZX", country: "China" },
    { name: "ROTTERDAM", code: "NLRTM", country: "Netherlands" },
    { name: "HAMBURG", code: "DEHAM", country: "Germany" },
  ];

  for (const p of ports) {
    await prisma.port.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }
  console.log(`   + Seeded ${ports.length} Major Ports.`);

  // 4. Major Shipping Lines (Liners)
  console.log("4. Seeding Major Shipping Lines...");
  const liners = [
    { name: "MAERSK LINE", code: "MSK", country: "Denmark" },
    { name: "MSC (MEDITERRANEAN SHIPPING COMPANY)", code: "MSC", country: "Switzerland" },
    { name: "CMA CGM", code: "CMA", country: "France" },
    { name: "COSCO SHIPPING", code: "COS", country: "China" },
    { name: "HAPAG-LLOYD", code: "HPL", country: "Germany" },
    { name: "ONE (OCEAN NETWORK EXPRESS)", code: "ONE", country: "Japan" },
    { name: "EVERGREEN LINE", code: "EGL", country: "Taiwan" },
    { name: "WAN HAI LINES", code: "WHL", country: "Taiwan" },
    { name: "YANG MING", code: "YML", country: "Taiwan" },
    { name: "ZIM INTEGRATED SHIPPING", code: "ZIM", country: "Israel" },
    { name: "PIL (PACIFIC INTERNATIONAL LINES)", code: "PIL", country: "Singapore" },
    { name: "HYUNDAI MERCHANT MARINE (HMM)", code: "HMM", country: "South Korea" },
  ];

  for (const l of liners) {
    await prisma.liner.upsert({
      where: { name: l.name },
      update: l,
      create: l,
    });
  }
  console.log(`   + Seeded ${liners.length} Major Shipping Lines.`);

  // 5. Major Airlines
  console.log("5. Seeding Major Airlines...");
  const airlines = [
    { name: "AIR INDIA", code: "AI", country: "India" },
    { name: "EMIRATES AIRLINE", code: "EK", country: "United Arab Emirates" },
    { name: "QATAR AIRWAYS", code: "QR", country: "Qatar" },
    { name: "SINGAPORE AIRLINES CARGO", code: "SQ", country: "Singapore" },
    { name: "LUFTHANSA CARGO", code: "LH", country: "Germany" },
    { name: "CATHAY PACIFIC", code: "CX", country: "Hong Kong" },
    { name: "SAUDIA CARGO", code: "SV", country: "Saudi Arabia" },
  ];

  for (const a of airlines) {
    await prisma.airline.upsert({
      where: { name: a.name },
      update: a,
      create: a,
    });
  }
  console.log(`   + Seeded ${airlines.length} Major Airlines.`);

  console.log("=========================================");
  console.log("  MASTER DATA SEEDING COMPLETE!          ");
  console.log("=========================================");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
