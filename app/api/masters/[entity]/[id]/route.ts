import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entity, id } = await params;
  const body = await req.json();

  const trimmedName = body.name?.trim();
  const normalizedName = trimmedName?.toLowerCase();

  // Helper for case-insensitive duplicate check on rename
  const checkDuplicate = async (modelDelegate: any, entityLabel: string) => {
    if (!trimmedName) return null;
    const existingList = await modelDelegate.findMany({
      where: { NOT: { id } },
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

      result = await prisma.customer.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.address !== undefined && { address: body.address?.trim() || null }),
          ...(body.country !== undefined && { country: body.country?.trim() || null }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson?.trim() || null }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.email !== undefined && { email: body.email?.trim() || null }),
          ...(body.employeeId !== undefined && { employeeId: body.employeeId || null }),
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

      result = await prisma.port.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.country !== undefined && { country: body.country?.trim() || null }),
          ...(body.code !== undefined && { code: body.code?.trim() || null }),
        },
      });
      break;
    }

    case "liners": {
      const dupErr = await checkDuplicate(prisma.liner, "Shipping Line");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.liner.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.code !== undefined && { code: body.code?.trim() || null }),
          ...(body.address !== undefined && { address: body.address?.trim() || null }),
          ...(body.country !== undefined && { country: body.country?.trim() || null }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson?.trim() || null }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.email !== undefined && { email: body.email?.trim() || null }),
        },
      });
      break;
    }

    case "chas": {
      const dupErr = await checkDuplicate(prisma.cHA, "Customs House Agent (CHA)");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.cHA.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.address !== undefined && { address: body.address?.trim() || null }),
          ...(body.country !== undefined && { country: body.country?.trim() || null }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson?.trim() || null }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.email !== undefined && { email: body.email?.trim() || null }),
          ...(body.contact !== undefined && { contact: body.contact?.trim() || null }),
        },
      });
      break;
    }

    case "airlines": {
      const dupErr = await checkDuplicate(prisma.airline, "Air Line");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.airline.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.code !== undefined && { code: body.code?.trim() || null }),
          ...(body.address !== undefined && { address: body.address?.trim() || null }),
          ...(body.country !== undefined && { country: body.country?.trim() || null }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson?.trim() || null }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.email !== undefined && { email: body.email?.trim() || null }),
        },
      });
      break;
    }

    case "transporters": {
      const dupErr = await checkDuplicate(prisma.transporter, "Transporter");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.transporter.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.address !== undefined && { address: body.address?.trim() || null }),
          ...(body.country !== undefined && { country: body.country?.trim() || null }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson?.trim() || null }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.email !== undefined && { email: body.email?.trim() || null }),
        },
      });
      break;
    }

    case "overseasAgents": {
      const dupErr = await checkDuplicate(prisma.overseasAgent, "Overseas Agent");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.overseasAgent.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.address !== undefined && { address: body.address?.trim() || null }),
          ...(body.country !== undefined && { country: body.country?.trim() || null }),
          ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson?.trim() || null }),
          ...(body.phone !== undefined && { phone: body.phone?.trim() || null }),
          ...(body.email !== undefined && { email: body.email?.trim() || null }),
        },
      });
      break;
    }

    case "employees": {
      const dupErr = await checkDuplicate(prisma.employee, "Employee");
      if (dupErr) return NextResponse.json({ error: dupErr }, { status: 409 });

      result = await prisma.employee.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.displayName !== undefined && { displayName: body.displayName?.trim() || null }),
        },
      });
      break;
    }

    case "users": {
      result = await prisma.user.update({
        where: { id },
        data: {
          ...(trimmedName && { name: trimmedName }),
          ...(body.email && { email: body.email?.trim().toLowerCase() }),
          ...(body.role && { role: body.role }),
        },
      });
      break;
    }

    default:
      return NextResponse.json({ error: "Unknown entity: " + entity }, { status: 400 });
  }

  return NextResponse.json(result);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ entity: string; id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { entity, id } = await params;

  try {
    switch (entity) {
      case "customers": await prisma.customer.delete({ where: { id } }); break;
      case "ports": await prisma.port.delete({ where: { id } }); break;
      case "liners": await prisma.liner.delete({ where: { id } }); break;
      case "chas": await prisma.cHA.delete({ where: { id } }); break;
      case "airlines": await prisma.airline.delete({ where: { id } }); break;
      case "transporters": await prisma.transporter.delete({ where: { id } }); break;
      case "overseasAgents": await prisma.overseasAgent.delete({ where: { id } }); break;
      case "employees": await prisma.employee.delete({ where: { id } }); break;
      case "users": await prisma.user.delete({ where: { id } }); break;
      default: return NextResponse.json({ error: "Unknown entity" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cannot delete record because it is referenced by existing inquiries or shipments." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
