import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { parsePermissions, getDefaultPermissions, hasPermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role || "SALES";
  const userPerms = parsePermissions((session.user as any).permissions, role);

  if (role !== "ADMIN" && !hasPermission(userPerms, role, "users", "view")) {
    return NextResponse.json({ error: "Forbidden: Access denied to user management" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      status: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          inquiries: true,
          jobs: true,
          quotations: true,
        },
      },
    },
  });

  const formattedUsers = users.map((u) => ({
    ...u,
    permissionsMap: parsePermissions(u.permissions, u.role),
  }));

  return NextResponse.json({ items: formattedUsers });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role || "SALES";
  const userPerms = parsePermissions((session.user as any).permissions, role);

  if (role !== "ADMIN" && !hasPermission(userPerms, role, "users", "add")) {
    return NextResponse.json({ error: "Forbidden: No permission to create users" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role: newRole = "SALES", permissions, status = "ACTIVE" } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "User Name is required." }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail } },
    });

    if (existing) {
      return NextResponse.json({ error: `User with email "${cleanEmail}" already exists.` }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const permsObj = permissions || getDefaultPermissions(newRole);
    const permsJson = typeof permsObj === "string" ? permsObj : JSON.stringify(permsObj);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: newRole.toUpperCase(),
        permissions: permsJson,
        status,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user, message: "User account created successfully!" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
