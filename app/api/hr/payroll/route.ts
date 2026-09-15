import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetMonth = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const [yearStr, monthStr] = targetMonth.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum - 1, daysInMonth, 23, 59, 59, 999);

  const role = (session.user as any)?.role || "SALES";
  const userEmail = session.user.email?.toLowerCase().trim();
  const userName = session.user.name?.trim();
  const isHRAdmin = role === "ADMIN" || role === "MANAGER" || role === "FINANCE" || userEmail === "devika@siddhivinayaklogistics.co.in";

  const empWhere: any = !isHRAdmin
    ? {
        OR: [
          ...(userEmail ? [{ profile: { email: { equals: userEmail } } }] : []),
          ...(userName ? [{ name: { equals: userName } }] : []),
        ],
      }
    : {};

  // Fetch all employees and existing payroll records
  const [employees, existingPayrolls, monthlyAttendances] = await Promise.all([
    prisma.employee.findMany({
      where: empWhere,
      include: { profile: true },
      orderBy: { name: "asc" },
    }),
    prisma.payroll.findMany({
      where: { month: targetMonth },
      include: { employee: { include: { profile: true } } },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: startDate, lte: endDate } },
    }),
  ]);

  const payrollMap = new Map(existingPayrolls.map((p) => [p.employeeId, p]));

  // Calculate attendance count per employee
  const attendanceStats: Record<string, { present: number; absent: number; halfDay: number; leave: number }> = {};
  for (const a of monthlyAttendances) {
    if (!attendanceStats[a.employeeId]) {
      attendanceStats[a.employeeId] = { present: 0, absent: 0, halfDay: 0, leave: 0 };
    }
    if (a.status === "PRESENT") attendanceStats[a.employeeId].present++;
    else if (a.status === "ABSENT") attendanceStats[a.employeeId].absent++;
    else if (a.status === "HALF_DAY") attendanceStats[a.employeeId].halfDay++;
    else if (a.status === "ON_LEAVE") attendanceStats[a.employeeId].leave++;
  }

  let totalGross = 0;
  let totalNet = 0;
  let totalPaid = 0;
  let totalPending = 0;
  let paidCount = 0;
  let pendingCount = 0;

  const items = employees.map((emp) => {
    const existing = payrollMap.get(emp.id);
    const profile = emp.profile;
    const base = Number(profile?.basicSalary || 25000);
    const gross = base;

    const stats = attendanceStats[emp.id] || { present: daysInMonth, absent: 0, halfDay: 0, leave: 0 };
    const presentDays = existing ? existing.presentDays : stats.present;
    const absentDays = existing ? existing.absentDays : stats.absent;
    const halfDays = existing ? existing.halfDays : stats.halfDay;
    const payableDays = existing ? existing.paidDays : (presentDays + (halfDays * 0.5) + stats.leave);

    // Calculate per-day rate for absent deduction
    const perDayRate = gross / daysInMonth;
    const absentDeduction = existing ? existing.absentDeduction : Math.round(absentDays * perDayRate + (halfDays * 0.5 * perDayRate));
    const pfDeduction = existing ? existing.pfDeduction : (profile?.pfDeduction !== undefined && profile?.pfDeduction !== null ? Number(profile.pfDeduction) : 0);
    const taxDeduction = existing ? existing.taxDeduction : Number(profile?.taxDeduction || 0);
    const bonus = existing ? existing.bonusIncentive : 0;
    const otherDed = existing ? existing.otherDeduction : 0;

    const totalDeductions = absentDeduction + pfDeduction + taxDeduction + otherDed;
    const calculatedNet = Math.max(0, Math.round(gross + bonus - totalDeductions));
    const net = existing ? existing.netSalary : calculatedNet;

    const status = existing ? existing.paymentStatus : "PENDING";
    const paymentMode = existing ? existing.paymentMode : "BANK_TRANSFER";

    totalGross += gross;
    totalNet += net;
    if (status === "PAID") {
      totalPaid += net;
      paidCount++;
    } else {
      totalPending += net;
      pendingCount++;
    }

    return {
      payrollId: existing?.id || null,
      employeeId: emp.id,
      employeeName: emp.name,
      employeeCode: profile?.employeeCode || `SV-${emp.name.slice(0, 3).toUpperCase()}`,
      designation: profile?.designation || "Logistics Staff",
      department: profile?.department || "Operations",
      bankName: profile?.bankName || "",
      bankAccountNo: profile?.bankAccountNo || "",
      ifscCode: profile?.ifscCode || "",
      panNo: profile?.panNo || "",
      workingDays: daysInMonth,
      presentDays,
      absentDays,
      halfDays,
      paidDays: payableDays,
      basicSalary: base,
      hra: 0,
      allowances: 0,
      bonusIncentive: bonus,
      grossSalary: gross,
      absentDeduction,
      pfDeduction,
      taxDeduction,
      otherDeduction: otherDed,
      totalDeductions,
      netSalary: net,
      paymentStatus: status,
      paymentMode,
      paymentDate: existing?.paymentDate || null,
      transactionRef: existing?.transactionRef || "",
      remarks: existing?.remarks || "",
    };
  });

  return NextResponse.json({
    month: targetMonth,
    daysInMonth,
    items,
    summary: {
      totalEmployees: employees.length,
      totalGross,
      totalNet,
      totalPaid,
      totalPending,
      paidCount,
      pendingCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role || "SALES";
  const userEmail = session.user.email?.toLowerCase().trim();
  const isHRAdmin = role === "ADMIN" || role === "MANAGER" || role === "FINANCE" || userEmail === "devika@siddhivinayaklogistics.co.in";
  if (!isHRAdmin) {
    return NextResponse.json({ error: "Only Admin, Manager, or Finance (Devika) can modify payroll records" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, month, payrolls, employeeId, paymentStatus, paymentMode, bonusIncentive, otherDeduction, transactionRef, remarks } = body;

    if (!month) return NextResponse.json({ error: "Month is required" }, { status: 400 });

    // Mode 1: Bulk Save / Process All Payroll Records
    if (action === "SAVE_ALL" && Array.isArray(payrolls)) {
      const operations = payrolls.map((p: any) =>
        prisma.payroll.upsert({
          where: {
            employeeId_month: {
              employeeId: p.employeeId,
              month,
            },
          },
          update: {
            workingDays: Number(p.workingDays || 30),
            presentDays: Number(p.presentDays || 0),
            absentDays: Number(p.absentDays || 0),
            halfDays: Number(p.halfDays || 0),
            paidDays: Number(p.paidDays || 0),
            basicSalary: Number(p.basicSalary || 0),
            hra: Number(p.hra || 0),
            allowances: Number(p.allowances || 0),
            bonusIncentive: Number(p.bonusIncentive || 0),
            grossSalary: Number(p.grossSalary || 0),
            absentDeduction: Number(p.absentDeduction || 0),
            pfDeduction: Number(p.pfDeduction || 0),
            taxDeduction: Number(p.taxDeduction || 0),
            otherDeduction: Number(p.otherDeduction || 0),
            totalDeductions: Number(p.totalDeductions || 0),
            netSalary: Number(p.netSalary || 0),
            paymentStatus: p.paymentStatus || "PENDING",
            paymentMode: p.paymentMode || "BANK_TRANSFER",
            transactionRef: p.transactionRef || null,
            remarks: p.remarks || null,
          },
          create: {
            employeeId: p.employeeId,
            month,
            workingDays: Number(p.workingDays || 30),
            presentDays: Number(p.presentDays || 0),
            absentDays: Number(p.absentDays || 0),
            halfDays: Number(p.halfDays || 0),
            paidDays: Number(p.paidDays || 0),
            basicSalary: Number(p.basicSalary || 0),
            hra: Number(p.hra || 0),
            allowances: Number(p.allowances || 0),
            bonusIncentive: Number(p.bonusIncentive || 0),
            grossSalary: Number(p.grossSalary || 0),
            absentDeduction: Number(p.absentDeduction || 0),
            pfDeduction: Number(p.pfDeduction || 0),
            taxDeduction: Number(p.taxDeduction || 0),
            otherDeduction: Number(p.otherDeduction || 0),
            totalDeductions: Number(p.totalDeductions || 0),
            netSalary: Number(p.netSalary || 0),
            paymentStatus: p.paymentStatus || "PENDING",
            paymentMode: p.paymentMode || "BANK_TRANSFER",
            transactionRef: p.transactionRef || null,
            remarks: p.remarks || null,
          },
        })
      );

      await prisma.$transaction(operations);
      return NextResponse.json({ success: true, count: operations.length });
    }

    // Mode 2: Single Employee Payroll Update (e.g. mark Paid, update bonus)
    if (!employeeId) return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });

    const updateData: any = {};
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentStatus === "PAID") updateData.paymentDate = new Date();
    if (paymentMode) updateData.paymentMode = paymentMode;
    if (bonusIncentive !== undefined) updateData.bonusIncentive = Number(bonusIncentive);
    if (otherDeduction !== undefined) updateData.otherDeduction = Number(otherDeduction);
    if (transactionRef !== undefined) updateData.transactionRef = transactionRef;
    if (remarks !== undefined) updateData.remarks = remarks;

    const updated = await prisma.payroll.upsert({
      where: {
        employeeId_month: {
          employeeId,
          month,
        },
      },
      update: updateData,
      create: {
        employeeId,
        month,
        ...updateData,
      },
    });

    return NextResponse.json({ success: true, payroll: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process payroll" }, { status: 500 });
  }
}
