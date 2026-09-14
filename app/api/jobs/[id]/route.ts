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
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      customer: true,
      liner: true,
      cha: true,
      inquiry: { select: { id: true, inquiryNo: true, customerId: true, quotedRate: true } },
      responsible: { select: { id: true, name: true, email: true } },
      statusLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { timestamp: "desc" },
      },
      remarksList: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
      finance: true,
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userRole = (session.user as any)?.role || "SALES";
  const sessionUserId = (session.user as any)?.id;
  const sessionEmail = session.user?.email?.trim().toLowerCase();
  const sessionName = session.user?.name?.trim().toLowerCase();

  const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";

  if (!isAdminOrManager) {
    const isOwner =
      (sessionUserId && (job.responsibleId === sessionUserId || (job.inquiry as any)?.responsibleId === sessionUserId)) ||
      (sessionEmail && job.responsible?.email?.toLowerCase() === sessionEmail) ||
      (sessionName && job.responsible?.name?.toLowerCase() === sessionName);

    if (!isOwner) {
      return NextResponse.json({ error: "Access denied. You can only view shipments assigned to you." }, { status: 403 });
    }
  }

  return NextResponse.json(job);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // If status is changing, log it
  if (body.currentStatus) {
    const existing = await prisma.job.findUnique({
      where: { id },
      select: { currentStatus: true },
    });

    if (existing && existing.currentStatus !== body.currentStatus) {
      let validUserId: string | null = null;
      const sessionUserId = (session.user as any)?.id;
      const sessionEmail = session.user?.email;

      if (sessionUserId) {
        const u = await prisma.user.findUnique({ where: { id: sessionUserId } });
        if (u) validUserId = u.id;
      }
      if (!validUserId && sessionEmail) {
        const u = await prisma.user.findUnique({ where: { email: sessionEmail } });
        if (u) validUserId = u.id;
      }
      if (!validUserId) {
        const firstUser = await prisma.user.findFirst();
        if (firstUser) validUserId = firstUser.id;
      }

      if (validUserId) {
        await prisma.statusLog.create({
          data: {
            jobId: id,
            oldStatus: existing.currentStatus,
            newStatus: body.currentStatus,
            changedBy: validUserId,
            note: body.statusNote,
          },
        });
      }
    }
  }

  const isCompleted = body.currentStatus === "COMPLETED" ? true : undefined;

  const jobData: any = {
    ...(body.partyName && { partyName: body.partyName }),
    ...(body.consignee !== undefined && { consignee: body.consignee }),
    ...(body.shipper !== undefined && { shipper: body.shipper }),
    ...(body.notifyParty !== undefined && { notifyParty: body.notifyParty }),
    ...(body.origin !== undefined && { origin: body.origin }),
    ...(body.pol && { pol: body.pol }),
    ...(body.pod && { pod: body.pod }),
    ...(body.finalDestination !== undefined && { finalDestination: body.finalDestination }),
    ...(body.placeOfAcceptance !== undefined && { placeOfAcceptance: body.placeOfAcceptance }),
    ...(body.placeOfDelivery !== undefined && { placeOfDelivery: body.placeOfDelivery }),

    ...(body.igmNo !== undefined && { igmNo: body.igmNo }),
    ...(body.igmDate !== undefined && { igmDate: body.igmDate ? new Date(body.igmDate) : null }),
    ...(body.mblNo !== undefined && { mblNo: body.mblNo }),
    ...(body.mblDate !== undefined && { mblDate: body.mblDate ? new Date(body.mblDate) : null }),
    ...(body.hblNo !== undefined && { hblNo: body.hblNo }),
    ...(body.hblDate !== undefined && { hblDate: body.hblDate ? new Date(body.hblDate) : null }),
    ...(body.forwarderHblNo !== undefined && { forwarderHblNo: body.forwarderHblNo }),
    ...(body.carrierName !== undefined && { carrierName: body.carrierName }),
    ...(body.cfsName !== undefined && { cfsName: body.cfsName }),
    ...(body.vesselName !== undefined && { vesselName: body.vesselName }),
    ...(body.voyageNo !== undefined && { voyageNo: body.voyageNo }),
    ...(body.vesselVoyage !== undefined && { vesselVoyage: body.vesselVoyage }),
    ...(body.incoTerm !== undefined && { incoTerm: body.incoTerm }),
    ...(body.itemNo !== undefined && { itemNo: body.itemNo }),
    ...(body.subItemNo !== undefined && { subItemNo: body.subItemNo }),
    ...(body.shipmentTerms !== undefined && { shipmentTerms: body.shipmentTerms }),
    ...(body.deliveryAgent !== undefined && { deliveryAgent: body.deliveryAgent }),
    ...(body.freightPayableAt !== undefined && { freightPayableAt: body.freightPayableAt }),
    ...(body.shippedOnBoardDate !== undefined && { shippedOnBoardDate: body.shippedOnBoardDate ? new Date(body.shippedOnBoardDate) : null }),

    ...(body.containerType !== undefined && { containerType: body.containerType }),
    ...(body.containerNo !== undefined && { containerNo: body.containerNo }),
    ...(body.sealNo !== undefined && { sealNo: body.sealNo }),
    ...(body.packageType !== undefined && { packageType: body.packageType }),
    ...(body.marksNumbers !== undefined && { marksNumbers: body.marksNumbers }),
    ...(body.cargoDescription !== undefined && { cargoDescription: body.cargoDescription }),
    ...(body.weightKgs !== undefined && { weightKgs: body.weightKgs }),
    ...(body.volumeCbm !== undefined && { volumeCbm: body.volumeCbm }),
    ...(body.grossWeight !== undefined && { grossWeight: body.grossWeight }),
    ...(body.netWeight !== undefined && { netWeight: body.netWeight }),
    ...(body.cargoItemsJson !== undefined && { cargoItemsJson: typeof body.cargoItemsJson === "string" ? body.cargoItemsJson : JSON.stringify(body.cargoItemsJson) }),

    ...(body.svilInvoiceNo !== undefined && { svilInvoiceNo: body.svilInvoiceNo }),
    ...(body.scope !== undefined && { scope: typeof body.scope === "string" ? body.scope : JSON.stringify(body.scope) }),
    ...(body.chaId !== undefined && { chaId: body.chaId || null }),
    ...(body.linerId !== undefined && { linerId: body.linerId || null }),
    ...(body.shipmentType !== undefined && { shipmentType: body.shipmentType || null }),
    ...(body.fclLcl !== undefined && { fclLcl: body.fclLcl || null }),
    ...(body.commodity !== undefined && { commodity: body.commodity }),
    ...(body.volume !== undefined && { volume: body.volume }),
    ...(body.etd !== undefined && { etd: body.etd ? new Date(body.etd) : null }),
    ...(body.eta !== undefined && { eta: body.eta ? new Date(body.eta) : null }),
    ...(body.responsibleId !== undefined && { responsibleId: body.responsibleId || null }),
    ...(body.currentStatus && { currentStatus: body.currentStatus }),
    ...(body.attentionFlag !== undefined && { attentionFlag: body.attentionFlag }),
    ...(body.invoiceStatus !== undefined && { invoiceStatus: body.invoiceStatus }),
    ...(body.invoiceNo !== undefined && { invoiceNo: body.invoiceNo }),
    ...(body.invoiceDate !== undefined && { invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null }),
    ...(isCompleted !== undefined && { isCompleted }),
  };

  const job = await prisma.job.update({
    where: { id },
    data: jobData,
    include: {
      customer: true,
      liner: true,
      cha: true,
      finance: true,
      responsible: { select: { id: true, name: true } },
    },
  });

  // If finance fields provided, upsert Finance record
  if (
    body.buy !== undefined ||
    body.sale !== undefined ||
    body.cost !== undefined ||
    body.buyUsd !== undefined ||
    body.saleUsd !== undefined ||
    body.exchangeRate !== undefined ||
    body.billingItemsJson !== undefined ||
    body.invoiceStatus !== undefined ||
    body.invoiceNo !== undefined
  ) {
    const exchangeRate = body.exchangeRate !== undefined ? Number(body.exchangeRate) : (job.finance?.exchangeRate || 87.5);
    const saleUsd = body.saleUsd !== undefined ? Number(body.saleUsd) : (job.finance?.saleUsd || 0);
    const saleInr = body.sale !== undefined ? Number(body.sale) : (saleUsd * exchangeRate || job.finance?.sale || 0);
    const buyUsd = body.buyUsd !== undefined ? Number(body.buyUsd) : (job.finance?.buyUsd || 0);
    const buyInr = body.buy !== undefined ? Number(body.buy) : (buyUsd * exchangeRate || job.finance?.buy || 0);
    const cost = body.cost !== undefined ? Number(body.cost) : (job.finance?.cost || 0);
    const margin = saleInr - (cost || buyInr);

    await prisma.finance.upsert({
      where: { jobId: id },
      create: {
        jobId: id,
        buy: buyInr,
        sale: saleInr,
        cost: cost,
        margin: margin,
        buyUsd: buyUsd,
        saleUsd: saleUsd,
        exchangeRate: exchangeRate,
        convertedSaleInr: saleUsd * exchangeRate + (saleInr > saleUsd * exchangeRate ? saleInr - saleUsd * exchangeRate : 0),
        billingItemsJson: body.billingItemsJson ? (typeof body.billingItemsJson === "string" ? body.billingItemsJson : JSON.stringify(body.billingItemsJson)) : null,
        invoiceStatus: body.invoiceStatus || job.invoiceStatus,
        invoiceNo: body.invoiceNo || job.invoiceNo,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
      },
      update: {
        ...(body.buy !== undefined && { buy: buyInr }),
        ...(body.sale !== undefined && { sale: saleInr }),
        ...(body.cost !== undefined && { cost }),
        margin: margin,
        ...(body.buyUsd !== undefined && { buyUsd }),
        ...(body.saleUsd !== undefined && { saleUsd }),
        ...(body.exchangeRate !== undefined && { exchangeRate }),
        convertedSaleInr: saleUsd * exchangeRate + (saleInr > saleUsd * exchangeRate ? saleInr - saleUsd * exchangeRate : 0),
        ...(body.billingItemsJson !== undefined && { billingItemsJson: typeof body.billingItemsJson === "string" ? body.billingItemsJson : JSON.stringify(body.billingItemsJson) }),
        ...(body.invoiceStatus !== undefined && { invoiceStatus: body.invoiceStatus }),
        ...(body.invoiceNo !== undefined && { invoiceNo: body.invoiceNo }),
        ...(body.invoiceDate !== undefined && { invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null }),
      },
    });
  }

  return NextResponse.json(job);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
