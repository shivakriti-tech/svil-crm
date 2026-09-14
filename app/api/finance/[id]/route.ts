import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "ACCOUNTS") {
    return NextResponse.json({ error: "Only ADMIN and ACCOUNTS can edit finance" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const buy = body.buy !== undefined ? parseFloat(body.buy) : undefined;
  const sale = body.sale !== undefined ? parseFloat(body.sale) : undefined;
  const cost = body.cost !== undefined ? parseFloat(body.cost) : undefined;

  // Auto-calculate margin if any of the three change
  let margin: number | undefined;
  if (buy !== undefined || sale !== undefined || cost !== undefined) {
    const existing = await prisma.finance.findUnique({ where: { id } });
    const eBuy = buy ?? Number(existing?.buy ?? 0);
    const eSale = sale ?? Number(existing?.sale ?? 0);
    const eCost = cost ?? Number(existing?.cost ?? 0);
    margin = eSale - eBuy - eCost;
  }

  const updated = await prisma.finance.update({
    where: { id },
    data: {
      ...(buy !== undefined && { buy }),
      ...(sale !== undefined && { sale }),
      ...(cost !== undefined && { cost }),
      ...(margin !== undefined && { margin }),
      ...(body.invoicingRef !== undefined && { invoicingRef: body.invoicingRef }),
      ...(body.invoiceStatus && { invoiceStatus: body.invoiceStatus }),
      ...(body.courier !== undefined && { courier: body.courier }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
    include: {
      job: { select: { jobId: true, partyName: true } },
    },
  });

  return NextResponse.json(updated);
}
