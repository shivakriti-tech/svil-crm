import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const companyName = searchParams.get("companyName") || "";
  const fromDate = searchParams.get("fromDate") || "";
  const toDate = searchParams.get("toDate") || "";
  const month = searchParams.get("month") || "";
  const freightType = searchParams.get("freightType") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "50");

  const where: any = {};

  if (search) {
    where.OR = [
      { quotationNo: { contains: search } },
      { companyName: { contains: search } },
      { originPort: { contains: search } },
      { destinationPort: { contains: search } },
      { containerType: { contains: search } },
    ];
  }

  if (companyName && companyName !== "all") {
    where.companyName = { contains: companyName };
  }

  if (freightType && freightType !== "all") {
    where.freightType = freightType;
  }

  if (status && status !== "all") {
    where.status = status;
  }

  // Date filtering
  if (month && month !== "all") {
    const [year, m] = month.split("-").map(Number);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 0, 23, 59, 59, 999);
    where.date = { gte: start, lte: end };
  } else if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date.gte = new Date(fromDate);
    if (toDate) {
      const t = new Date(toDate);
      t.setHours(23, 59, 59, 999);
      where.date.lte = t;
    }
  }

  // Enforce role-based scoping (Only SALES users see their own quotations)
  const userRole = (session.user as any)?.role || "SALES";
  const sessionUserId = (session.user as any)?.id;
  const sessionEmail = session.user?.email?.trim().toLowerCase();
  const sessionName = session.user?.name?.trim();
  const isSalesScoped = userRole === "SALES";

  if (isSalesScoped) {
    const userConditions: any[] = [];
    if (sessionUserId) userConditions.push({ createdById: sessionUserId });
    if (sessionEmail) userConditions.push({ createdBy: { email: { equals: sessionEmail } } });
    if (sessionName) userConditions.push({ createdBy: { name: { contains: sessionName } } });

    // Also include quotations for customers linked to this sales executive's inquiries
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
      userConditions.push({ companyName: { in: custNames } });
    }

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

  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        items: { orderBy: { orderIndex: "asc" } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.quotation.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      companyName,
      customerId,
      freightType = "Sea Freight",
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
      status = "DRAFT",
      items = [],
    } = body;

    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ error: "Company name is required." }, { status: 400 });
    }

    // Verify customer foreign key safely
    let validCustomerId: string | null = null;
    if (customerId) {
      const existingCustomer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (existingCustomer) {
        validCustomerId = existingCustomer.id;
      }
    }
    if (!validCustomerId && companyName) {
      const matched = await prisma.customer.findFirst({
        where: { name: { equals: companyName.trim() } },
      });
      if (matched) {
        validCustomerId = matched.id;
      }
    }

    // Verify user foreign key safely
    let validCreatedById: string | null = null;
    const sessionUserId = (session.user as any)?.id;
    if (sessionUserId) {
      const existingUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (existingUser) {
        validCreatedById = existingUser.id;
      }
    }

    // Generate next Quotation Number (e.g. SV00438)
    let quotationNo = body.quotationNo?.trim();
    if (!quotationNo) {
      const lastQuotation = await prisma.quotation.findFirst({
        orderBy: { createdAt: "desc" },
        select: { quotationNo: true },
      });

      let nextNum = 438;
      if (lastQuotation?.quotationNo) {
        const match = lastQuotation.quotationNo.match(/\d+/);
        if (match) {
          nextNum = parseInt(match[0], 10) + 1;
        }
      }
      quotationNo = `SV${String(nextNum).padStart(5, "0")}`;
    }

    // Ensure quotationNo is unique
    const dupCheck = await prisma.quotation.findUnique({ where: { quotationNo } });
    if (dupCheck) {
      quotationNo = `${quotationNo}-${Date.now().toString().slice(-3)}`;
    }

    const created = await prisma.quotation.create({
      data: {
        quotationNo,
        date: date ? new Date(date) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        validUntilText: validUntilText?.trim() || null,
        companyName: companyName.trim(),
        customerId: validCustomerId,
        freightType,
        originPort: originPort?.trim() || null,
        destinationPort: destinationPort?.trim() || null,
        containerType: containerType?.trim() || null,
        volumeWeight: volumeWeight?.trim() || null,
        commodity: commodity?.trim() || null,
        routing: routing?.trim() || null,
        vesselSchedule: vesselSchedule?.trim() || null,
        transitTime: transitTime?.trim() || null,
        freeDays: freeDays?.trim() || null,
        spaceAvailability: spaceAvailability?.trim() || null,
        notes: notes?.trim() || null,
        status,
        createdById: validCreatedById,
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
      },
      include: {
        items: { orderBy: { orderIndex: "asc" } },
        customer: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("Quotation creation error:", err);
    return NextResponse.json({ error: err.message || "Failed to create quotation." }, { status: 500 });
  }
}
