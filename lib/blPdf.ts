import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./utils";

export interface BLData {
  blNumber: string;
  referenceNo?: string;
  shipper?: string;
  consignee?: string;
  notifyParty?: string;
  
  preCarriedBy?: string;
  placeOfAcceptance?: string;
  portOfLoading?: string;
  pol?: string;
  pod?: string;
  vesselVoyage?: string;
  portOfDischarge?: string;
  placeOfDelivery?: string;
  
  containerNo?: string;
  containerType?: string;
  customSealNo?: string;
  lineSealNo?: string;
  sealNo?: string;
  marksNumbers?: string;
  packageCountText?: string;
  cargoDescription?: string;
  hsnCode?: string;
  invoiceDetails?: string;
  grossWeight?: string;
  netWeight?: string;
  measurement?: string;
  packagesCount?: string | number;
  
  freightAmount?: string; // COLLECT / PREPAID
  freightPayableAt?: string; // DESTINATION / ORIGIN
  placeOfIssue?: string; // VADODARA
  dateOfIssue?: string | Date;
  shippedOnBoardDate?: string | Date;
  deliveryAgent?: string;
}

export function generateBLPdf(data: BLData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 8;
  const contentWidth = pageWidth - margin * 2; // 194mm

  // Background Parchment Color (Soft Yellow/Buff like original BL)
  doc.setFillColor(254, 248, 224);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Title Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("SEAWAY BILL OF LADING", pageWidth / 2, 11, { align: "center" });

  const topY = 14;
  const leftColW = 82;
  const rightColW = contentWidth - leftColW; // 112mm
  const colRightX = margin + leftColW;

  // Draw Main Outer Border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(margin, topY, contentWidth, 275);

  // --- Top Left Boxes (Shipper, Consignee, Notify Party) ---
  const shipperH = 24;
  const consigneeH = 26;
  const notifyH = 26;

  // Box borders
  doc.rect(margin, topY, leftColW, shipperH);
  doc.rect(margin, topY + shipperH, leftColW, consigneeH);
  doc.rect(margin, topY + shipperH + consigneeH, leftColW, notifyH);

  // Shipper
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("SHIPPER", margin + 2, topY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const shipperLines = doc.splitTextToSize(data.shipper || "N/A", leftColW - 4);
  doc.text(shipperLines.slice(0, 4), margin + 2, topY + 8);

  // Consignee
  const consigneeY = topY + shipperH;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("CONSIGNEE", margin + 2, consigneeY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const consigneeLines = doc.splitTextToSize(data.consignee || "N/A", leftColW - 4);
  doc.text(consigneeLines.slice(0, 4), margin + 2, consigneeY + 8);

  // Notify Party
  const notifyY = consigneeY + consigneeH;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("NOTIFY PARTY", margin + 2, notifyY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const notifyLines = doc.splitTextToSize(data.notifyParty || data.consignee || "SAME AS CONSIGNEE", leftColW - 4);
  doc.text(notifyLines.slice(0, 4), margin + 2, notifyY + 8);

  // --- Top Right Box (BL Number, Reference No, MTO Header & Legal clause) ---
  const rightBoxH = shipperH + consigneeH + notifyH; // 76mm
  doc.rect(colRightX, topY, rightColW, rightBoxH);

  // BL Number and Reference No header strip
  doc.line(colRightX, topY + 11, margin + contentWidth, topY + 11);
  doc.line(colRightX + rightColW / 2, topY, colRightX + rightColW / 2, topY + 11);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("BL NUMBER", colRightX + 2, topY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.blNumber || "SVIL26001", colRightX + 2, topY + 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("REFERENCE NO", colRightX + rightColW / 2 + 2, topY + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(data.referenceNo || `REF-${data.blNumber || "2026"}`, colRightX + rightColW / 2 + 2, topY + 9);

  // MTO Center Brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SIDDHI VINAYAK", colRightX + rightColW / 2, topY + 20, { align: "center" });
  doc.setFontSize(7);
  doc.text("INTERNATIONAL LOGISTICS", colRightX + rightColW / 2, topY + 24, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("MTO/DGS/120260213000002/FEB/2029", colRightX + rightColW / 2, topY + 30, { align: "center" });

  // Standard MTO Clause
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  const mtoLegal = [
    "TAKEN IN CHARGE IN APPARENTLY GOOD CONDITION HEREIN AT THE PLACE OF RECEIPT FOR",
    "TRANSPORT AND DELIVERY AS MENTIONED ABOVE, UNLESS OTHERWISE STATED. THE MTO IN",
    "ACCORDANCE WITH THE PROVISIONS CONTAINED IN THE MTD UNDERTAKES TO PERFORM OR TO",
    "PROCURE THE PERFORMANCE OF THE MULTIMODAL TRANSPORT FROM THE PLACE AT WHICH THE",
    "GOODS ARE TAKEN IN CHARGE, TO THE PLACE DESIGNATED FOR DELIVERY AND ASSUMES",
    "RESPONSIBILITY FOR SUCH TRANSPORT.",
    "",
    "ONE OF THE MTD(S) MUST BE SURRENDERED, DULY ENDORSED IN EXCHANGE FOR THE GOODS, IN",
    "WITNESS WHEREOF THE ORIGINAL MTD ALL OF THIS TENOR AND DATE HAVE BEEN SIGNED IN THE",
    "NUMBER INDICATED BELOW ONE OF WHICH BEING ACCOMPLISHED THE OTHER(S) TO BE VOID.",
  ];
  let legalY = topY + 35;
  mtoLegal.forEach((l) => {
    doc.text(l, colRightX + rightColW / 2, legalY, { align: "center" });
    legalY += 2.8;
  });

  // --- Intermediate Route / Voyage Grid (2 Rows x 2 Cols) ---
  const routeY = topY + rightBoxH;
  const routeRowH = 10;

  // Row 1: Precarried By | Place of Acceptance | Port of Loading
  doc.rect(margin, routeY, leftColW, routeRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Precarried by", margin + 2, routeY + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.preCarriedBy || "BY SEA", margin + 2, routeY + 7.5);

  doc.rect(colRightX, routeY, rightColW / 2, routeRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("PLACE OF ACCEPTANCE", colRightX + 2, routeY + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.placeOfAcceptance || data.pol || "ICD AHMEDABAD, INDIA", colRightX + 2, routeY + 7.5);

  doc.rect(colRightX + rightColW / 2, routeY, rightColW / 2, routeRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("PORT OF LOADING", colRightX + rightColW / 2 + 2, routeY + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.portOfLoading || data.pol || "MUNDRA, INDIA", colRightX + rightColW / 2 + 2, routeY + 7.5);

  // Row 2: Vessel/Voy No. | Port of Discharge | Place of Delivery
  const routeY2 = routeY + routeRowH;
  doc.rect(margin, routeY2, leftColW, routeRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("VESSEL/VOY NO.", margin + 2, routeY2 + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.vesselVoyage || "EVER LIVING / 78", margin + 2, routeY2 + 7.5);

  doc.rect(colRightX, routeY2, rightColW / 2, routeRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("PORT OF DISCHARGE", colRightX + 2, routeY2 + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.portOfDischarge || data.pod || "PORTKLANG, MALAYSIA", colRightX + 2, routeY2 + 7.5);

  doc.rect(colRightX + rightColW / 2, routeY2, rightColW / 2, routeRowH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("PLACE OF DELIVERY", colRightX + rightColW / 2 + 2, routeY2 + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.placeOfDelivery || data.pod || "PORTKLANG, MALAYSIA", colRightX + rightColW / 2 + 2, routeY2 + 7.5);

  // --- Cargo & Container Headers ---
  const cargoY = routeY2 + routeRowH;
  const cargoHeadH = 8;
  const col1W = 38;
  const col2W = 96;
  const col3W = contentWidth - col1W - col2W; // 60mm

  doc.rect(margin, cargoY, col1W, cargoHeadH);
  doc.rect(margin + col1W, cargoY, col2W, cargoHeadH);
  doc.rect(margin + col1W + col2W, cargoY, col3W, cargoHeadH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("CONTAINER NO(S), MARKS", margin + col1W / 2, cargoY + 3.5, { align: "center" });
  doc.text("&NUMBERS", margin + col1W / 2, cargoY + 6.5, { align: "center" });

  doc.text("NUMBER OF PACKAGES, KINDS OF PACKAGES, GENERAL DESCRIPTION", margin + col1W + col2W / 2, cargoY + 3.5, { align: "center" });
  doc.text("OF GOODS(SAID TO CONTAIN)", margin + col1W + col2W / 2, cargoY + 6.5, { align: "center" });

  doc.text("GROSS WT. / NET WT/ MEASUREMENT", margin + col1W + col2W + col3W / 2, cargoY + 5, { align: "center" });

  // --- Cargo Content Section ---
  const cargoBodyY = cargoY + cargoHeadH;
  const cargoBodyH = 100;
  doc.rect(margin, cargoBodyY, col1W, cargoBodyH);
  doc.rect(margin + col1W, cargoBodyY, col2W, cargoBodyH);
  doc.rect(margin + col1W + col2W, cargoBodyY, col3W, cargoBodyH);

  // Column 1: Container & Marks
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(data.containerNo || "NLLU4145370", margin + 2, cargoBodyY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(`CUSTOM SEAL NO: ${data.customSealNo || "225532"}`, margin + 2, cargoBodyY + 11);
  doc.text(`LINE SEAL NO: ${data.lineSealNo || data.sealNo || "56129"}`, margin + 2, cargoBodyY + 15);
  if (data.marksNumbers) {
    doc.text(data.marksNumbers, margin + 2, cargoBodyY + 20);
  }

  // Column 2: Goods & Description
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(data.packageCountText || `1 x ${data.containerType || "40 HC"} S.T.C`, margin + col1W + 2, cargoBodyY + 6);
  doc.text(data.packagesCount ? `TOTAL ${data.packagesCount} WOODEN BOXES / PACKAGES` : "TOTAL FIVE WOODEN BOXES ONLY", margin + col1W + 2, cargoBodyY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const descLines = doc.splitTextToSize(
    data.cargoDescription || "AUTOMATIC SERVO FILLING MACHINE WITH GEAR PUMP & SPARES",
    col2W - 4
  );
  doc.text(descLines, margin + col1W + 2, cargoBodyY + 16);

  let descEndOffset = 16 + descLines.length * 3.5 + 4;
  if (data.hsnCode) {
    doc.text(`HSN CODE: ${data.hsnCode}`, margin + col1W + 2, cargoBodyY + descEndOffset);
    descEndOffset += 4;
  }
  if (data.invoiceDetails) {
    doc.text(`INV NO. ${data.invoiceDetails}`, margin + col1W + 2, cargoBodyY + descEndOffset);
    descEndOffset += 4;
  }
  if (data.netWeight) {
    doc.text(`NET WT. ${data.netWeight}`, margin + col1W + 2, cargoBodyY + descEndOffset);
    descEndOffset += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.text(data.freightAmount || "FREIGHT COLLECT", margin + col1W + 2, cargoBodyY + descEndOffset);

  // Column 3: Gross Weight & Measurement
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(data.grossWeight ? `${data.grossWeight}` : "3,490.000 KGS", margin + col1W + col2W + 3, cargoBodyY + 6);
  if (data.measurement) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(`VOLUME: ${data.measurement}`, margin + col1W + col2W + 3, cargoBodyY + 11);
  }

  // --- Bottom Container Summary Bar ---
  const sumY = cargoBodyY + cargoBodyH;
  const sumH = 8;
  doc.rect(margin, sumY, contentWidth, sumH);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("CONTAINER NO", margin + 2, sumY + 3);
  doc.text("TYPE", margin + 34, sumY + 3);
  doc.text("S/L SEAL", margin + 60, sumY + 3);
  doc.text("GROSS WT", margin + 92, sumY + 3);
  doc.text("NET WT.", margin + 124, sumY + 3);
  doc.text("PACKAGES", margin + 158, sumY + 3);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(data.containerNo || "NLLU4145370", margin + 2, sumY + 6.5);
  doc.text(data.containerType || "40 HC", margin + 34, sumY + 6.5);
  doc.text(data.lineSealNo || data.sealNo || "56129", margin + 60, sumY + 6.5);
  doc.text(data.grossWeight || "3,490.00 KGS", margin + 92, sumY + 6.5);
  doc.text(data.netWeight || "1,560.00 KGS", margin + 124, sumY + 6.5);
  doc.text(String(data.packagesCount || "5"), margin + 158, sumY + 6.5);

  // --- Signatory & Particulars Sub-header ---
  const partY = sumY + sumH;
  doc.rect(margin, partY, contentWidth, 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("PARTICULARS ABOVE FURNISHED BY CONSIGNOR / CONSIGNEE", pageWidth / 2, partY + 3, { align: "center" });

  // --- Footer Settlement Grid (3 Rows) ---
  const footY = partY + 4;
  const footH = 43;
  const footCol1W = 75;
  const footCol2W = 68;
  const footCol3W = contentWidth - footCol1W - footCol2W; // 51mm

  doc.rect(margin, footY, footCol1W, footH);
  doc.rect(margin + footCol1W, footY, footCol2W, footH);
  doc.rect(margin + footCol1W + footCol2W, footY, footCol3W, footH);

  // Col 1: Freight Amount | Shipped on Board
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("FREIGHT AMOUNT", margin + 2, footY + 3.5);
  doc.text("FREIGHT PAYABLE AT", margin + 40, footY + 3.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(data.freightAmount || "COLLECT", margin + 2, footY + 7);
  doc.text(data.freightPayableAt || "DESTINATION", margin + 40, footY + 7);

  doc.line(margin, footY + 9, margin + footCol1W, footY + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("OTHER PARTICULARS (IF ANY)", margin + 2, footY + 12.5);
  doc.setFontSize(8);
  doc.text("SHIPPED ON BOARD DATE:", margin + 2, footY + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const shippedDateStr = data.shippedOnBoardDate ? formatDate(data.shippedOnBoardDate) : formatDate(new Date());
  doc.text(shippedDateStr, margin + 2, footY + 23);

  // Col 2: Place & Date of Issue | Delivery Agent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("PLACE & DATE OF ISSUE", margin + footCol1W + 2, footY + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const issueDateStr = data.dateOfIssue ? formatDate(data.dateOfIssue) : formatDate(new Date());
  doc.text(`${data.placeOfIssue || "VADODARA"} & ${issueDateStr}`, margin + footCol1W + 2, footY + 7);

  doc.line(margin + footCol1W, footY + 9, margin + footCol1W + footCol2W, footY + 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("DELIVERY AGENT :", margin + footCol1W + 2, footY + 12.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const agentLines = doc.splitTextToSize(
    data.deliveryAgent || "DIABOSS SHIPPING SDN BHD\nNo.45-2, Jalan Tiara 2b, Bandar Baru, Klang, Selangor, Malaysia\ncsdoc.pkg@diabosshipping.com",
    footCol2W - 4
  );
  doc.text(agentLines, margin + footCol1W + 2, footY + 17);

  // Col 3: Stamp & Authorized Signatory
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("FOR", margin + footCol1W + footCol2W + footCol3W / 2, footY + 4, { align: "center" });
  doc.setFontSize(7);
  doc.text("SIDDHI VINAYAK INTERNATIONAL LOGISTICS", margin + footCol1W + footCol2W + footCol3W / 2, footY + 8, { align: "center" });

  // Stamp circle illustration
  doc.setDrawColor(0, 50, 150);
  doc.setLineWidth(0.3);
  doc.circle(margin + footCol1W + footCol2W + footCol3W / 2, footY + 23, 11);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(0, 50, 150);
  doc.text("SIDDHI VINAYAK LOGISTICS", margin + footCol1W + footCol2W + footCol3W / 2, footY + 19, { align: "center" });
  doc.setFontSize(7);
  doc.text("VADODARA", margin + footCol1W + footCol2W + footCol3W / 2, footY + 24, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  doc.text("AUTHORISED SIGNATORY", margin + footCol1W + footCol2W + footCol3W / 2, footY + 40, { align: "center" });

  // Save / Download
  const filename = `BL_${data.blNumber || "Seaway_BL"}.pdf`;
  doc.save(filename);
}
