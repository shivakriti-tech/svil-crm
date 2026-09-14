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
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: {
      customer: true,
      responsible: { select: { id: true, name: true } },
      shippingLine: { select: { id: true, name: true } },
      job: { select: { id: true, jobId: true } },
    },
  });

  if (!inquiry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(inquiry);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // If customerName is provided, find/create customer
  let customerId = body.customerId;
  if (body.customerName && !customerId) {
    let customer = await prisma.customer.findFirst({
      where: { name: { equals: body.customerName } },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: body.customerName, contactPerson: body.contactPerson, phone: body.phoneEmail },
      });
    }
    customerId = customer.id;
  }

  const updated = await prisma.inquiry.update({
    where: { id },
    data: {
      ...(body.inquiryDate && { inquiryDate: new Date(body.inquiryDate) }),
      ...(customerId && { customerId }),
      ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
      ...(body.phoneEmail !== undefined && { phoneEmail: body.phoneEmail }),
      ...(body.pol !== undefined && { pol: body.pol }),
      ...(body.pod !== undefined && { pod: body.pod }),
      ...(body.commodity !== undefined && { commodity: body.commodity }),
      ...(body.exim && { exim: body.exim }),
      ...(body.shipmentType && { shipmentType: body.shipmentType }),
      ...(body.containerVolume !== undefined && { containerVolume: body.containerVolume }),
      ...(body.weightKgs !== undefined && { weightKgs: body.weightKgs }),
      ...(body.shippingLineId !== undefined && { shippingLineId: body.shippingLineId || null }),
      ...(body.rateSent !== undefined && { rateSent: body.rateSent }),
      ...(body.quotedRate !== undefined && { quotedRate: body.quotedRate }),
      ...(body.status && { status: body.status }),
      ...(body.responsibleId && { responsibleId: body.responsibleId }),
      ...(body.remarks !== undefined && { remarks: body.remarks }),
      ...(body.followUpDate !== undefined && {
        followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
      }),
    },
    include: {
      customer: true,
      responsible: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.inquiry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
