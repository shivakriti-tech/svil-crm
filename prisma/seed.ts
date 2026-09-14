import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SQLite database...");

  // ── EMPLOYEES ──────────────────────────────────────────
  const employees = [
    { name: "Aafrin", displayName: "Aafrin" },
    { name: "Chirag", displayName: "Chirag" },
    { name: "Dhruvee", displayName: "Dhruvee" },
    { name: "Jinal", displayName: "Jinal" },
    { name: "Kamal", displayName: "Kamal" },
    { name: "Shrikar", displayName: "Shrikar" },
    { name: "Yash", displayName: "Yash" },
  ];

  for (const emp of employees) {
    await prisma.employee.upsert({
      where: { name: emp.name },
      update: {},
      create: emp,
    });
  }
  console.log(`✓ ${employees.length} employees seeded`);

  // ── USERS ──────────────────────────────────────────────
  const svilPassword = await bcrypt.hash("svil@2026", 10);
  const adminPassword = await bcrypt.hash("admin@svil2026", 10);

  const users = [
    { email: "admin@svil.com", name: "Admin", role: "ADMIN", password: adminPassword },
    { email: "chirag@svil.com", name: "Chirag", role: "SALES", password: svilPassword },
    { email: "shrikar@svil.com", name: "Shrikar", role: "OPERATIONS", password: svilPassword },
    { email: "kamal@svil.com", name: "Kamal", role: "SALES", password: svilPassword },
    { email: "jinal@svil.in", name: "Jinal", role: "ACCOUNTS", password: svilPassword },
    { email: "aafrin@svil.in", name: "Aafrin", role: "SALES", password: svilPassword },
    { email: "dhruvee@svil.in", name: "Dhruvee", role: "OPERATIONS", password: svilPassword },
    { email: "yash@svil.in", name: "Yash", role: "SALES", password: svilPassword },
    { email: "management@svil.in", name: "Management", role: "MANAGEMENT", password: adminPassword },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password: user.password },
      create: user,
    });
  }
  console.log(`✓ ${users.length} users seeded`);

  // ── PORTS ──────────────────────────────────────────────
  const ports = [
    { name: "Mundra", country: "India", code: "INMUN" },
    { name: "Nhava Sheva", country: "India", code: "INNSA" },
    { name: "Hazira", country: "India", code: "INHAZ" },
    { name: "ICD Ahmedabad", country: "India", code: "INAMD" },
    { name: "ICD Sachana", country: "India", code: "INSAC" },
    { name: "ICD Tumb", country: "India", code: "INTUM" },
    { name: "Chennai", country: "India", code: "INMAA" },
    { name: "Kolkata", country: "India", code: "INCCU" },
    { name: "Mumbai", country: "India", code: "INBOM" },
    { name: "Shanghai", country: "China", code: "CNSHA" },
    { name: "Ningbo", country: "China", code: "CNNGB" },
    { name: "Qingdao", country: "China", code: "CNTAO" },
    { name: "Guangzhou", country: "China", code: "CNGZH" },
    { name: "Tianjin", country: "China", code: "CNTJN" },
    { name: "Shenzhen", country: "China", code: "CNSZX" },
    { name: "Rotterdam", country: "Netherlands", code: "NLRTM" },
    { name: "Hamburg", country: "Germany", code: "DEHAM" },
    { name: "Genova", country: "Italy", code: "ITGOA" },
    { name: "Apapa", country: "Nigeria", code: "NGAPP" },
    { name: "Port Klang", country: "Malaysia", code: "MYPKG" },
    { name: "Singapore", country: "Singapore", code: "SGSIN" },
    { name: "Jebel Ali", country: "UAE", code: "AEJEA" },
    { name: "Dalian", country: "China", code: "CNDLC" },
    { name: "Colombo", country: "Sri Lanka", code: "LKCMB" },
    { name: "Nhava Sheva (NS)", country: "India", code: "INNSA" },
  ];

  for (const port of ports) {
    await prisma.port.upsert({
      where: { name: port.name },
      update: {},
      create: port,
    });
  }
  console.log(`✓ ${ports.length} ports seeded`);

  // ── LINERS ─────────────────────────────────────────────
  const liners = [
    { name: "Maersk", code: "MAEU" },
    { name: "MSC", code: "MSCU" },
    { name: "CMA CGM", code: "CMDU" },
    { name: "COSCO", code: "COSU" },
    { name: "ONE", code: "ONEY" },
    { name: "Hapag-Lloyd", code: "HLCU" },
    { name: "ZIM", code: "ZIMU" },
    { name: "Evergreen", code: "EGLV" },
    { name: "Yang Ming", code: "YMLU" },
    { name: "PIL", code: "PDAL" },
    { name: "Wan Hai", code: "WHLC" },
    { name: "Total Transport", code: "TTAL" },
    { name: "AWS", code: "AWS" },
    { name: "Gold Star Line", code: "GSL" },
    { name: "SITC", code: "SITC" },
    { name: "Rohlig", code: "ROHL" },
    { name: "Sinokor", code: "SNKO" },
    { name: "Turkon", code: "TRKN" },
    { name: "OOCL", code: "OOCL" },
    { name: "HMM", code: "HDMU" },
  ];

  for (const liner of liners) {
    await prisma.liner.upsert({
      where: { name: liner.name },
      update: {},
      create: liner,
    });
  }
  console.log(`✓ ${liners.length} liners seeded`);

  // ── CHAs ───────────────────────────────────────────────
  const chas = [
    { name: "Nice Shipping" },
    { name: "Sky Star" },
    { name: "Kai Shipping" },
    { name: "Sumeet Logistics" },
    { name: "Manilal" },
    { name: "Shree Raj" },
    { name: "Sundar CHA" },
    { name: "Global Freight" },
  ];

  for (const cha of chas) {
    await prisma.cHA.upsert({
      where: { name: cha.name },
      update: {},
      create: cha,
    });
  }
  console.log(`✓ ${chas.length} CHAs seeded`);

  console.log("✅ SQLite database seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
