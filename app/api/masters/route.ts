import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function deduplicateByName<T extends { name?: string | null; email?: string | null; id: string }>(list: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of list) {
    const key = (item.name || item.email || item.id).trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

// GET all masters data
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [
    rawCustomers,
    rawPorts,
    rawLiners,
    rawChas,
    rawAirlines,
    rawTransporters,
    rawOverseasAgents,
    rawEmployees,
    rawUsers,
  ] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: {
        employee: { select: { id: true, name: true, displayName: true } },
      },
    }),
    prisma.port.findMany({ orderBy: { name: "asc" } }),
    prisma.liner.findMany({ orderBy: { name: "asc" } }),
    prisma.cHA.findMany({ orderBy: { name: "asc" } }),
    prisma.airline.findMany({ orderBy: { name: "asc" } }),
    prisma.transporter.findMany({ orderBy: { name: "asc" } }),
    prisma.overseasAgent.findMany({ orderBy: { name: "asc" } }),
    prisma.employee.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    customers: deduplicateByName(rawCustomers),
    ports: deduplicateByName(rawPorts),
    liners: deduplicateByName(rawLiners),
    chas: deduplicateByName(rawChas),
    airlines: deduplicateByName(rawAirlines),
    transporters: deduplicateByName(rawTransporters),
    overseasAgents: deduplicateByName(rawOverseasAgents),
    employees: deduplicateByName(rawEmployees),
    users: deduplicateByName(rawUsers),
  });
}
