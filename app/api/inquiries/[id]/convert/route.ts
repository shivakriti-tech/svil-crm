import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// POST /api/inquiries/[id]/convert — Convert inquiry to job with mandatory Consignee, Notify Party, and Shipper
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    // Body is optional if direct conversion
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: { customer: true, shippingLine: true, job: true },
  });

  if (!inquiry) return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  if (inquiry.job) {
    return NextResponse.json({ error: `Already converted to job ${inquiry.job.jobId}` }, { status: 400 });
  }

  // Validate Mandatory Fields: Consignee, Notify Party, and Shipper
  const consignee = body.consignee?.trim() || inquiry.customer?.name;
  const notifyParty = body.notifyParty?.trim() || "SIDDHI VINAYAK INTERNATIONAL LOGISTICS";
  const shipper = body.shipper?.trim() || inquiry.customer?.name;

  if (!consignee || !notifyParty || !shipper) {
    return NextResponse.json({
      error: "Consignee, Notify Party, and Shipper are mandatory fields to convert an inquiry into a job.",
    }, { status: 400 });
  }

  // Generate next job ID (SVIL260134, etc.)
  const allJobs = await prisma.job.findMany({
    where: { jobId: { startsWith: "SVIL" } },
    select: { jobId: true },
  });

  let maxNum = 0;
  for (const j of allJobs) {
    const match = j.jobId.match(/SVIL\d{2}-?(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextNum = maxNum + 1;
  const year = new Date().getFullYear().toString().slice(-2);
  const newJobId = `SVIL${year}${String(nextNum).padStart(4, "0")}`;

  const quotedNum = inquiry.quotedRate ? Number(inquiry.quotedRate.replace(/[^0-9.]/g, "")) || 0 : 0;
  const exchangeRate = body.exchangeRate ? Number(body.exchangeRate) : 87.5;
  const saleUsd = body.saleUsd ? Number(body.saleUsd) : (quotedNum > 10000 ? 0 : quotedNum);
  const saleInr = body.saleInr ? Number(body.saleInr) : (quotedNum >= 10000 ? quotedNum : saleUsd * exchangeRate);

  // Create job pre-filled from inquiry + mandatory parties + CAN/BL initial fields
  const job = await prisma.job.create({
    data: {
      jobId: newJobId,
      inquiryId: inquiry.id,
      customerId: inquiry.customerId,
      partyName: inquiry.customer?.name || "Client",
      consignee,
      notifyParty,
      shipper,
      pol: body.pol || inquiry.pol || "MUNDRA",
      pod: body.pod || inquiry.pod || "POD",
      origin: body.origin || inquiry.pol || "MUNDRA",
      finalDestination: body.finalDestination || inquiry.pod || "POD",
      commodity: body.commodity || inquiry.commodity,
      volume: body.volume || inquiry.containerVolume,
      containerType: body.containerType || inquiry.containerVolume || "40 HC",
      shipmentType: body.shipmentType || inquiry.exim || "EXP",
      fclLcl: body.fclLcl || inquiry.shipmentType || "FCL",
      linerId: inquiry.shippingLineId || null,
      carrierName: inquiry.shippingLine?.name || body.carrierName || null,
      responsibleId: inquiry.responsibleId || (session.user as any).id || null,
      currentStatus: "BOOKING_CONFIRMED",
      invoiceStatus: "INVOICE_NOT_GENERATED",
      igmNo: body.igmNo || null,
      mblNo: body.mblNo || null,
      hblNo: body.hblNo || null,
      vesselVoyage: body.vesselVoyage || null,
      incoTerm: body.incoTerm || "Ex Works",
      shipmentTerms: body.shipmentTerms || (inquiry.shipmentType === "LCL" ? "LCL/LCL" : "FCL/FCL"),
      scope: JSON.stringify(body.scope || ["Forwarding"]),
      finance: {
        create: {
          buy: body.buy ? Number(body.buy) : 0,
          sale: saleInr,
          buyUsd: body.buyUsd ? Number(body.buyUsd) : 0,
          saleUsd: saleUsd,
          exchangeRate: exchangeRate,
          convertedSaleInr: saleUsd * exchangeRate + (saleInr > saleUsd * exchangeRate ? saleInr - saleUsd * exchangeRate : 0),
          invoiceStatus: "INVOICE_NOT_GENERATED",
        },
      },
    },
    include: {
      customer: true,
      liner: true,
      finance: true,
    },
  });

  // Update inquiry status to BOOKED / WON
  await prisma.inquiry.update({
    where: { id },
    data: { status: "BOOKED" },
  });

  return NextResponse.json({
    success: true,
    message: `Inquiry successfully converted to Job ${newJobId}`,
    job,
  }, { status: 201 });
}
