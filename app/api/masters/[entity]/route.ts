import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can manage masters" }, { status: 403 });
  }

  const { entity } = await params;
  const body = await req.json();

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const trimmedName = body.name.trim();
  const normalizedName = trimmedName.toLowerCase();

  // Helper for case-insensitive duplicate check across all casing formats (camelCase, lower, UPPER, Title)
  const checkDuplicate = async (modelDelegate: any, entityLabel: string) => {
    const existingList = await modelDelegate.findMany({
      select: { id: true, name: true },
    });
    const found = existingList.find((item: any) => item.name?.trim().toLowerCase() === normalizedName);
    if (found) {
      return `${entityLabel} with name "${found.name}" already exists. Duplicate entry is not allowed!`;
    }
    return null;
  };

  let result: any;

  switch (entity) {
    case "customers": {
      const dupErr = await checkDuplicate(prisma.customer, "Customer / Company");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.customer.create({
        data: {
          name: trimmedName,
          address: body.address?.trim() || null,
          country: body.country?.trim() || "India",
          contactPerson: body.contactPerson?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
          employeeId: body.employeeId || null,
        },
        include: {
          employee: { select: { id: true, name: true } },
        },
      });
      break;
    }

    case "ports": {
      const dupErr = await checkDuplicate(prisma.port, "Port");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.port.create({
        data: {
          name: trimmedName,
          country: body.country?.trim() || null,
          code: body.code?.trim() || null,
        },
      });
      break;
    }

    case "liners": {
      const dupErr = await checkDuplicate(prisma.liner, "Shipping Line");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.liner.create({
        data: {
          name: trimmedName,
          code: body.code?.trim() || null,
          address: body.address?.trim() || null,
          country: body.country?.trim() || null,
          contactPerson: body.contactPerson?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
        },
      });
      break;
    }

    case "chas": {
      const dupErr = await checkDuplicate(prisma.cHA, "Customs House Agent (CHA)");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.cHA.create({
        data: {
          name: trimmedName,
          address: body.address?.trim() || null,
          country: body.country?.trim() || "India",
          contactPerson: body.contactPerson?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
          contact: body.contact?.trim() || body.phone?.trim() || null,
        },
      });
      break;
    }

    case "airlines": {
      const dupErr = await checkDuplicate(prisma.airline, "Air Line");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.airline.create({
        data: {
          name: trimmedName,
          code: body.code?.trim() || null,
          address: body.address?.trim() || null,
          country: body.country?.trim() || null,
          contactPerson: body.contactPerson?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
        },
      });
      break;
    }

    case "transporters": {
      const dupErr = await checkDuplicate(prisma.transporter, "Transporter");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.transporter.create({
        data: {
          name: trimmedName,
          address: body.address?.trim() || null,
          country: body.country?.trim() || "India",
          contactPerson: body.contactPerson?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
        },
      });
      break;
    }

    case "overseasAgents": {
      const dupErr = await checkDuplicate(prisma.overseasAgent, "Overseas Agent");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.overseasAgent.create({
        data: {
          name: trimmedName,
          address: body.address?.trim() || null,
          country: body.country?.trim() || null,
          contactPerson: body.contactPerson?.trim() || null,
          phone: body.phone?.trim() || null,
          email: body.email?.trim() || null,
        },
      });
      break;
    }

    case "employees": {
      const dupErr = await checkDuplicate(prisma.employee, "Employee");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.employee.create({
        data: {
          name: trimmedName,
          displayName: body.displayName?.trim() || trimmedName,
        },
      });
      break;
    }

    case "users": {
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: body.email?.trim().toLowerCase() } },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: `User with email "${body.email}" already exists!` },
          { status: 409 }
        );
      }

      const bcrypt = await import("bcryptjs");
      const hashed = await bcrypt.default.hash(body.password || "svil@2026", 10);
      result = await prisma.user.create({
        data: {
          name: trimmedName,
          email: body.email?.trim().toLowerCase(),
          role: body.role || "SALES",
          password: hashed,
        },
      });
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown master entity: " + entity }, { status: 400 });
  }

  return NextResponse.json(result, { status: 201 });
}
