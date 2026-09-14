import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendDsrEmail } from "@/lib/email";
import * as XLSX from "xlsx";
import { formatDate, getStatusLabel } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      customerName,
      customerId,
      to,
      cc,
      subject,
      customMessage,
      shipmentType = "IMPORT",
      saveCustomerEmail = true,
      includeCompleted = false,
    } = body;

    if (!to || !to.trim()) {
      return NextResponse.json({ error: "Recipient email address is required" }, { status: 400 });
    }

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    // Save/update customer email in DB if requested
    if (saveCustomerEmail && to) {
      if (customerId) {
        await prisma.customer.update({
          where: { id: customerId },
          data: { email: to.trim() },
        }).catch(() => {});
      } else {
        const found = await prisma.customer.findFirst({
          where: { name: { equals: customerName.trim() } },
        });
        if (found) {
          await prisma.customer.update({
            where: { id: found.id },
            data: { email: to.trim() },
          }).catch(() => {});
        }
      }
    }

    // Fetch jobs for this customer
    const where: any = {
      partyName: { contains: customerName.trim() },
    };
    if (!includeCompleted) {
      where.isCompleted = false;
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        liner: true,
        cha: true,
        responsible: { select: { id: true, name: true } },
        remarksList: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: `No active shipments found for party '${customerName}'.` },
        { status: 404 }
      );
    }

    // Generate Excel Workbook for this Client DSR
    const rows = jobs.map((job, index) => ({
      "SR NO.": index + 1,
      "JOB NO.": job.jobId,
      "HBL NO.": job.hblNo ?? "—",
      "MBL NO.": job.mblNo ?? "—",
      "SHIPPER": job.shipper ?? "—",
      "CONSIGNEE": job.consignee ?? "—",
      "POL": job.pol,
      "POD": job.pod,
      "ETD": formatDate(job.etd),
      "ETA": formatDate(job.eta),
      "SHIPPING LINE": job.liner?.name ?? "—",
      "CONTAINER / VOLUME": job.volume || job.containerType || "—",
      "FCL/LCL": job.fclLcl ?? "FCL",
      "COMMODITY": job.commodity ?? "—",
      "CURRENT STATUS": getStatusLabel(job.currentStatus),
      "LATEST UPDATE / REMARKS": job.remarksList?.[0]?.note ?? "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths for clean readability
    ws["!cols"] = [
      { wch: 8 },  // SR NO
      { wch: 14 }, // JOB NO
      { wch: 16 }, // HBL NO
      { wch: 16 }, // MBL NO
      { wch: 22 }, // SHIPPER
      { wch: 22 }, // CONSIGNEE
      { wch: 16 }, // POL
      { wch: 16 }, // POD
      { wch: 14 }, // ETD
      { wch: 14 }, // ETA
      { wch: 18 }, // SHIPPING LINE
      { wch: 20 }, // CONTAINER / VOLUME
      { wch: 10 }, // FCL/LCL
      { wch: 20 }, // COMMODITY
      { wch: 22 }, // CURRENT STATUS
      { wch: 30 }, // REMARKS
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Status Report");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const safeClientName = customerName.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().slice(0, 10);
    const attachmentFilename = `SVIL_DSR_${safeClientName}_${dateStr}.xlsx`;

    // Send Email
    const emailResult = await sendDsrEmail({
      to: to.trim(),
      cc: cc?.trim() || undefined,
      customerName,
      subject: subject || `${shipmentType} - (DSR) - ${dateStr} - ${customerName.toUpperCase()}`,
      customMessage,
      shipmentType: shipmentType as any,
      attachmentBuffer: excelBuffer,
      attachmentFilename,
    });

    return NextResponse.json({
      success: true,
      message: `DSR successfully sent to ${to.trim()}`,
      shipmentsCount: jobs.length,
      attachmentFilename,
      mode: emailResult.mode,
    });
  } catch (error: any) {
    console.error("DSR Email sending error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch DSR email" },
      { status: 500 }
    );
  }
}
