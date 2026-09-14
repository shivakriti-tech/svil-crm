import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./utils";
import { LETTERHEAD_BASE64 } from "./letterheadBase64";

export interface QuotationPdfData {
  quotationNo: string;
  date: string | Date;
  validUntilText?: string | null;
  validUntil?: string | Date | null;
  companyName: string;
  freightType?: string;
  originPort?: string | null;
  destinationPort?: string | null;
  containerType?: string | null;
  volumeWeight?: string | null;
  commodity?: string | null;
  routing?: string | null;
  vesselSchedule?: string | null;
  transitTime?: string | null;
  freeDays?: string | null;
  spaceAvailability?: string | null;
  notes?: string | null;
  items: Array<{
    chargeDescription: string;
    rateCurrency?: string;
    rateAmount: string | number;
    unit: string;
    remarks?: string | null;
  }>;
}

export function generateQuotationPdf(
  data: QuotationPdfData,
  action: "download" | "print" | "blob" | "datauristring" = "download"
): any {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // ~595.28 pt
  const pageHeight = doc.internal.pageSize.getHeight(); // ~841.89 pt
  const margin = 45;
  const contentWidth = pageWidth - margin * 2;

  // ─────────────────────────────────────────────
  // PAGE 1: BASE LETTERHEAD & FRONT MATTER
  // ─────────────────────────────────────────────
  // 1. Draw official letterhead background image
  try {
    doc.addImage(LETTERHEAD_BASE64, "PNG", 0, 0, pageWidth, pageHeight);
  } catch (e) {
    console.warn("Could not load background letterhead image", e);
  }

  // 2. Centered Stylized "QUOTATION" Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(33, 150, 203); // Ocean Cyan Blue (matching official SVIL style)
  doc.text("QUOTATION", pageWidth / 2, 105, { align: "center" });

  // 3. Top-Right Metadata Block (QUOTATION NO, DATE, VALID)
  const qDate = data.date ? formatDate(data.date) : formatDate(new Date());
  const validText =
    data.validUntilText ||
    (data.validUntil ? formatDate(data.validUntil) : "6TH AUG");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(24, 60, 120); // Deep Navy
  doc.text(`QUOTATION NO: ${data.quotationNo}`, pageWidth - margin, 140, {
    align: "right",
  });

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`DATE: ${qDate}`, pageWidth - margin, 156, { align: "right" });
  doc.text(`VALID: ${validText.toUpperCase()}`, pageWidth - margin, 170, { align: "right" });

  // 4. Left Recipient Block (QUOTATION FOR, COMPANY NAME, FREIGHT TYPE)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(24, 60, 120);
  doc.text("QUOTATION FOR", margin, 192);

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `COMPANY NAME: ${(data.companyName || "").toUpperCase()}`,
    margin,
    210
  );

  const freightLabel = `${data.freightType || "Sea Freight"} Quotation`;
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235); // Blue Accent
  doc.text(freightLabel, margin, 227);

  // 5. Shipment Details Section & Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Shipment Details:", margin, 248);

  const shipmentRows = [
    ["Origin Port", data.originPort || "MUNDRA"],
    ["Destination Port", data.destinationPort || "COLOMBO"],
    ["Container Type", data.containerType || "40 FT"],
    ["Estimated Volume & Weight", data.volumeWeight || "28 MT APX"],
  ];
  if (data.commodity) {
    shipmentRows.push(["Commodity", data.commodity]);
  }

  autoTable(doc, {
    startY: 254,
    head: [["Particular", "Description"]],
    body: shipmentRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      lineColor: [148, 163, 184],
      lineWidth: 0.6,
    },
    headStyles: {
      fillColor: [160, 210, 245], // Soft Ice Blue (matching reference PDF)
      textColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: "bold",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      cellPadding: 2.8,
    },
    columnStyles: {
      0: { cellWidth: 160, fontStyle: "bold" },
      1: { cellWidth: contentWidth - 160 },
    },
    margin: { left: margin, right: margin },
  });

  // 6. Charges Breakdown Table (4 Columns)
  const afterShipmentY = (doc as any).lastAutoTable.finalY + 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `${data.freightType || "Sea Freight"} Charges:`,
    margin,
    afterShipmentY
  );

  const chargesRows = (data.items || []).map((it) => {
    const rateDisplay = `${it.rateCurrency || "USD"} ${it.rateAmount}`;
    return [
      it.chargeDescription,
      rateDisplay,
      it.unit || "Per CONTAINER",
      it.remarks || "-",
    ];
  });

  autoTable(doc, {
    startY: afterShipmentY + 6,
    head: [["CHARGE DESCRIPTION", "RATE", "REMARKS (UNIT)", "NOTES / REMARKS"]],
    body: chargesRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      lineColor: [148, 163, 184],
      lineWidth: 0.6,
    },
    headStyles: {
      fillColor: [160, 210, 245], // Soft Ice Blue
      textColor: [15, 23, 42],
      fontSize: 8.5,
      fontStyle: "bold",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.8,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      cellPadding: 2.6,
    },
    columnStyles: {
      0: { cellWidth: 135, fontStyle: "bold" },
      1: { cellWidth: 95 },
      2: { cellWidth: 110 },
      3: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  // ─────────────────────────────────────────────
  // PAGE 2: TRANSIT TIME, SCHEDULE, NOTES & GREETING
  // ─────────────────────────────────────────────
  doc.addPage();

  // Draw official letterhead on page 2 as well
  try {
    doc.addImage(LETTERHEAD_BASE64, "PNG", 0, 0, pageWidth, pageHeight);
  } catch (e) {
    console.warn("Could not load background letterhead image", e);
  }

  let p2Y = 120;

  // Transit Time & Schedule Block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text("Transit Time & Schedule:", margin, p2Y);

  p2Y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  const scheduleLines = [
    `Routing: ${data.routing || "MLO"}`,
    `Schedule: ${data.vesselSchedule || "VESSEL 16TH AUG"}`,
    `Transit Time: ${data.transitTime || "4 DAYS"}`,
    `Free Days: ${data.freeDays || "14 DAYS"}`,
    `${(data.spaceAvailability || "SUBJECT TO SPACE AVAILABILITY.").toUpperCase()}`,
  ];

  for (const line of scheduleLines) {
    doc.text(`-  ${line}`, margin, p2Y);
    p2Y += 15;
  }

  // Terms & Notes Block
  p2Y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text("Notes & Terms:", margin, p2Y);

  p2Y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const defaultNotes = [
    "- Rates are subject to space availability and change without prior notice.",
    "",
    "- GST & Govt charges will be at actual as per gov norms.",
    "",
    "For any queries or clarification, please feel free to contact us.",
  ];

  const customNotes = data.notes ? data.notes.split("\n") : defaultNotes;

  for (const note of customNotes) {
    if (note.trim()) {
      doc.text(note.trim(), margin, p2Y);
      p2Y += 15;
    } else {
      p2Y += 8;
    }
  }

  // Big Greeting Banner (Matching Reference Image)
  p2Y += 38;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(33, 150, 203); // Stylized Cyan Blue
  doc.text("THANK YOU FOR YOUR INQUIRY", pageWidth / 2, p2Y, {
    align: "center",
  });

  // Output Action
  const filename = `Quotation_${data.quotationNo}_${(data.companyName || "SVIL").replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

  if (action === "download") {
    doc.save(filename);
  } else if (action === "print") {
    doc.autoPrint();
    const blob = doc.output("bloburl");
    window.open(blob, "_blank");
  } else if (action === "blob") {
    return doc.output("blob");
  } else if (action === "datauristring") {
    return doc.output("datauristring");
  }
}
