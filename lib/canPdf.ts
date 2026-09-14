import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./utils";
import { SVIL_LOGO_BASE64 } from "./logoBase64";

export interface CANData {
  jobNo: string;
  igmNo?: string;
  igmDate?: string | Date;
  mblNo?: string;
  mblDate?: string | Date;
  hblNo?: string;
  hblDate?: string | Date;
  forwarderHblNo?: string;
  forwarderHblDate?: string | Date;
  carrierName?: string;
  cfsName?: string;
  vesselVoyage?: string;
  vesselName?: string;
  voyageNo?: string;
  etd?: string | Date;
  eta?: string | Date;
  origin?: string;
  pol?: string;
  pod?: string;
  finalDestination?: string;
  incoTerm?: string;
  itemNo?: string;
  subItemNo?: string;
  shipmentTerms?: string;
  
  consignee?: string;
  notifyParty?: string;
  shipper?: string;
  
  marksNumbers?: string;
  cargoDescription?: string;
  containerNo?: string;
  sealNo?: string;
  packageType?: string;
  weightKgs?: string;
  volumeCbm?: string;
  cargoItems?: Array<{
    marksNumbers?: string;
    description?: string;
    container?: string;
    seal?: string;
    packageType?: string;
    weight?: string;
    volume?: string;
  }>;
  
  preparedBy?: string;
  refDate?: string | Date;
}

export function generateCANPdf(data: CANData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  // 1. Company Header with Logo
  try {
    doc.addImage(SVIL_LOGO_BASE64, "PNG", margin, 5, 34, 22.2);
  } catch (e) {
    console.warn("Could not load logo in CAN PDF", e);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(24, 60, 120);
  doc.text("SIDDHI VINAYAK INTERNATIONAL LOGISTICS", margin + 37, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(40, 40, 40);
  const addrText = "4th floor, 18 E and F, Lotus aura 1, Sama Savli, Main Road, Opp.Lilleria Party Plot, Vadodara, Gujarat 390024";
  const addrLines = doc.splitTextToSize(addrText, contentWidth - 37);
  doc.text(addrLines, margin + 37, 14.5);

  doc.setFontSize(7);
  doc.setTextColor(70, 70, 70);
  doc.text("Mail Id : sv.internationallogistics@gmail.com | Mo No. : +91 9725369740", margin + 37, 20.5);
  doc.text("India Branches : Vadodara, Ahmedabad, Mundra, Surat, Mumbai | Global Branches: UK, China", margin + 37, 24);

  // Title: Cargo Arrival Notice
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text("Cargo Arrival Notice", pageWidth / 2, 30, { align: "center" });

  // 2. Two-Column Main Details Box
  const boxTop = 33;
  const boxHeight = 118;
  const colWidth = contentWidth / 2; // 95mm
  const colLeft = margin;
  const colRight = margin + colWidth;

  // Outer Box Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(colLeft, boxTop, contentWidth, boxHeight);

  // Vertical Divider
  doc.line(colRight, boxTop, colRight, boxTop + boxHeight);

  // LEFT COLUMN: Consignee / Notify Party / Shipper
  const leftSectionHeight = boxHeight / 3; // ~39.3mm each

  // Horizontal divider 1
  doc.line(colLeft, boxTop + leftSectionHeight, colRight, boxTop + leftSectionHeight);
  // Horizontal divider 2
  doc.line(colLeft, boxTop + leftSectionHeight * 2, colRight, boxTop + leftSectionHeight * 2);

  // --- Consignee Box ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Consignee", colLeft + 2, boxTop + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  const consigneeLines = doc.splitTextToSize(data.consignee || "N/A", colWidth - 4);
  doc.text(consigneeLines.slice(0, 6), colLeft + 2, boxTop + 9);

  // --- Notify Party Box ---
  const notifyTop = boxTop + leftSectionHeight;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Notify Party", colLeft + 2, notifyTop + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  const notifyLines = doc.splitTextToSize(data.notifyParty || "SIDDHI VINAYAK INTERNATIONAL LOGISTICS", colWidth - 4);
  doc.text(notifyLines.slice(0, 6), colLeft + 2, notifyTop + 9);

  // --- Shipper Box ---
  const shipperTop = boxTop + leftSectionHeight * 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("Shipper", colLeft + 2, shipperTop + 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  const shipperLines = doc.splitTextToSize(data.shipper || "N/A", colWidth - 4);
  doc.text(shipperLines.slice(0, 6), colLeft + 2, shipperTop + 9);

  // RIGHT COLUMN: Key Values (16 Rows)
  const rightItems = [
    { label: "Job No", val: data.jobNo ? `: ${data.jobNo}` : ": —" },
    { label: "IGM No. / Date", val: `: ${data.igmNo || "—"} / ${data.igmDate ? formatDate(data.igmDate) : "—"}` },
    { label: "MBL No", val: `: ${data.mblNo || "—"}${data.mblDate ? " / " + formatDate(data.mblDate) : ""}` },
    { label: "HBL No", val: `: ${data.hblNo || "—"}${data.hblDate ? " / " + formatDate(data.hblDate) : ""}` },
    { label: "Forwarder HBL No", val: `: ${data.forwarderHblNo || data.hblNo || "—"}` },
    { label: "Carrier Name", val: `: ${data.carrierName || "—"}` },
    { label: "CFS Name", val: `: ${data.cfsName || "JWR LOGISTICS / AS PER BL"}` },
    { label: "Vessel / Voyage", val: `: ${data.vesselVoyage || (data.vesselName ? `${data.vesselName} / ${data.voyageNo || ""}` : "—")}` },
    { label: "ETD", val: `: ${data.etd ? formatDate(data.etd) : "—"}` },
    { label: "ETA", val: `: ${data.eta ? formatDate(data.eta) : "—"}` },
    { label: "Origin", val: `: ${data.origin || data.pol || "—"}` },
    { label: "POL", val: `: ${data.pol || "—"}` },
    { label: "POD", val: `: ${data.pod || "—"}` },
    { label: "Final Destination", val: `: ${data.finalDestination || data.pod || "—"}` },
    { label: "Inco Term", val: `: ${data.incoTerm || "Ex Works"}` },
    { label: "Item No", val: `: ${data.itemNo || "—"}` },
    { label: "Sub Item No", val: `: ${data.subItemNo || "—"}` },
    { label: "Shipment Terms", val: `: ${data.shipmentTerms || "LCL/LCL"}` },
  ];

  let curY = boxTop + 5;
  const rowStep = (boxHeight - 6) / rightItems.length;

  rightItems.forEach((item) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(item.label, colRight + 2, curY);

    const valStr = doc.splitTextToSize(item.val, colWidth - 36);
    doc.text(valStr[0] || "", colRight + 34, curY);
    curY += rowStep;
  });

  // 3. Bottom Table: Cargo & Container Details
  const tableY = boxTop + boxHeight + 4;

  const cargoRows = data.cargoItems && data.cargoItems.length > 0
    ? data.cargoItems.map((c) => [
        c.marksNumbers || data.marksNumbers || "SL MP 1 4 4",
        c.description || data.cargoDescription || "PACKAGES STC CARGO / MACHINERY PARTS",
        c.container || data.containerNo || "—",
        c.seal || data.sealNo || "—",
        c.packageType || data.packageType || "PACKAGE(S)",
        c.weight || data.weightKgs || "—",
        c.volume || data.volumeCbm || "—",
      ])
    : [
        [
          data.marksNumbers || "SL MP 1 4 4",
          data.cargoDescription || "PACKAGES STC CARGO / MACHINERY PARTS",
          data.containerNo ? `${data.containerNo}` : "—",
          data.sealNo || "—",
          data.packageType || "4 PACKAGE(S)",
          data.weightKgs ? `${data.weightKgs}` : "—",
          data.volumeCbm ? `${data.volumeCbm}` : "—",
        ],
      ];

  autoTable(doc, {
    startY: tableY,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    head: [["Marks & Numbers", "Description", "Container", "Seal", "Package Type", "Weight (KGS)", "Volume (CBM)"]],
    body: cargoRows,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      textColor: [20, 20, 20],
      cellPadding: 2.5,
      valign: "top",
      lineColor: [100, 100, 100],
      lineWidth: 0.1,
    },
    headStyles: {
      fontStyle: "bold",
      fontSize: 7.5,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 54 },
      2: { cellWidth: 28 },
      3: { cellWidth: 24 },
      4: { cellWidth: 24 },
      5: { cellWidth: 17, halign: "right" },
      6: { cellWidth: 17, halign: "right" },
    },
    didDrawPage: (hookData) => {
      // Draw outer bottom rectangle container if desired
      const finalY = hookData.cursor?.y || 250;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(margin, tableY, contentWidth, Math.max(80, finalY - tableY + 10));
    }
  });

  // 4. Footer Note & Ref Date
  const footerY = 285;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  const refDateStr = data.refDate ? formatDate(data.refDate) : formatDate(new Date());
  doc.text(`Ref :${refDateStr} by ${data.preparedBy || "SVIL Operations"}`, margin, footerY);

  // Save / Download
  const filename = `CAN_${data.jobNo || "Shipment"}.pdf`;
  doc.save(filename);
}
