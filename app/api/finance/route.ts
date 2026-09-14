import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "100");
  const search = searchParams.get("search") ?? "";
  const invoiceStatus = searchParams.get("invoiceStatus") ?? "";
  const customerId = searchParams.get("customer") ?? "";
  const timeframe = searchParams.get("timeframe") ?? "all";
  const fromDateParam = searchParams.get("fromDate");
  const toDateParam = searchParams.get("toDate");

  // Calculate Date Range based on timeframe
  let dateFilter: { gte?: Date; lte?: Date } | null = null;
  const now = new Date();

  if (timeframe === "this_week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  } else if (timeframe === "last_week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
    const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  } else if (timeframe === "this_month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  } else if (timeframe === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  } else if (timeframe === "this_year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  } else if (timeframe === "custom" && fromDateParam && toDateParam) {
    const start = new Date(fromDateParam);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDateParam);
    end.setHours(23, 59, 59, 999);
    dateFilter = { gte: start, lte: end };
  }

  const jobWhere: any = {};
  if (search) {
    jobWhere.OR = [
      { jobId: { contains: search } },
      { partyName: { contains: search } },
    ];
  }
  if (customerId) jobWhere.customerId = customerId;
  if (dateFilter) {
    jobWhere.createdAt = dateFilter;
  }

  const financeWhere: any = { job: jobWhere };
  if (invoiceStatus) financeWhere.invoiceStatus = invoiceStatus;

  // Fetch paginated items and total
  const [items, total, allPeriodFinances] = await Promise.all([
    prisma.finance.findMany({
      where: financeWhere,
      include: {
        job: {
          select: {
            id: true,
            jobId: true,
            partyName: true,
            pol: true,
            pod: true,
            currentStatus: true,
            invoiceStatus: true,
            invoiceNo: true,
            etd: true,
            eta: true,
            createdAt: true,
            responsible: { select: { id: true, name: true } },
            customer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.finance.count({ where: financeWhere }),
    // Fetch all records for the period to calculate robust statistics & weekly/monthly grouping
    prisma.finance.findMany({
      where: {
        job: dateFilter ? { createdAt: dateFilter } : {},
      },
      include: {
        job: {
          select: {
            id: true,
            jobId: true,
            partyName: true,
            createdAt: true,
            invoiceStatus: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Overall Financial Summary
  let totalSale = 0;
  let totalBuy = 0;
  let totalCost = 0;
  let totalMargin = 0;
  let totalSaleUsd = 0;

  let paidAmount = 0;
  let invoicedAmount = 0;
  let pendingAmount = 0;

  let paidCount = 0;
  let invoicedCount = 0;
  let pendingCount = 0;

  // Groupings for Reports
  const monthlyGroups: Record<string, { period: string; sortKey: string; jobCount: number; sale: number; buy: number; cost: number; margin: number; invoicedCount: number; pendingCount: number }> = {};
  const weeklyGroups: Record<string, { period: string; sortKey: string; jobCount: number; sale: number; buy: number; cost: number; margin: number; invoicedCount: number; pendingCount: number }> = {};

  for (const f of allPeriodFinances) {
    const sale = Number(f.sale ?? 0);
    const buy = Number(f.buy ?? 0);
    const cost = Number(f.cost ?? 0);
    const margin = Number(f.margin ?? (sale - buy - cost));
    const saleUsd = Number(f.saleUsd ?? 0);

    totalSale += sale;
    totalBuy += buy;
    totalCost += cost;
    totalMargin += margin;
    totalSaleUsd += saleUsd;

    const status = f.invoiceStatus || (f.job?.invoiceStatus === "INVOICE_GENERATED" ? "INVOICED" : "PENDING");
    if (status === "PAID") {
      paidAmount += sale;
      paidCount++;
    } else if (status === "INVOICED") {
      invoicedAmount += sale;
      invoicedCount++;
    } else {
      pendingAmount += sale;
      pendingCount++;
    }

    // Monthly bucket
    const jobDate = f.job?.createdAt ? new Date(f.job.createdAt) : new Date();
    const monthKey = `${jobDate.getFullYear()}-${String(jobDate.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = jobDate.toLocaleString("en-US", { month: "short", year: "numeric" });

    if (!monthlyGroups[monthKey]) {
      monthlyGroups[monthKey] = { period: monthLabel, sortKey: monthKey, jobCount: 0, sale: 0, buy: 0, cost: 0, margin: 0, invoicedCount: 0, pendingCount: 0 };
    }
    monthlyGroups[monthKey].jobCount++;
    monthlyGroups[monthKey].sale += sale;
    monthlyGroups[monthKey].buy += buy;
    monthlyGroups[monthKey].cost += cost;
    monthlyGroups[monthKey].margin += margin;
    if (status === "INVOICED" || status === "PAID") monthlyGroups[monthKey].invoicedCount++;
    else monthlyGroups[monthKey].pendingCount++;

    // Weekly bucket (ISO week approximation)
    const startOfYear = new Date(jobDate.getFullYear(), 0, 1);
    const pastDaysOfYear = (jobDate.getTime() - startOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    const weekKey = `${jobDate.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    const weekLabel = `Week ${weekNum} (${jobDate.toLocaleString("en-US", { month: "short" })})`;

    if (!weeklyGroups[weekKey]) {
      weeklyGroups[weekKey] = { period: weekLabel, sortKey: weekKey, jobCount: 0, sale: 0, buy: 0, cost: 0, margin: 0, invoicedCount: 0, pendingCount: 0 };
    }
    weeklyGroups[weekKey].jobCount++;
    weeklyGroups[weekKey].sale += sale;
    weeklyGroups[weekKey].buy += buy;
    weeklyGroups[weekKey].cost += cost;
    weeklyGroups[weekKey].margin += margin;
    if (status === "INVOICED" || status === "PAID") weeklyGroups[weekKey].invoicedCount++;
    else weeklyGroups[weekKey].pendingCount++;
  }

  const monthlyReport = Object.values(monthlyGroups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  const weeklyReport = Object.values(weeklyGroups).sort((a, b) => b.sortKey.localeCompare(a.sortKey));

  // Chart data: chronological order (last 6 months or all sorted ascending)
  const chartData = Object.values(monthlyGroups)
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map((m) => ({
      name: m.period,
      Revenue: m.sale,
      Cost: m.buy + m.cost,
      Profit: m.margin,
      Jobs: m.jobCount,
    }));

  const marginPercentage = totalSale > 0 ? ((totalMargin / totalSale) * 100).toFixed(1) : "0.0";

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    summary: {
      totalSale,
      totalBuy,
      totalCost,
      totalMargin,
      marginPercentage,
      totalSaleUsd,
      paidAmount,
      paidCount,
      invoicedAmount,
      invoicedCount,
      pendingAmount,
      pendingCount,
    },
    monthlyReport,
    weeklyReport,
    chartData,
  });
}
