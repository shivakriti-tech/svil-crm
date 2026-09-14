import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";
import { parsePermissions, hasPermission } from "@/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const currentRole = (session.user as any).role || "SALES";
  const userPerms = parsePermissions((session.user as any).permissions, currentRole);

  if (currentRole !== "ADMIN" && !hasPermission(userPerms, currentRole, "users", "edit")) {
    return NextResponse.json({ error: "Forbidden: No permission to edit users" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role, permissions, status } = body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (name && name.trim()) updateData.name = name.trim();

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== existingUser.email.toLowerCase()) {
        const dup = await prisma.user.findFirst({
          where: { email: { equals: cleanEmail }, NOT: { id } },
        });
        if (dup) {
          return NextResponse.json({ error: `Email "${cleanEmail}" is already used by another user.` }, { status: 409 });
        }
        updateData.email = cleanEmail;
      }
    }

    if (password && password.trim()) {
      if (password.trim().length < 4) {
        return NextResponse.json({ error: "Password must be at least 4 characters." }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    if (role) updateData.role = role.toUpperCase();
    if (status) updateData.status = status;

    if (permissions !== undefined) {
      updateData.permissions = typeof permissions === "string" ? permissions : JSON.stringify(permissions);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        status: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updated, message: "User updated successfully!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const currentRole = (session.user as any).role || "SALES";
  const userPerms = parsePermissions((session.user as any).permissions, currentRole);

  if (currentRole !== "ADMIN" && !hasPermission(userPerms, currentRole, "users", "delete")) {
    return NextResponse.json({ error: "Forbidden: No permission to delete users" }, { status: 403 });
  }

  // Prevent deleting self
  if (session.user.id === id) {
    return NextResponse.json({ error: "You cannot delete your own logged-in account!" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "User account deleted successfully!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete user" }, { status: 500 });
  }
}
