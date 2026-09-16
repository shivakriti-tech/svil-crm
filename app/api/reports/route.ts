import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "this_month";
    const customFrom = searchParams.get("fromDate");
    const customTo = searchParams.get("toDate");
    const employeeId = searchParams.get("employeeId") || "";

    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    let dateFilter: { gte?: Date; lte?: Date } | null = null;

    if (timeframe === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    } else if (timeframe === "last_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    } else if (timeframe === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    } else if (timeframe === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    } else if (timeframe === "custom" && customFrom && customTo) {
      startDate = new Date(`${customFrom}T00:00:00.000Z`);
      endDate = new Date(`${customTo}T23:59:59.999Z`);
      dateFilter = { gte: startDate, lte: endDate };
    } else if (timeframe === "all") {
      startDate = null;
      endDate = null;
      dateFilter = null;
    } else {
      // Default: this_month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      dateFilter = { gte: startDate, lte: endDate };
    }

    const sessionUserRole = (session.user as any)?.role || "SALES";
    const sessionUserId = (session.user as any)?.id;
    const sessionEmail = session.user?.email?.trim().toLowerCase();
    const sessionName = session.user?.name?.trim();

    // 1. Sales Team Scoping (Chirag, Yash, Jinal, Yogesh, Shrikar):
    // Sales users are strictly scoped to their own activity/performance
    const isSalesScoped = sessionUserRole === "SALES";
    let effectiveEmployeeId = employeeId;
    if (isSalesScoped) {
      effectiveEmployeeId = sessionUserId;
    }

    // 2. Kamal Scoping:
    // - Exclude Shrikar from reports
    // - No rights to Financial & Status Overview
    const isKamal = sessionEmail === "kamal@siddhivinayaklogistics.co.in";
    const canViewOverview = !isKamal;

    // Inquiries & Jobs where clauses
    const inqWhere: any = dateFilter ? { inquiryDate: dateFilter } : {};
    const jobWhere: any = dateFilter ? { createdAt: dateFilter } : {};

    if (isSalesScoped) {
      const inqUserConds: any[] = [];
      if (sessionUserId) inqUserConds.push({ responsibleId: sessionUserId });
      if (sessionEmail) inqUserConds.push({ responsible: { email: { equals: sessionEmail } } });
      if (sessionName) inqUserConds.push({ responsible: { name: { contains: sessionName } } });
      inqWhere.OR = inqUserConds;

      const salesInqs = await prisma.inquiry.findMany({
        where: { OR: inqUserConds },
        select: { customerId: true, customer: { select: { name: true } } },
      });
      const custIds = Array.from(new Set(salesInqs.map((i) => i.customerId).filter(Boolean)));
      const custNames = Array.from(new Set(salesInqs.map((i) => i.customer?.name).filter(Boolean)));

      const jobUserConds: any[] = [
        ...(sessionUserId ? [{ responsibleId: sessionUserId }] : []),
        ...(sessionEmail ? [{ responsible: { email: { equals: sessionEmail } } }] : []),
        ...(sessionName ? [{ responsible: { name: { contains: sessionName } } }] : []),
        {
          inquiry: {
            OR: inqUserConds,
          },
        },
        ...(custIds.length > 0 ? [{ customerId: { in: custIds } }] : []),
        ...(custNames.length > 0 ? [{ partyName: { in: custNames } }] : []),
      ];
      jobWhere.OR = jobUserConds;
    } else if (effectiveEmployeeId) {
      inqWhere.responsibleId = effectiveEmployeeId;
      jobWhere.responsibleId = effectiveEmployeeId;
    }

    // Fetch parallel dataset
    const [
      rawAllUsers,
      rawInquiriesInPeriod,
      rawJobsInPeriod,
      allActiveJobs,
      allOverdueJobs,
      financeAggregates,
    ] = await Promise.all([
      prisma.user.findMany({
        where: isSalesScoped && sessionUserId ? { id: sessionUserId } : {},
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: "asc" },
      }),
      prisma.inquiry.findMany({
        where: inqWhere,
        include: {
          customer: { select: { id: true, name: true } },
          responsible: { select: { id: true, name: true, email: true } },
          shippingLine: { select: { id: true, name: true } },
          job: {
            select: {
              id: true,
              jobId: true,
              isCompleted: true,
              currentStatus: true,
              finance: true,
            },
          },
        },
        orderBy: { inquiryDate: "desc" },
      }),
      prisma.job.findMany({
        where: jobWhere,
        include: {
          customer: { select: { id: true, name: true } },
          responsible: { select: { id: true, name: true, email: true } },
          liner: { select: { id: true, name: true } },
          finance: true,
          inquiry: { select: { id: true, inquiryNo: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.job.count({ where: { isCompleted: false, ...jobWhere } }),
      prisma.job.count({
        where: {
          isCompleted: false,
          eta: { lt: now },
          currentStatus: { not: "DELIVERED" },
          ...jobWhere,
        },
      }),
      prisma.finance.aggregate({
        where: {
          job: jobWhere,
        },
        _sum: { sale: true, buy: true, cost: true, margin: true, saleUsd: true },
      }),
    ]);

    // Kamal Scoping: Filter out Shrikar completely from dataset
    const allUsers = isKamal
      ? rawAllUsers.filter((u) => u.email?.toLowerCase() !== "shrikar@siddhivinayaklogistics.co.in" && u.name?.toLowerCase() !== "shrikar")
      : rawAllUsers;

    const inquiriesInPeriod = isKamal
      ? rawInquiriesInPeriod.filter((i) => i.responsible?.email?.toLowerCase() !== "shrikar@siddhivinayaklogistics.co.in" && i.responsible?.name?.toLowerCase() !== "shrikar")
      : rawInquiriesInPeriod;

    const jobsInPeriod = isKamal
      ? rawJobsInPeriod.filter((j) => j.responsible?.email?.toLowerCase() !== "shrikar@siddhivinayaklogistics.co.in" && j.responsible?.name?.toLowerCase() !== "shrikar")
      : rawJobsInPeriod;

    // ─────────────────────────────────────────────
    // 1. LEAD CONVERSION METRICS
    // ─────────────────────────────────────────────
    const totalInquiries = inquiriesInPeriod.length;
    const bookedInquiries = inquiriesInPeriod.filter((i) => i.status === "BOOKED" || !!i.job).length;
    const rateSentInquiries = inquiriesInPeriod.filter((i) => i.rateSent).length;
    const closedInquiries = inquiriesInPeriod.filter((i) => i.status === "CLOSE").length;
    const inProcessInquiries = totalInquiries - bookedInquiries - closedInquiries;
    const overallConversionRate = totalInquiries > 0 ? Math.round((bookedInquiries / totalInquiries) * 100) : 0;
    const rateSentRate = totalInquiries > 0 ? Math.round((rateSentInquiries / totalInquiries) * 100) : 0;

    // Conversion by EXIM
    const eximCounts: Record<string, { total: number; booked: number }> = {};
    inquiriesInPeriod.forEach((i) => {
      const exim = i.exim || "EXP";
      if (!eximCounts[exim]) eximCounts[exim] = { total: 0, booked: 0 };
      eximCounts[exim].total += 1;
      if (i.status === "BOOKED" || i.job) eximCounts[exim].booked += 1;
    });

    const conversionByExim = Object.entries(eximCounts).map(([name, val]) => ({
      name: name === "EXP" ? "Exports" : name === "IMP" ? "Imports" : name,
      total: val.total,
      booked: val.booked,
      conversionRate: val.total > 0 ? Math.round((val.booked / val.total) * 100) : 0,
    }));

    // Conversion by Shipment Type (FCL/LCL/AIR)
    const typeCounts: Record<string, { total: number; booked: number }> = {};
    inquiriesInPeriod.forEach((i) => {
      const type = i.shipmentType || "FCL";
      if (!typeCounts[type]) typeCounts[type] = { total: 0, booked: 0 };
      typeCounts[type].total += 1;
      if (i.status === "BOOKED" || i.job) typeCounts[type].booked += 1;
    });

    const conversionByType = Object.entries(typeCounts).map(([name, val]) => ({
      name,
      total: val.total,
      booked: val.booked,
      conversionRate: val.total > 0 ? Math.round((val.booked / val.total) * 100) : 0,
    }));

    // Conversion by Top Customer
    const custCounts: Record<string, { name: string; total: number; booked: number }> = {};
    inquiriesInPeriod.forEach((i) => {
      const custName = i.customer?.name || "Other";
      if (!custCounts[custName]) custCounts[custName] = { name: custName, total: 0, booked: 0 };
      custCounts[custName].total += 1;
      if (i.status === "BOOKED" || i.job) custCounts[custName].booked += 1;
    });

    const topCustomerConversion = Object.values(custCounts)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((c) => ({
        ...c,
        conversionRate: c.total > 0 ? Math.round((c.booked / c.total) * 100) : 0,
      }));

    // ─────────────────────────────────────────────
    // 2. EMPLOYEE PERFORMANCE METRICS
    // ─────────────────────────────────────────────
    const employeePerformance = allUsers.map((u) => {
      const userInquiries = inquiriesInPeriod.filter((i) => i.responsibleId === u.id);
      const userJobs = jobsInPeriod.filter((j) => j.responsibleId === u.id);

      const inqTotal = userInquiries.length;
      const inqBooked = userInquiries.filter((i) => i.status === "BOOKED" || !!i.job).length;
      const inqRateSent = userInquiries.filter((i) => i.rateSent).length;
      const convRate = inqTotal > 0 ? Math.round((inqBooked / inqTotal) * 100) : 0;

      const jobsActive = userJobs.filter((j) => !j.isCompleted).length;
      const jobsCompleted = userJobs.filter((j) => j.isCompleted).length;

      let totalRevenueInr = 0;
      let totalRevenueUsd = 0;
      let totalCostInr = 0;
      let totalMarginInr = 0;

      userJobs.forEach((j) => {
        if (j.finance) {
          totalRevenueInr += Number(j.finance.sale || 0);
          totalRevenueUsd += Number(j.finance.saleUsd || 0);
          totalCostInr += Number(j.finance.buy || 0) + Number(j.finance.cost || 0);
          totalMarginInr += Number(j.finance.margin || 0);
        }
      });

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        inquiriesTotal: inqTotal,
        inquiriesBooked: inqBooked,
        inquiriesRateSent: inqRateSent,
        conversionRate: convRate,
        jobsTotal: userJobs.length,
        jobsActive,
        jobsCompleted,
        totalRevenueInr,
        totalRevenueUsd,
        totalCostInr,
        totalMarginInr,
      };
    });

    // ─────────────────────────────────────────────
    // 3. SHIPMENT SUMMARY (WITH FROM - TO DATE)
    // ─────────────────────────────────────────────
    const totalShipmentsInPeriod = jobsInPeriod.length;
    const completedShipmentsInPeriod = jobsInPeriod.filter((j) => j.isCompleted || j.currentStatus === "DELIVERED" || j.currentStatus === "COMPLETED").length;
    const activeShipmentsInPeriod = totalShipmentsInPeriod - completedShipmentsInPeriod;
    const invoicedShipmentsInPeriod = jobsInPeriod.filter((j) => j.invoiceStatus === "INVOICE_GENERATED" || j.finance?.invoiceStatus === "INVOICED").length;

    // Status breakdown
    const statusMap: Record<string, number> = {};
    jobsInPeriod.forEach((j) => {
      const st = j.currentStatus || "BOOKING_CONFIRMED";
      statusMap[st] = (statusMap[st] || 0) + 1;
    });
    const shipmentStatusDistribution = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // Carrier / Liner breakdown
    const linerMap: Record<string, number> = {};
    jobsInPeriod.forEach((j) => {
      const name = j.carrierName || j.liner?.name || "Other Carrier";
      linerMap[name] = (linerMap[name] || 0) + 1;
    });
    const carrierDistribution = Object.entries(linerMap)
      .map(([carrier, count]) => ({ carrier, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Shipment table rows
    const shipmentList = jobsInPeriod.map((j) => {
      const saleInr = Number(j.finance?.sale || 0);
      const saleUsd = Number(j.finance?.saleUsd || 0);
      const margin = Number(j.finance?.margin || 0);
      const buyInr = Number(j.finance?.buy || 0);

      return {
        id: j.id,
        jobId: j.jobId,
        partyName: j.partyName,
        consignee: j.consignee,
        shipper: j.shipper,
        pol: j.pol,
        pod: j.pod,
        carrier: j.carrierName || j.liner?.name || "—",
        vesselVoyage: j.vesselVoyage || "—",
        etd: j.etd,
        eta: j.eta,
        createdAt: j.createdAt,
        currentStatus: j.currentStatus,
        isCompleted: j.isCompleted,
        attentionFlag: j.attentionFlag,
        invoiceStatus: j.invoiceStatus || (j.finance?.invoiceStatus === "INVOICED" ? "INVOICE_GENERATED" : "INVOICE_NOT_GENERATED"),
        invoiceNo: j.invoiceNo || j.finance?.invoicingRef,
        responsible: j.responsible?.name || "—",
        saleUsd,
        saleInr,
        buyInr,
        margin,
      };
    });

    return NextResponse.json({
      timeframe,
      dateRange: {
        startDate: startDate ? startDate.toISOString() : "",
        endDate: endDate ? endDate.toISOString() : "",
        startFormatted: startDate ? startDate.toISOString().split("T")[0] : "",
        endFormatted: endDate ? endDate.toISOString().split("T")[0] : "",
      },
      canViewOverview,
      isSalesScoped,
      summary: {
        totalInquiries,
        bookedInquiries,
        overallConversionRate,
        totalShipments: totalShipmentsInPeriod,
        activeShipments: activeShipmentsInPeriod,
        completedShipments: completedShipmentsInPeriod,
        invoicedShipments: invoicedShipmentsInPeriod,
        allActiveJobsSystem: allActiveJobs,
        allOverdueJobsSystem: allOverdueJobs,
        revenueInr: canViewOverview ? Number(financeAggregates._sum.sale || 0) : 0,
        revenueUsd: canViewOverview ? Number(financeAggregates._sum.saleUsd || 0) : 0,
        costInr: canViewOverview ? (Number(financeAggregates._sum.buy || 0) + Number(financeAggregates._sum.cost || 0)) : 0,
        marginInr: canViewOverview ? Number(financeAggregates._sum.margin || 0) : 0,
      },
      leadConversion: {
        totalInquiries,
        bookedInquiries,
        rateSentInquiries,
        rateSentRate,
        closedInquiries,
        inProcessInquiries,
        overallConversionRate,
        conversionByExim,
        conversionByType,
        topCustomerConversion,
        inquiries: inquiriesInPeriod.map((i) => ({
          id: i.id,
          inquiryNo: i.inquiryNo,
          inquiryDate: i.inquiryDate,
          customer: i.customer?.name || "—",
          route: `${i.pol} → ${i.pod}`,
          exim: i.exim,
          shipmentType: i.shipmentType,
          rateSent: i.rateSent,
          quotedRate: i.quotedRate,
          status: i.status,
          responsible: i.responsible?.name || "—",
          jobId: i.job?.jobId || null,
        })),
      },
      employeePerformance,
      shipmentSummary: {
        total: totalShipmentsInPeriod,
        active: activeShipmentsInPeriod,
        completed: completedShipmentsInPeriod,
        invoiced: invoicedShipmentsInPeriod,
        statusDistribution: shipmentStatusDistribution,
        carrierDistribution,
        shipments: shipmentList,
      },
    });
  } catch (error: any) {
    console.error("Reports API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load reports" }, { status: 500 });
  }
}
