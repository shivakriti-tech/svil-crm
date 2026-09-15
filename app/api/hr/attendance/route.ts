import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date"); // e.g. "2026-08-24"
  const monthParam = searchParams.get("month"); // e.g. "2026-08"

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

  const employees = await prisma.employee.findMany({
    where: empWhere,
    include: { profile: true },
    orderBy: { name: "asc" },
  });

  // Mode 1: Daily Attendance Sheet for specific date
  if (dateParam) {
    const attendances = await prisma.attendance.findMany({
      where: { dateString: dateParam },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.employeeId, a]));

    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let onLeaveCount = 0;

    const items = employees.map((emp) => {
      const att = attendanceMap.get(emp.id);
      const status = att?.status || "UNMARKED";
      if (status === "PRESENT") presentCount++;
      else if (status === "ABSENT") absentCount++;
      else if (status === "HALF_DAY") halfDayCount++;
      else if (status === "ON_LEAVE") onLeaveCount++;

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.profile?.designation || "Staff",
        department: emp.profile?.department || "General",
        status: att?.status || "UNMARKED",
        checkIn: att?.checkIn || "",
        checkOut: att?.checkOut || "",
        overtimeHours: att?.overtimeHours || 0,
        remarks: att?.remarks || "",
        attendanceId: att?.id || null,
      };
    });

    return NextResponse.json({
      date: dateParam,
      items,
      summary: {
        totalEmployees: employees.length,
        presentCount,
        absentCount,
        halfDayCount,
        onLeaveCount,
        unmarkedCount: employees.length - (presentCount + absentCount + halfDayCount + onLeaveCount),
      },
    });
  }

  // Mode 2: Monthly Matrix & Summary for specific month
  const targetMonth = monthParam || new Date().toISOString().slice(0, 7);
  const [yearStr, monthStr] = targetMonth.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);

  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startDate = new Date(year, monthNum - 1, 1);
  const endDate = new Date(year, monthNum - 1, daysInMonth, 23, 59, 59, 999);

  const monthlyAttendances = await prisma.attendance.findMany({
    where: {
      date: { gte: startDate, lte: endDate },
    },
  });

  // Map by `${employeeId}_${day}`
  const matrixMap: Record<string, string> = {};
  monthlyAttendances.forEach((a) => {
    const day = new Date(a.date).getDate();
    matrixMap[`${a.employeeId}_${day}`] = a.status;
  });

  const matrix = employees.map((emp) => {
    const days: Record<number, string> = {};
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let leave = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const st = matrixMap[`${emp.id}_${d}`] || "—";
      days[d] = st;
      if (st === "PRESENT") present++;
      else if (st === "ABSENT") absent++;
      else if (st === "HALF_DAY") halfDay++;
      else if (st === "ON_LEAVE") leave++;
    }

    const payableDays = present + halfDay * 0.5 + leave;
    const rate = daysInMonth > 0 ? ((payableDays / daysInMonth) * 100).toFixed(1) : "0.0";

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      designation: emp.profile?.designation || "Staff",
      department: emp.profile?.department || "General",
      days,
      present,
      absent,
      halfDay,
      leave,
      payableDays,
      attendanceRate: `${rate}%`,
    };
  });

  return NextResponse.json({
    month: targetMonth,
    daysInMonth,
    matrix,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, date, records } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    const attendanceDate = new Date(`${date}T12:00:00.000Z`);

    // Bulk Action 1: Mark All Present
    if (action === "MARK_ALL_PRESENT") {
      const employees = await prisma.employee.findMany();
      const updates = employees.map((emp) =>
        prisma.attendance.upsert({
          where: {
            employeeId_dateString: {
              employeeId: emp.id,
              dateString: date,
            },
          },
          update: {
            status: "PRESENT",
            checkIn: "09:30 AM",
            checkOut: "06:30 PM",
            date: attendanceDate,
          },
          create: {
            employeeId: emp.id,
            date: attendanceDate,
            dateString: date,
            status: "PRESENT",
            checkIn: "09:30 AM",
            checkOut: "06:30 PM",
          },
        })
      );
      await prisma.$transaction(updates);
      return NextResponse.json({ success: true, count: updates.length });
    }

    // Bulk Action 2: Update array of records
    if (Array.isArray(records)) {
      const updates = records.map((r: any) =>
        prisma.attendance.upsert({
          where: {
            employeeId_dateString: {
              employeeId: r.employeeId,
              dateString: date,
            },
          },
          update: {
            status: r.status || "PRESENT",
            checkIn: r.checkIn ?? null,
            checkOut: r.checkOut ?? null,
            overtimeHours: Number(r.overtimeHours || 0),
            remarks: r.remarks ?? null,
            date: attendanceDate,
          },
          create: {
            employeeId: r.employeeId,
            date: attendanceDate,
            dateString: date,
            status: r.status || "PRESENT",
            checkIn: r.checkIn ?? null,
            checkOut: r.checkOut ?? null,
            overtimeHours: Number(r.overtimeHours || 0),
            remarks: r.remarks ?? null,
          },
        })
      );
      await prisma.$transaction(updates);
      return NextResponse.json({ success: true, count: updates.length });
    }

    // Single Record Update
    const { employeeId, status, checkIn, checkOut, overtimeHours, remarks } = body;
    if (!employeeId) return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_dateString: {
          employeeId,
          dateString: date,
        },
      },
      update: {
        status: status || "PRESENT",
        checkIn: checkIn ?? null,
        checkOut: checkOut ?? null,
        overtimeHours: Number(overtimeHours || 0),
        remarks: remarks ?? null,
        date: attendanceDate,
      },
      create: {
        employeeId,
        date: attendanceDate,
        dateString: date,
        status: status || "PRESENT",
        checkIn: checkIn ?? null,
        checkOut: checkOut ?? null,
        overtimeHours: Number(overtimeHours || 0),
        remarks: remarks ?? null,
      },
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update attendance" }, { status: 500 });
  }
}
