import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const count = await prisma.inquiry.count({
    where: {
      followUpDate: { gte: startOfDay, lt: endOfDay },
      status: { not: "CLOSE" },
    },
  });

  return NextResponse.json({ count });
}
