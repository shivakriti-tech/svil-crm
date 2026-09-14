import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = (session.user as any)?.role || "SALES";
    const sessionUserId = (session.user as any)?.id;
    const sessionEmail = session.user?.email?.trim().toLowerCase();
    const sessionName = session.user?.name?.trim();
    const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER";

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const inqScope = {};
    const jobScope = {};
    const quoteScope = {};

    // Parallel queries
    const [
      totalInquiriesAllTime,
      inquiriesThisMonth,
      bookedThisMonth,
      totalBookedAllTime,
      rateSentCount,
      followUpsToday,
      totalJobsAllTime,
      activeJobs,
      completedJobs,
      overdueJobs,
      attentionJobs,
      jobsByStatus,
      recentJobs,
      allInquiries,
      allJobs,
      totalQuotations,
      quotationsThisMonth,
      upcomingFollowUps,
      // Admin/Finance specific queries
      financeAllTime,
      financeThisMonth,
      outstandingInvoices,
      allUsers,
    ] = await Promise.all([
      prisma.inquiry.count({ where: inqScope }),
      prisma.inquiry.count({ where: { ...inqScope, inquiryDate: { gte: startOfMonth, lt: endOfMonth } } }),
      prisma.inquiry.count({ where: { ...inqScope, inquiryDate: { gte: startOfMonth, lt: endOfMonth }, status: "BOOKED" } }),
      prisma.inquiry.count({ where: { ...inqScope, status: "BOOKED" } }),
      prisma.inquiry.count({ where: { ...inqScope, rateSent: true } }),
      prisma.inquiry.count({
        where: {
          ...inqScope,
          followUpDate: { gte: startOfToday, lte: endOfToday },
          status: { not: "CLOSE" },
        },
      }),
      prisma.job.count({ where: jobScope }),
      prisma.job.count({ where: { ...jobScope, isCompleted: false } }),
      prisma.job.count({ where: { ...jobScope, isCompleted: true } }),
      prisma.job.count({ where: { ...jobScope, isCompleted: false, eta: { lt: now }, currentStatus: { not: "DELIVERED" } } }),
      prisma.job.count({ where: { ...jobScope, attentionFlag: true, isCompleted: false } }),
      prisma.job.groupBy({
        by: ["currentStatus"],
        where: { ...jobScope, isCompleted: false },
        _count: { currentStatus: true },
      }),
      prisma.job.findMany({
        where: jobScope,
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          finance: { select: { sale: true, saleUsd: true, margin: true, invoiceStatus: true } },
          responsible: { select: { name: true } },
        },
      }),
      prisma.inquiry.findMany({
        where: inqScope,
        select: { id: true, inquiryDate: true, status: true, responsibleId: true },
      }),
      prisma.job.findMany({
        where: jobScope,
        select: { id: true, createdAt: true, isCompleted: true, responsibleId: true },
      }),
      prisma.quotation.count({ where: quoteScope }),
      prisma.quotation.count({ where: { ...quoteScope, date: { gte: startOfMonth, lt: endOfMonth } } }),
      prisma.inquiry.findMany({
        where: {
          ...inqScope,
          status: { not: "CLOSE" },
          followUpDate: { not: null },
        },
        orderBy: { followUpDate: "asc" },
        take: 5,
        include: { customer: { select: { name: true, phone: true } } },
      }),
      // Admin / Finance queries
      isAdminOrManager
        ? prisma.finance.aggregate({ _sum: { sale: true, buy: true, cost: true, margin: true, saleUsd: true } })
        : Promise.resolve({ _sum: { sale: 0, buy: 0, cost: 0, margin: 0, saleUsd: 0 } }),
      isAdminOrManager
        ? prisma.finance.aggregate({ where: { job: { createdAt: { gte: startOfMonth, lt: endOfMonth } } }, _sum: { sale: true, buy: true, cost: true, margin: true, saleUsd: true } })
        : Promise.resolve({ _sum: { sale: 0, buy: 0, cost: 0, margin: 0, saleUsd: 0 } }),
      isAdminOrManager
        ? prisma.finance.aggregate({ where: { invoiceStatus: { not: "PAID" } }, _sum: { sale: true } })
        : Promise.resolve({ _sum: { sale: 0 } }),
      isAdminOrManager
        ? prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: "asc" } })
        : Promise.resolve([]),
    ]);

    const conversionRateThisMonth = inquiriesThisMonth > 0
      ? Math.round((bookedThisMonth / inquiriesThisMonth) * 100)
      : 0;
    const conversionRateAllTime = totalInquiriesAllTime > 0
      ? Math.round((totalBookedAllTime / totalInquiriesAllTime) * 100)
      : 0;

    // Real Last 6 Months Trend Calculation
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mYear = d.getFullYear();
      const mMonth = d.getMonth();
      const mStart = new Date(mYear, mMonth, 1);
      const mEnd = new Date(mYear, mMonth + 1, 0, 23, 59, 59, 999);
      const label = `${monthNames[mMonth]} ${String(mYear).slice(2)}`;

      const inqCount = allInquiries.filter((inq) => {
        const idate = new Date(inq.inquiryDate);
        return idate >= mStart && idate <= mEnd;
      }).length;

      const jobCount = allJobs.filter((job) => {
        const jdate = new Date(job.createdAt);
        return jdate >= mStart && jdate <= mEnd;
      }).length;

      const bookedCount = allInquiries.filter((inq) => {
        const idate = new Date(inq.inquiryDate);
        return idate >= mStart && idate <= mEnd && inq.status === "BOOKED";
      }).length;

      trend.push({
        month: label,
        Inquiries: inqCount,
        Booked: bookedCount,
        Shipments: jobCount,
      });
    }

    // Team Members for Admin/Manager
    const team = allUsers.map((u) => {
      const uJobs = allJobs.filter((j) => j.responsibleId === u.id && !j.isCompleted).length;
      const uInq = allInquiries.filter((i) => i.responsibleId === u.id).length;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        activeJobs: uJobs,
        inquiries: uInq,
      };
    });

    return NextResponse.json({
      isScopedUser: !isAdminOrManager,
      userRole,
      userName: session.user?.name || "Team Member",
      inquiries: {
        totalAllTime: totalInquiriesAllTime,
        thisMonth: inquiriesThisMonth,
        booked: bookedThisMonth,
        totalBookedAllTime,
        conversionRate: conversionRateThisMonth,
        conversionRateAllTime,
        rateSentCount,
        followUpsToday,
      },
      jobs: {
        total: totalJobsAllTime,
        active: activeJobs,
        completed: completedJobs,
        overdue: overdueJobs,
        attention: attentionJobs,
        byStatus: jobsByStatus,
        recent: recentJobs.map((j) => ({
          id: j.id,
          jobId: j.jobId,
          partyName: j.partyName,
          consignee: j.consignee,
          pol: j.pol,
          pod: j.pod,
          currentStatus: j.currentStatus,
          isCompleted: j.isCompleted,
          createdAt: j.createdAt,
          eta: j.eta,
          responsible: j.responsible?.name || "—",
          saleInr: Number(j.finance?.sale || 0),
          saleUsd: Number(j.finance?.saleUsd || 0),
          margin: Number(j.finance?.margin || 0),
          invoiceStatus: j.invoiceStatus || (j.finance?.invoiceStatus === "INVOICED" ? "INVOICE_GENERATED" : "INVOICE_NOT_GENERATED"),
        })),
      },
      quotations: {
        total: totalQuotations,
        thisMonth: quotationsThisMonth,
      },
      upcomingFollowUps: upcomingFollowUps.map((u) => ({
        id: u.id,
        inquiryNo: u.inquiryNo,
        customerName: u.customer?.name || "Client",
        phone: u.customer?.phone || "—",
        pol: u.pol,
        pod: u.pod,
        followUpDate: u.followUpDate,
        commodity: u.commodity,
        quotedRate: u.quotedRate,
      })),
      finance: isAdminOrManager
        ? {
            revenue: Number(financeAllTime._sum.sale ?? 0),
            revenueThisMonth: Number(financeThisMonth._sum.sale ?? 0),
            revenueUsd: Number(financeAllTime._sum.saleUsd ?? 0),
            cost: Number(financeAllTime._sum.cost ?? 0) + Number(financeAllTime._sum.buy ?? 0),
            margin: Number(financeAllTime._sum.margin ?? 0),
            marginThisMonth: Number(financeThisMonth._sum.margin ?? 0),
            outstanding: Number(outstandingInvoices._sum.sale ?? 0),
          }
        : null,
      trend,
      team,
    });
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard stats" }, { status: 500 });
  }
}
