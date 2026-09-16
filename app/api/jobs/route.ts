import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50");
  const search = searchParams.get("search") ?? "";
  const status = searchParams.get("status") ?? "";
  const invoiceStatus = searchParams.get("invoiceStatus") ?? "";
  const completed = searchParams.get("completed") === "true";
  const attention = searchParams.get("attention") === "true";
  const linerId = searchParams.get("liner") ?? "";
  const responsibleId = searchParams.get("responsible") ?? "";

  const userRole = (session.user as any)?.role || "SALES";
  const sessionUserId = (session.user as any)?.id;
  const sessionEmail = session.user?.email?.trim().toLowerCase();
  const sessionName = session.user?.name?.trim();

  const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";

  const andConditions: any[] = [{ isCompleted: completed }];

  // Scoping: SALES team members (Chirag, Yash, Jinal, Yogesh, Shrikar) only see their own jobs.
  const isSalesScoped = userRole === "SALES";
  if (isSalesScoped) {
    const userConditions: any[] = [];
    if (sessionUserId) userConditions.push({ responsibleId: sessionUserId });
    if (sessionEmail) userConditions.push({ responsible: { email: { equals: sessionEmail } } });
    if (sessionName) userConditions.push({ responsible: { name: { contains: sessionName } } });

    // Also include jobs converted from inquiries assigned to this sales user
    userConditions.push({
      inquiry: {
        OR: [
          ...(sessionUserId ? [{ responsibleId: sessionUserId }] : []),
          ...(sessionEmail ? [{ responsible: { email: { equals: sessionEmail } } }] : []),
          ...(sessionName ? [{ responsible: { name: { contains: sessionName } } }] : []),
        ],
      },
    });

    // Also include jobs for customers associated with this sales user's inquiries
    const salesInquiries = await prisma.inquiry.findMany({
      where: {
        OR: [
          ...(sessionUserId ? [{ responsibleId: sessionUserId }] : []),
          ...(sessionEmail ? [{ responsible: { email: { equals: sessionEmail } } }] : []),
          ...(sessionName ? [{ responsible: { name: { contains: sessionName } } }] : []),
        ],
      },
      select: { customerId: true, customer: { select: { name: true } } },
    });

    const custIds = Array.from(new Set(salesInquiries.map((i) => i.customerId).filter(Boolean)));
    const custNames = Array.from(new Set(salesInquiries.map((i) => i.customer?.name).filter(Boolean)));

    if (custIds.length > 0) {
      userConditions.push({ customerId: { in: custIds } });
    }
    if (custNames.length > 0) {
      userConditions.push({ partyName: { in: custNames } });
    }

    if (userConditions.length > 0) {
      andConditions.push({ OR: userConditions });
    }
  }

  // Scoping: Aafrin can view all employees' jobs, but ONLY EXPORTS (no import jobs)
  if (sessionEmail === "aafrin@siddhivinayaklogistics.co.in") {
    andConditions.push({
      AND: [
        {
          OR: [
            { legacyJobId: null },
            { NOT: { legacyJobId: { startsWith: "FI" } } },
          ],
        },
        {
          OR: [
            { legacyJobId: null },
            { NOT: { legacyJobId: { startsWith: "LI" } } },
          ],
        },
        {
          OR: [
            { inquiry: null },
            { inquiry: { inquiryType: { not: "Import" } } },
          ],
        },
        {
          OR: [
            { inquiry: null },
            { inquiry: { exim: { notIn: ["IM", "IMP"] } } },
          ],
        },
      ],
    });
  }

  if (responsibleId) {
    andConditions.push({ responsibleId });
  }

  if (search) {
    andConditions.push({
      OR: [
        { jobId: { contains: search } },
        { partyName: { contains: search } },
        { consignee: { contains: search } },
        { shipper: { contains: search } },
        { notifyParty: { contains: search } },
        { hblNo: { contains: search } },
        { mblNo: { contains: search } },
        { igmNo: { contains: search } },
        { legacyJobId: { contains: search } },
        { invoiceNo: { contains: search } },
      ],
    });
  }

  if (status) andConditions.push({ currentStatus: status });
  if (invoiceStatus) andConditions.push({ invoiceStatus: invoiceStatus });
  if (attention) andConditions.push({ attentionFlag: true });
  if (linerId) andConditions.push({ linerId: linerId });

  const where = { AND: andConditions };

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        customer: true,
        liner: true,
        cha: true,
        responsible: { select: { id: true, name: true, email: true } },
        finance: true,
        inquiry: { select: { id: true, inquiryNo: true, responsibleId: true, responsible: { select: { id: true, name: true, email: true } } } },
        _count: { select: { remarksList: true } },
      },
      orderBy: [{ attentionFlag: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize, isScopedUser: !isAdminOrManager });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (!body.partyName || !body.pol || !body.pod || !body.shipmentType) {
    return NextResponse.json(
      { error: "partyName, pol, pod, and shipmentType are required" },
      { status: 400 }
    );
  }

  // Generate job ID (SVIL26-00001 or SVIL260001)
  const lastJob = await prisma.job.findFirst({
    where: { jobId: { startsWith: "SVIL" } },
    orderBy: { jobId: "desc" },
  });

  let nextNum = 1;
  if (lastJob?.jobId) {
    const match = lastJob.jobId.match(/SVIL\d{2}-?(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }

  const year = new Date().getFullYear().toString().slice(-2);
  const newJobId = `SVIL${year}-${String(nextNum).padStart(5, "0")}`;

  // Find or create customer
  let customerId = body.customerId;
  if (!customerId && body.partyName) {
    let customer = await prisma.customer.findFirst({
      where: { name: { equals: body.partyName } },
    });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: body.partyName } });
    }
    customerId = customer.id;
  }

  const exchangeRate = Number(body.exchangeRate) || 87.5;
  const saleUsd = Number(body.saleUsd) || 0;
  const saleInr = Number(body.saleInr) || (saleUsd * exchangeRate);
  const buyUsd = Number(body.buyUsd) || 0;
  const buyInr = Number(body.buy) || (buyUsd * exchangeRate);

  const job = await prisma.job.create({
    data: {
      jobId: newJobId,
      customerId,
      partyName: body.partyName,
      consignee: body.consignee,
      shipper: body.shipper,
      notifyParty: body.notifyParty,
      origin: body.origin || body.pol,
      pol: body.pol,
      pod: body.pod,
      finalDestination: body.finalDestination || body.pod,
      placeOfAcceptance: body.placeOfAcceptance,
      placeOfDelivery: body.placeOfDelivery,
      
      igmNo: body.igmNo,
      igmDate: body.igmDate ? new Date(body.igmDate) : null,
      mblNo: body.mblNo,
      mblDate: body.mblDate ? new Date(body.mblDate) : null,
      hblNo: body.hblNo,
      hblDate: body.hblDate ? new Date(body.hblDate) : null,
      forwarderHblNo: body.forwarderHblNo,
      carrierName: body.carrierName,
      cfsName: body.cfsName,
      vesselName: body.vesselName,
      voyageNo: body.voyageNo,
      vesselVoyage: body.vesselVoyage || (body.vesselName ? `${body.vesselName} / ${body.voyageNo || ""}` : null),
      incoTerm: body.incoTerm || "Ex Works",
      itemNo: body.itemNo,
      subItemNo: body.subItemNo,
      shipmentTerms: body.shipmentTerms || "LCL/LCL",
      deliveryAgent: body.deliveryAgent,
      freightPayableAt: body.freightPayableAt || "DESTINATION",
      shippedOnBoardDate: body.shippedOnBoardDate ? new Date(body.shippedOnBoardDate) : null,

      containerType: body.containerType,
      containerNo: body.containerNo,
      sealNo: body.sealNo,
      packageType: body.packageType,
      marksNumbers: body.marksNumbers,
      cargoDescription: body.cargoDescription,
      weightKgs: body.weightKgs,
      volumeCbm: body.volumeCbm,
      grossWeight: body.grossWeight,
      netWeight: body.netWeight,
      cargoItemsJson: body.cargoItemsJson ? JSON.stringify(body.cargoItemsJson) : null,

      svilInvoiceNo: body.svilInvoiceNo,
      scope: typeof body.scope === "string" ? body.scope : JSON.stringify(body.scope ?? []),
      chaId: body.chaId || null,
      linerId: body.linerId || null,
      shipmentType: body.shipmentType,
      fclLcl: body.fclLcl,
      commodity: body.commodity,
      volume: body.volume,
      etd: body.etd ? new Date(body.etd) : null,
      eta: body.eta ? new Date(body.eta) : null,
      responsibleId: body.responsibleId || null,
      currentStatus: "BOOKING_CONFIRMED",
      invoiceStatus: body.invoiceStatus || "INVOICE_NOT_GENERATED",
      invoiceNo: body.invoiceNo || null,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,

      finance: {
        create: {
          buy: buyInr,
          sale: saleInr,
          cost: Number(body.cost) || 0,
          margin: saleInr - (Number(body.cost) || buyInr),
          buyUsd: buyUsd,
          saleUsd: saleUsd,
          exchangeRate: exchangeRate,
          convertedSaleInr: saleUsd * exchangeRate + (saleInr > saleUsd * exchangeRate ? saleInr - saleUsd * exchangeRate : 0),
          billingItemsJson: body.billingItemsJson ? JSON.stringify(body.billingItemsJson) : null,
          invoiceStatus: body.invoiceStatus || "INVOICE_NOT_GENERATED",
          invoiceNo: body.invoiceNo || null,
          invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
        },
      },
    },
    include: {
      customer: true,
      liner: true,
      cha: true,
      finance: true,
    },
  });

  // Log initial status
  await prisma.statusLog.create({
    data: {
      jobId: job.id,
      newStatus: "BOOKING_CONFIRMED",
      changedBy: (session.user as any).id,
      note: "Job created",
    },
  });

  return NextResponse.json(job, { status: 201 });
}
