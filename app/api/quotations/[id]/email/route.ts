import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendQuotationEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { to, cc, subject, customMessage, pdfBase64 } = body;

    if (!to || !to.trim()) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    let attachmentBuffer: Buffer | undefined;
    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      attachmentBuffer = Buffer.from(cleanBase64, "base64");
    }

    const result = await sendQuotationEmail({
      to: to.trim(),
      cc: cc?.trim() || undefined,
      customerName: quotation.companyName || quotation.customer?.name || "Valued Client",
      quotationNo: quotation.quotationNo,
      subject,
      customMessage,
      attachmentBuffer,
      attachmentFilename: `Quotation_${quotation.quotationNo.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Quotation email dispatch error:", error);
    return NextResponse.json({ error: error.message || "Failed to send quotation email" }, { status: 500 });
  }
}
