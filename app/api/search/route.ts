import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ jobs: [], inquiries: [], customers: [] });
    }

    // Convert numeric query for inquiryNo matching
    const inqNum = parseInt(query);

    // Parallel lookup across Jobs, Inquiries, Customers
    const [jobs, inquiries, customers] = await Promise.all([
      prisma.job.findMany({
        where: {
          OR: [
            { jobId: { contains: query } },
            { legacyJobId: { contains: query } },
            { partyName: { contains: query } },
            { hblNo: { contains: query } },
            { mblNo: { contains: query } },
            { pol: { contains: query } },
            { pod: { contains: query } },
          ],
        },
        take: 6,
        select: {
          id: true,
          jobId: true,
          legacyJobId: true,
          partyName: true,
          pol: true,
          pod: true,
          currentStatus: true,
        },
      }),

      prisma.inquiry.findMany({
        where: {
          OR: [
            ...(isNaN(inqNum) ? [] : [{ inquiryNo: inqNum }]),
            { customer: { name: { contains: query } } },
            { contactPerson: { contains: query } },
            { pol: { contains: query } },
            { pod: { contains: query } },
          ],
        },
        take: 6,
        select: {
          id: true,
          inquiryNo: true,
          pol: true,
          pod: true,
          status: true,
          customer: { select: { name: true } },
        },
      }),

      prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { contactPerson: { contains: query } },
            { email: { contains: query } },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          contactPerson: true,
          email: true,
        },
      }),
    ]);

    return NextResponse.json({ jobs, inquiries, customers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
