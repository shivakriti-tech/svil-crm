import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role || "SALES";
  const userEmail = session.user.email?.toLowerCase().trim();
  const userName = session.user.name?.trim();
  const isHRAdmin = role === "ADMIN" || role === "MANAGER" || role === "FINANCE" || userEmail === "devika@siddhivinayaklogistics.co.in";

  // Non-admin / regular employees only see their own profile
  const where: any = !isHRAdmin
    ? {
        OR: [
          ...(userEmail ? [{ profile: { email: { equals: userEmail } } }] : []),
          ...(userName ? [{ name: { equals: userName } }] : []),
        ],
      }
    : {};

  const employees = await prisma.employee.findMany({
    where,
    include: {
      profile: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ items: employees, isScoped: !isHRAdmin });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any)?.role || "SALES";
  const userEmail = session.user.email?.toLowerCase().trim();
  const isHRAdmin = role === "ADMIN" || role === "MANAGER" || role === "FINANCE" || userEmail === "devika@siddhivinayaklogistics.co.in";
  if (!isHRAdmin) {
    return NextResponse.json({ error: "Only Admin, Manager, or Finance (Devika) can create or edit employee master records" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      employeeId,
      name,
      employeeCode,
      designation,
      department,
      dateOfJoining,
      phone,
      email,
      address,
      panNo,
      aadharNo,
      bankName,
      bankAccountNo,
      ifscCode,
      branchName,
      basicSalary = 0,
      hra = 0,
      conveyance = 0,
      allowances = 0,
      pfDeduction = 0,
      taxDeduction = 0,
      status = "ACTIVE",
    } = body;

    let targetEmployeeId = employeeId;

    // If new employee without ID
    if (!targetEmployeeId) {
      if (!name) return NextResponse.json({ error: "Employee Name is required" }, { status: 400 });
      const emp = await prisma.employee.create({
        data: { name },
      });
      targetEmployeeId = emp.id;
    } else if (name) {
      await prisma.employee.update({
        where: { id: targetEmployeeId },
        data: { name },
      });
    }

    const base = Number(basicSalary || 0);
    const pf = Number(pfDeduction || 0);
    const tax = Number(taxDeduction || 0);
    const netSalary = Math.max(0, base - pf - tax);

    const profileData = {
      employeeCode,
      designation,
      department,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
      phone,
      email,
      address,
      panNo,
      aadharNo,
      bankName,
      bankAccountNo,
      ifscCode,
      branchName,
      basicSalary: base,
      hra: 0,
      conveyance: 0,
      allowances: 0,
      pfDeduction: pf,
      taxDeduction: tax,
      netSalary,
      status,
    };

    const profile = await prisma.employeeProfile.upsert({
      where: { employeeId: targetEmployeeId },
      update: profileData,
      create: {
        employeeId: targetEmployeeId,
        ...profileData,
      },
    });

    const updatedEmployee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: { profile: true },
    });

    return NextResponse.json({ employee: updatedEmployee, profile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save employee profile" }, { status: 500 });
  }
}
