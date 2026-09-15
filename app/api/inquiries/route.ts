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
  const responsible = searchParams.get("responsible") ?? "";
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const month = searchParams.get("month"); // fallback support
  const followup = searchParams.get("followup") === "true";

  const where: any = {};

  if (search) {
    where.OR = [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { pol: { contains: search, mode: "insensitive" } },
      { pod: { contains: search, mode: "insensitive" } },
      { commodity: { contains: search, mode: "insensitive" } },
      { incoTerms: { contains: search, mode: "insensitive" } },
      { inquiryType: { contains: search, mode: "insensitive" } },
    ];
  }

  if (status) where.status = status;
  if (responsible) where.responsibleId = responsible;

  if (followup) {
    where.followUpDate = { lte: new Date() };
    where.status = { not: "CLOSE" };
  }

  // Date range filtering logic (from/to takes priority, then month)
  if (fromDate || toDate) {
    where.inquiryDate = {};
    if (fromDate) where.inquiryDate.gte = new Date(fromDate);
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      where.inquiryDate.lte = t;
    }
  } else if (month && month !== "all" && month.trim() !== "") {
    const [year, mon] = month.split("-").map(Number);
    where.inquiryDate = {
      gte: new Date(year, mon - 1, 1),
      lt: new Date(year, mon, 1),
    };
  }

  const userRole = (session.user as any)?.role || "SALES";
  const sessionUserId = (session.user as any)?.id;
  const sessionEmail = session.user?.email?.trim().toLowerCase();
  const sessionName = session.user?.name?.trim();

  // Scoping: SALES team members (Chirag, Yash, Jinal, Yogesh) only see their own inquiries.
  // Operations (Urvish, Aafrin, Kamal), Finance (Devika), and Admin see all inquiries.
  const isSalesScoped = userRole === "SALES";
  if (isSalesScoped) {
    const userConditions: any[] = [];
    if (sessionUserId) userConditions.push({ responsibleId: sessionUserId });
    if (sessionUserId) userConditions.push({ createdById: sessionUserId });
    if (sessionEmail) userConditions.push({ responsible: { email: { equals: sessionEmail } } });
    if (sessionName) userConditions.push({ responsible: { name: { equals: sessionName } } });
    if (sessionEmail) userConditions.push({ createdBy: { email: { equals: sessionEmail } } });

    if (userConditions.length > 0) {
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: userConditions },
        ];
        delete where.OR;
      } else {
        where.OR = userConditions;
      }
    }
  }

  // Fetch inquiries, total count, and workload aggregation in parallel (LIFO order: newest created first)
  const [items, total, workloadRaw, usersList] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      include: {
        customer: true,
        responsible: { select: { id: true, name: true, email: true } },
        shippingLine: { select: { id: true, name: true } },
        job: { select: { id: true, jobId: true } },
      },
      orderBy: [{ inquiryDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.inquiry.count({ where }),
    prisma.inquiry.groupBy({
      by: ["responsibleId", "status"],
      where: {
        ...(fromDate || toDate
          ? {
              inquiryDate: {
                ...(fromDate ? { gte: new Date(fromDate) } : {}),
                ...(toDate ? { lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) } : {}),
              },
            }
          : month && month !== "all" && month.trim() !== ""
          ? {
              inquiryDate: {
                gte: new Date(Number(month.split("-")[0]), Number(month.split("-")[1]) - 1, 1),
                lt: new Date(Number(month.split("-")[0]), Number(month.split("-")[1]), 1),
              },
            }
          : {}),
      },
      _count: { id: true },
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
    }),
  ]);

  const userMap = new Map(usersList.map((u) => [u.id, u.name]));
  const workloadByEmployee: Record<
    string,
    { id: string; name: string; total: number; active: number; booked: number; other: number }
  > = {};

  for (const item of workloadRaw) {
    const rId = item.responsibleId;
    const name = userMap.get(rId) ?? "Unknown";
    if (!workloadByEmployee[rId]) {
      workloadByEmployee[rId] = {
        id: rId,
        name,
        total: 0,
        active: 0,
        booked: 0,
        other: 0,
      };
    }
    const count = item._count.id;
    workloadByEmployee[rId].total += count;
    if (item.status === "IN_PROCESS" || item.status === "RATE_NOT_GIVEN" || item.status === "RATE_UNMATCHED") {
      workloadByEmployee[rId].active += count;
    } else if (item.status === "BOOKED") {
      workloadByEmployee[rId].booked += count;
    } else {
      workloadByEmployee[rId].other += count;
    }
  }

  const workloadList = Object.values(workloadByEmployee).sort((a, b) => b.total - a.total);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    workload: workloadList,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Find or create customer
  let customer = await prisma.customer.findFirst({
    where: { name: { equals: body.customerName } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: body.customerName,
        contactPerson: body.contactPerson,
        phone: body.phoneEmail,
      },
    });
  }

  const lastInquiry = await prisma.inquiry.findFirst({
    orderBy: { inquiryNo: "desc" },
  });
  const inquiryNo = (lastInquiry?.inquiryNo ?? 0) + 1;

  const inquiry = await prisma.inquiry.create({
    data: {
      inquiryNo,
      inquiryDate: new Date(body.inquiryDate),
      customerId: customer.id,
      contactPerson: body.contactPerson || null,
      phoneEmail: body.phoneEmail || null,
      pol: body.pol || null,
      pod: body.pod || null,
      commodity: body.commodity || null,
      exim: body.exim ?? "EX",
      shipmentType: body.shipmentType ?? "FCL",
      incoTerms: body.incoTerms || null,
      inquiryType: body.inquiryType || "Export",
      containerVolume: body.containerVolume || null,
      weightKgs: body.weightKgs || null,
      shippingLineId: body.shippingLineId || null,
      rateSent: body.rateSent ?? false,
      quotedRate: body.quotedRate || null,
      status: body.status ?? "IN_PROCESS",
      responsibleId: body.responsibleId,
      remarks: body.remarks || null,
      followUpDate: body.followUpDate ? new Date(body.followUpDate) : null,
    },
    include: {
      customer: true,
      responsible: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(inquiry, { status: 201 });
}
