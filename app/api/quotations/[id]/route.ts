import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { orderBy: { orderIndex: "asc" } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  return NextResponse.json(quotation);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const {
      companyName,
      customerId,
      freightType,
      date,
      validUntil,
      validUntilText,
      originPort,
      destinationPort,
      containerType,
      volumeWeight,
      commodity,
      routing,
      vesselSchedule,
      transitTime,
      freeDays,
      spaceAvailability,
      notes,
      status,
      items,
    } = body;

    // Delete existing items and recreate if items array is provided
    if (items && Array.isArray(items)) {
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
    }

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(companyName && { companyName: companyName.trim() }),
        ...(customerId !== undefined && { customerId: customerId || null }),
        ...(freightType && { freightType }),
        ...(date && { date: new Date(date) }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(validUntilText !== undefined && { validUntilText: validUntilText?.trim() || null }),
        ...(originPort !== undefined && { originPort: originPort?.trim() || null }),
        ...(destinationPort !== undefined && { destinationPort: destinationPort?.trim() || null }),
        ...(containerType !== undefined && { containerType: containerType?.trim() || null }),
        ...(volumeWeight !== undefined && { volumeWeight: volumeWeight?.trim() || null }),
        ...(commodity !== undefined && { commodity: commodity?.trim() || null }),
        ...(routing !== undefined && { routing: routing?.trim() || null }),
        ...(vesselSchedule !== undefined && { vesselSchedule: vesselSchedule?.trim() || null }),
        ...(transitTime !== undefined && { transitTime: transitTime?.trim() || null }),
        ...(freeDays !== undefined && { freeDays: freeDays?.trim() || null }),
        ...(spaceAvailability !== undefined && { spaceAvailability: spaceAvailability?.trim() || null }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
        ...(status && { status }),
        ...(items &&
          Array.isArray(items) && {
            items: {
              create: items.map((it: any, idx: number) => ({
                chargeDescription: it.chargeDescription?.trim() || "Charge",
                rateCurrency: it.rateCurrency || "USD",
                rateAmount: String(it.rateAmount ?? ""),
                unit: it.unit?.trim() || "Per CONTAINER",
                remarks: it.remarks?.trim() || null,
                orderIndex: idx,
              })),
            },
          }),
      },
      include: {
        customer: true,
        items: { orderBy: { orderIndex: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Quotation update error:", err);
    return NextResponse.json({ error: err.message || "Failed to update quotation." }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.quotation.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
