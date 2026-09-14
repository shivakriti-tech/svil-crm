import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Employee name normalization map
const EMPLOYEE_MAP: Record<string, string> = {
  "chirag bhai": "Chirag",
  "chirag": "Chirag",
  "shrikar bhai": "Shrikar",
  "shrikar": "Shrikar",
  "kamal bhai": "Kamal",
  "kamal": "Kamal",
  "jinal": "Jinal",
  "aafrin": "Aafrin",
  "dhruvee": "Dhruvee",
  "dhruvi": "Dhruvee",
  "ankur": "Ankur",
  "yash": "Yash",
  "yogesh": "Yogesh",
  "urvish": "Urvish",
  "devika": "Devika",
};

function normalizeEmployee(raw: string): string {
  if (!raw || !raw.trim()) return "Chirag";
  const cleaned = raw.trim().toLowerCase();
  return EMPLOYEE_MAP[cleaned] ?? raw.trim();
}

// Excel serial date to JS Date
function excelDateToJsDate(serial: number): Date {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

function parseDate(val: any): Date | null {
  if (!val) return null;
  if (typeof val === "number") return excelDateToJsDate(val);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed || trimmed === "#ERROR!" || trimmed === "-") return null;
    // Handle DD.MM.YYYY or DD/MM/YYYY
    const ddmmyyyy = trimmed.match(/(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1]);
      const month = parseInt(ddmmyyyy[2]);
      const year = parseInt(ddmmyyyy[3]);
      return new Date(year, month - 1, day);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseDecimal(val: any): number {
  if (!val) return 0;
  const str = String(val).replace(/[^\d.-]/g, "");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// Map inquiry status strings
function mapInquiryStatus(raw: string): string {
  const map: Record<string, string> = {
    "close": "CLOSE",
    "in process": "IN_PROCESS",
    "inprocess": "IN_PROCESS",
    "booked": "BOOKED",
    "no service": "NO_SERVICE",
    "rate na": "RATE_NOT_GIVEN",
    "rate not given": "RATE_NOT_GIVEN",
    "rate unmatched": "RATE_UNMATCHED",
    "cargo not ready": "CARGO_NOT_READY",
    "vessel missed": "VESSEL_MISSED",
    "shift nd": "SHIFT_NEXT_DATE",
    "shift next date": "SHIFT_NEXT_DATE",
    "next month end final": "SHIFT_NEXT_DATE",
    "remark": "REMARK",
  };
  const key = raw?.trim()?.toLowerCase();
  return map[key] ?? "IN_PROCESS";
}

function mapEximType(raw: string): string {
  const map: Record<string, string> = {
    "ex": "EX", "export": "EX",
    "im": "IM", "import": "IM",
    "exim": "EXIM",
    "trns": "Trns", "transshipment": "Trns",
    "clr": "Clr", "clearance": "Clr",
    "c_t": "C_T", "ct": "C_T",
  };
  return map[raw?.trim()?.toLowerCase()] ?? "EX";
}

function mapShipmentType(raw: string): string {
  const r = raw?.trim()?.toUpperCase();
  if (!r) return "FCL";
  if (r.includes("LCL")) return "LCL";
  if (r.includes("AIR")) return "Air";
  return "FCL";
}

function mapJobStatus(raw: string): string {
  const r = raw?.trim()?.toLowerCase();
  if (!r) return "BOOKING_CONFIRMED";
  if (r.includes("vessel sail") || r.includes("sailed")) return "VESSEL_SAILED";
  if (r.includes("transit")) return "IN_TRANSIT";
  if (r.includes("arrived") || r.includes("pod") || r.includes("destination")) return "ARRIVED_AT_POD";
  if (r.includes("custom") || r.includes("clearance")) return "CUSTOMS_CLEARANCE";
  if (r.includes("delivered") || r.includes("delivery in process")) return "DELIVERED";
  if (r.includes("complet")) return "COMPLETED";
  if (r.includes("gate") || r.includes("cargo")) return "CARGO_GATE_IN";
  if (r.includes("warehouse")) return "CARGO_GATE_IN";
  if (r.includes("hold")) return "BOOKING_CONFIRMED";
  return "BOOKING_CONFIRMED";
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can run migration" }, { status: 403 });
  }

  // In-memory caches to prevent repetitive DB queries
  const customerCache = new Map<string, any>();
  const linerCache = new Map<string, any>();
  const chaCache = new Map<string, any>();
  const userCache = new Map<string, any>();

  // Pre-fill userCache with existing users
  try {
    const existingUsers = await prisma.user.findMany();
    for (const u of existingUsers) {
      userCache.set(u.name.toLowerCase().trim(), u);
      if (u.email) userCache.set(u.email.toLowerCase().trim(), u);
    }
  } catch (e) {}

  const defaultAdmin = Array.from(userCache.values()).find((u) => u.role === "ADMIN") ||
    await prisma.user.findFirst({ where: { role: "ADMIN" } });

  // Pre-fill Customer, Liner, CHA caches
  try {
    const existingCustomers = await prisma.customer.findMany();
    for (const c of existingCustomers) customerCache.set(c.name.toLowerCase().trim(), c);

    const existingLiners = await prisma.liner.findMany();
    for (const l of existingLiners) linerCache.set(l.name.toLowerCase().trim(), l);

    const existingCHAs = await prisma.cHA.findMany();
    for (const cha of existingCHAs) chaCache.set(cha.name.toLowerCase().trim(), cha);
  } catch (e) {}

  async function getCustomer(name: string) {
    if (!name?.trim()) return null;
    const n = name.trim();
    const key = n.toLowerCase();
    if (customerCache.has(key)) return customerCache.get(key);

    let customer = await prisma.customer.findFirst({ where: { name: { equals: n } } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: n } });
    }
    customerCache.set(key, customer);
    return customer;
  }

  async function getLiner(name: string) {
    if (!name?.trim()) return null;
    const n = name.trim();
    const key = n.toLowerCase();
    if (linerCache.has(key)) return linerCache.get(key);

    let liner = await prisma.liner.findFirst({ where: { name: { equals: n } } });
    if (!liner) {
      liner = await prisma.liner.create({ data: { name: n } });
    }
    linerCache.set(key, liner);
    return liner;
  }

  async function getCHA(name: string) {
    if (!name?.trim()) return null;
    const n = name.trim();
    const key = n.toLowerCase();
    if (chaCache.has(key)) return chaCache.get(key);

    let cha = await prisma.cHA.findFirst({ where: { name: { equals: n } } });
    if (!cha) {
      cha = await prisma.cHA.create({ data: { name: n } });
    }
    chaCache.set(key, cha);
    return cha;
  }

  function getResponsible(name: string) {
    if (!name?.trim()) return defaultAdmin;
    const normalized = normalizeEmployee(name).toLowerCase();
    return userCache.get(normalized) ?? defaultAdmin;
  }

  // Next Job ID Generator
  let migrationJobCounter = 0;
  async function getNextJobId(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    if (migrationJobCounter === 0) {
      const lastJob = await prisma.job.findFirst({
        where: { jobId: { startsWith: "SVIL" } },
        orderBy: { jobId: "desc" },
      });
      if (lastJob?.jobId) {
        const match = lastJob.jobId.match(/SVIL\d{2}-(\d{5})/);
        if (match) migrationJobCounter = parseInt(match[1]);
      }
    }
    migrationJobCounter++;
    return `SVIL${year}-${String(migrationJobCounter).padStart(5, "0")}`;
  }

  // Next Inquiry Number Generator
  let maxInqNo = 0;
  const lastInquiry = await prisma.inquiry.findFirst({ orderBy: { inquiryNo: "desc" } });
  if (lastInquiry?.inquiryNo) maxInqNo = lastInquiry.inquiryNo;

  const XLSX = await import("xlsx");
  const formData = await req.formData();
  const results: any = {
    files: [],
    inquiriesCreated: 0,
    inquiriesUpdated: 0,
    jobsCreated: 0,
    jobsUpdated: 0,
    errors: [],
    warnings: [],
  };

  // Helper to check if a row is completely empty
  const isRowEmpty = (row: any[]) => !row || row.every((c) => c === null || c === undefined || String(c).trim() === "");

  // ─────────────────────────────────────────────
  // 1. PARSE ENQUIRY TRACKING (ALL SHEETS)
  // ─────────────────────────────────────────────
  const enquiryFile = formData.get("enquiry") as File | null;
  if (enquiryFile) {
    let rowsProcessed = 0;
    const buffer = await enquiryFile.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) continue;

      // Find header row or use index
      let startRow = 1;
      // Check if first row is header
      const firstRowStr = rows[0]?.map((c) => String(c).toLowerCase()).join(" ");
      if (firstRowStr.includes("inquiry") || firstRowStr.includes("customer") || firstRowStr.includes("company") || firstRowStr.includes("pol")) {
        startRow = 1;
      }

      for (let i = startRow; i < rows.length; i++) {
        const r = rows[i];
        if (isRowEmpty(r)) continue;

        // Extract customer name (usually col 2 or col 1)
        const customerName = String(r[2] || r[1] || "").trim();
        if (!customerName || customerName.toLowerCase().includes("customer name") || customerName.toLowerCase().includes("total")) {
          continue;
        }

        rowsProcessed++;

        try {
          const customer = await getCustomer(customerName);
          if (!customer) continue;

          const empName = String(r[16] || r[15] || "").trim();
          const responsible = getResponsible(empName);

          const shippingLineName = String(r[12] || "").trim();
          const liner = shippingLineName ? await getLiner(shippingLineName) : null;

          const inquiryDate = parseDate(r[1]) ?? new Date();
          const followUpDate = parseDate(r[18]);

          // Determine inquiryNo safely
          let parsedNo = parseInt(String(r[0]));
          let inqNo = !isNaN(parsedNo) && parsedNo > 0 ? parsedNo : ++maxInqNo;

          // Check if this inqNo is already in use
          const existingInq = await prisma.inquiry.findUnique({ where: { inquiryNo: inqNo } });
          if (existingInq) {
            // Update existing or assign unique if it belongs to different customer/date
            if (existingInq.customerId === customer.id) {
              await prisma.inquiry.update({
                where: { id: existingInq.id },
                data: {
                  inquiryDate,
                  contactPerson: String(r[3] || "").trim() || existingInq.contactPerson,
                  phoneEmail: String(r[4] || "").trim() || existingInq.phoneEmail,
                  pol: String(r[5] || "").trim() || existingInq.pol,
                  pod: String(r[6] || "").trim() || existingInq.pod,
                  commodity: String(r[7] || "").trim() || existingInq.commodity,
                  exim: mapEximType(String(r[8] || existingInq.exim)),
                  shipmentType: mapShipmentType(String(r[9] || existingInq.shipmentType)),
                  containerVolume: String(r[10] || "").trim() || existingInq.containerVolume,
                  weightKgs: String(r[11] || "").trim() || existingInq.weightKgs,
                  shippingLineId: liner?.id || existingInq.shippingLineId,
                  rateSent: String(r[13] || "").toLowerCase() === "yes" || existingInq.rateSent,
                  quotedRate: String(r[14] || "").trim() || existingInq.quotedRate,
                  status: mapInquiryStatus(String(r[15] || existingInq.status)),
                  responsibleId: responsible?.id || existingInq.responsibleId,
                  remarks: String(r[17] || "").trim() || existingInq.remarks,
                  followUpDate: followUpDate ?? existingInq.followUpDate,
                },
              });
              results.inquiriesUpdated++;
              continue;
            } else {
              // Allocate new unique inquiryNo so new row is not dropped!
              maxInqNo++;
              inqNo = maxInqNo;
            }
          }

          if (inqNo > maxInqNo) maxInqNo = inqNo;

          await prisma.inquiry.create({
            data: {
              inquiryNo: inqNo,
              inquiryDate,
              customerId: customer.id,
              contactPerson: String(r[3] || "").trim() || null,
              phoneEmail: String(r[4] || "").trim() || null,
              pol: String(r[5] || "").trim() || "TBD",
              pod: String(r[6] || "").trim() || "TBD",
              commodity: String(r[7] || "").trim() || null,
              exim: mapEximType(String(r[8] || "EX")),
              shipmentType: mapShipmentType(String(r[9] || "FCL")),
              containerVolume: String(r[10] || "").trim() || null,
              weightKgs: String(r[11] || "").trim() || null,
              shippingLineId: liner?.id || null,
              rateSent: String(r[13] || "").toLowerCase() === "yes",
              quotedRate: String(r[14] || "").trim() || null,
              status: mapInquiryStatus(String(r[15] || "")),
              responsibleId: responsible ? responsible.id : defaultAdmin.id,
              remarks: String(r[17] || "").trim() || null,
              followUpDate,
            },
          });

          results.inquiriesCreated++;
        } catch (err: any) {
          results.errors.push(`Inquiry row ${i} in sheet "${sheetName}": ${err.message}`);
        }
      }
    }
    results.files.push({ name: enquiryFile.name, rowsProcessed });
  }

  // ─────────────────────────────────────────────
  // 2. PARSE SHIPMENT DATA SHEET (ALL SHEETS)
  // ─────────────────────────────────────────────
  const shipmentFile = formData.get("shipment") as File | null;
  if (shipmentFile) {
    let rowsProcessed = 0;
    const buffer = await shipmentFile.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) continue;

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (isRowEmpty(r)) continue;

        const jobNo = String(r[1] || r[0] || "").trim();
        const partyName = String(r[2] || r[1] || "").trim();
        const pol = String(r[3] || "").trim();
        const pod = String(r[4] || "").trim();

        // If party name is missing, skip row
        if (!partyName && !jobNo) continue;
        if (partyName.toLowerCase().includes("party name") || partyName.toLowerCase().includes("total")) continue;

        rowsProcessed++;

        try {
          const isSvilFormat = /^SVIL/i.test(jobNo);

          let existing = jobNo
            ? await prisma.job.findFirst({
                where: { OR: [{ jobId: jobNo }, { legacyJobId: jobNo }] },
              })
            : null;

          const linerName = String(r[10] || "").trim();
          const liner = linerName ? await getLiner(linerName) : null;
          const customer = partyName ? await getCustomer(partyName) : null;

          const chaName = String(r[9] || "").trim();
          const cha = chaName ? await getCHA(chaName) : null;

          const scopeRaw = String(r[8] || "").trim();
          const scopeArr: string[] = [];
          if (scopeRaw.toLowerCase().includes("forward")) scopeArr.push("Forwarding");
          if (scopeRaw.toLowerCase().includes("clear")) scopeArr.push("Clearance");
          if (scopeRaw.toLowerCase().includes("transport")) scopeArr.push("Transportation");

          const shipTypeRaw = String(r[11] || "").trim().toLowerCase();
          const shipmentType = shipTypeRaw.includes("import") || shipTypeRaw === "im" ? "IM" : "EX";

          if (existing) {
            // Update existing job
            await prisma.job.update({
              where: { id: existing.id },
              data: {
                partyName: partyName || existing.partyName,
                customerId: customer?.id || existing.customerId,
                pol: pol || existing.pol,
                pod: pod || existing.pod,
                containerType: String(r[5] || "").trim() || existing.containerType,
                hblNo: String(r[6] || "").trim() || existing.hblNo,
                svilInvoiceNo: String(r[7] || "").trim() || existing.svilInvoiceNo,
                scope: scopeArr.length > 0 ? JSON.stringify(scopeArr) : existing.scope,
                chaId: cha?.id || existing.chaId,
                linerId: liner?.id || existing.linerId,
                shipmentType,
                fclLcl: mapShipmentType(String(r[11] || existing.fclLcl || "FCL")),
              },
            });
            results.jobsUpdated++;
          } else {
            // Create new job with safe sequential Job ID
            const finalJobId = isSvilFormat ? jobNo : await getNextJobId();
            const legacyJobId = isSvilFormat ? null : (jobNo || null);

            await prisma.job.create({
              data: {
                jobId: finalJobId,
                legacyJobId,
                customerId: customer?.id,
                partyName: partyName || "Valued Client",
                pol: pol || "TBD",
                pod: pod || "TBD",
                containerType: String(r[5] || "").trim() || null,
                hblNo: String(r[6] || "").trim() || null,
                svilInvoiceNo: String(r[7] || "").trim() || null,
                scope: JSON.stringify(scopeArr),
                chaId: cha?.id || null,
                linerId: liner?.id || null,
                shipmentType,
                fclLcl: mapShipmentType(String(r[11] || "FCL")),
                currentStatus: "BOOKING_CONFIRMED",
                finance: { create: {} },
              },
            });
            results.jobsCreated++;
          }
        } catch (err: any) {
          results.errors.push(`Shipment row ${i} in sheet "${sheetName}": ${err.message}`);
        }
      }
    }
    results.files.push({ name: shipmentFile.name, rowsProcessed });
  }

  // ─────────────────────────────────────────────
  // 3. PARSE DSR (ALL SHEETS)
  // ─────────────────────────────────────────────
  const dsrFile = formData.get("dsr") as File | null;
  if (dsrFile) {
    let rowsProcessed = 0;
    const buffer = await dsrFile.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      if (!ws) continue;
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rows.length < 2) continue;

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (isRowEmpty(r)) continue;

        const jobNo = String(r[0] || "").trim();
        const partyName = String(r[1] || "").trim();
        if (!jobNo && !partyName) continue;
        if (partyName.toLowerCase().includes("party name") || jobNo.toLowerCase().includes("job no")) continue;

        rowsProcessed++;

        try {
          const linerName = String(r[8] || "").trim();
          const liner = linerName ? await getLiner(linerName) : null;
          const customer = partyName ? await getCustomer(partyName) : null;

          const etd = parseDate(r[6]);
          const eta = parseDate(r[7]);
          const status = mapJobStatus(String(r[12] || ""));
          const isCompleted = sheetName.toLowerCase().includes("completed") || sheetName.toLowerCase().includes("closed") || status === "COMPLETED";

          const buy = parseDecimal(r[15]);
          const sale = parseDecimal(r[16]);
          const cost = parseDecimal(r[17]);
          const margin = sale - buy - cost;

          // Find existing job
          const isSvilFormat = /^SVIL/i.test(jobNo);
          let existing = jobNo
            ? await prisma.job.findFirst({
                where: { OR: [{ jobId: jobNo }, { legacyJobId: jobNo }] },
                include: { finance: true },
              })
            : null;

          if (existing) {
            // Update existing job
            await prisma.job.update({
              where: { id: existing.id },
              data: {
                partyName: partyName || existing.partyName,
                customerId: customer?.id || existing.customerId,
                consignee: String(r[1] || "").trim() || existing.consignee,
                hblNo: String(r[2] || "").trim() || existing.hblNo,
                mblNo: String(r[3] || "").trim() || existing.mblNo,
                pol: String(r[4] || "").trim() || existing.pol,
                pod: String(r[5] || "").trim() || existing.pod,
                etd: etd ?? existing.etd,
                eta: eta ?? existing.eta,
                linerId: liner?.id || existing.linerId,
                volume: String(r[9] || "").trim() || existing.volume,
                fclLcl: mapShipmentType(String(r[10] || existing.fclLcl || "")),
                shipper: String(r[11] || "").trim() || existing.shipper,
                currentStatus: status,
                commodity: String(r[13] || "").trim() || existing.commodity,
                isCompleted: isCompleted || existing.isCompleted,
              },
            });

            if (existing.finance) {
              await prisma.finance.update({
                where: { id: existing.finance.id },
                data: {
                  buy: buy || existing.finance.buy || 0,
                  sale: sale || existing.finance.sale || 0,
                  cost: cost || existing.finance.cost || 0,
                  margin: (buy || sale || cost) ? margin : (existing.finance.margin || 0),
                  invoicingRef: String(r[18] || "").trim() || existing.finance.invoicingRef,
                  courier: String(r[19] || "").trim() || existing.finance.courier,
                },
              });
            } else {
              await prisma.finance.create({
                data: {
                  jobId: existing.id,
                  buy,
                  sale,
                  cost,
                  margin,
                  invoicingRef: String(r[18] || "").trim() || null,
                  courier: String(r[19] || "").trim() || null,
                },
              });
            }

            const remarkText = String(r[14] || "").trim();
            if (remarkText && defaultAdmin) {
              await prisma.remark.create({
                data: {
                  jobId: existing.id,
                  note: `[DSR: ${sheetName}] ${remarkText}`,
                  createdBy: defaultAdmin.id,
                },
              });
            }

            results.jobsUpdated++;
          } else {
            // Create job with safe sequential Job ID
            const finalJobId = isSvilFormat ? jobNo : await getNextJobId();
            const legacyJobId = isSvilFormat ? null : (jobNo || null);

            const newJob = await prisma.job.create({
              data: {
                jobId: finalJobId,
                legacyJobId,
                customerId: customer?.id,
                partyName: partyName || "Valued Client",
                consignee: String(r[1] || "").trim() || null,
                hblNo: String(r[2] || "").trim() || null,
                mblNo: String(r[3] || "").trim() || null,
                pol: String(r[4] || "").trim() || "TBD",
                pod: String(r[5] || "").trim() || "TBD",
                etd,
                eta,
                linerId: liner?.id || null,
                volume: String(r[9] || "").trim() || null,
                fclLcl: mapShipmentType(String(r[10] || "FCL")),
                shipper: String(r[11] || "").trim() || null,
                currentStatus: status,
                commodity: String(r[13] || "").trim() || null,
                isCompleted,
                finance: {
                  create: {
                    buy,
                    sale,
                    cost,
                    margin,
                    invoicingRef: String(r[18] || "").trim() || null,
                    courier: String(r[19] || "").trim() || null,
                  },
                },
              },
            });

            const remarkText = String(r[14] || "").trim();
            if (remarkText && defaultAdmin) {
              await prisma.remark.create({
                data: {
                  jobId: newJob.id,
                  note: `[DSR: ${sheetName}] ${remarkText}`,
                  createdBy: defaultAdmin.id,
                },
              });
            }

            results.jobsCreated++;
          }
        } catch (err: any) {
          results.errors.push(`DSR row ${i} in sheet "${sheetName}": ${err.message}`);
        }
      }
    }
    results.files.push({ name: dsrFile.name, rowsProcessed });
  }

  return NextResponse.json(results);
}
