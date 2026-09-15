import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PayslipData {
  employeeCode?: string;
  employeeName: string;
  designation?: string;
  department?: string;
  month: string; // e.g. "August 2026"
  dateOfJoining?: string;
  panNo?: string;
  bankName?: string;
  bankAccountNo?: string;
  ifscCode?: string;

  // Attendance stats
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  paidDays: number;

  // Earnings
  basicSalary: number;
  hra: number;
  allowances: number;
  bonusIncentive: number;
  grossSalary: number;

  // Deductions
  absentDeduction: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeduction: number;
  totalDeductions: number;

  // Net Pay
  netSalary: number;
  paymentStatus?: string;
  paymentMode?: string;
  transactionRef?: string;
  remarks?: string;
}

function numberToWords(num: number): string {
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.floor(num);
  if (n === 0) return "Zero Rupees Only";

  function inWords(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + inWords(n % 100) : "");
    if (n < 100000) return inWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + inWords(n % 1000) : "");
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + inWords(n % 100000) : "");
    return inWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + inWords(n % 10000000) : "");
  }

  return inWords(n) + " Rupees Only";
}

export function generatePayslipPdf(data: PayslipData, action: "download" | "print" = "download"): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Box / Banner (Clean white background)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("SIDDHI VINAYAK INTERNATIONAL LOGISTICS", pageWidth / 2, y + 7.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("4th floor, 18 E and F, Lotus aura 1, Sama Savli, Main Road, Opp.Lilleria Party Plot, Vadodara, Gujarat 390024", pageWidth / 2, y + 13.5, { align: "center" });
  doc.text("Mo No. : +91 9725369740 | Email: sv.internationallogistics@gmail.com", pageWidth / 2, y + 18, { align: "center" });

  y += 28;

  // Payslip Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`SALARY SLIP FOR THE MONTH OF ${data.month.toUpperCase()}`, pageWidth / 2, y, { align: "center" });
  doc.setDrawColor(0, 112, 243);
  doc.setLineWidth(0.7);
  doc.line(pageWidth / 2 - 40, y + 2, pageWidth / 2 + 40, y + 2);

  y += 7;

  // Employee Information Grid
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
      1: { fontStyle: "bold", cellWidth: 58 },
      2: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 32 },
      3: { fontStyle: "bold", cellWidth: 60 },
    },
    body: [
      ["Employee Code", data.employeeCode || "SVIL-EMP", "PAN Number", data.panNo || "N/A"],
      ["Employee Name", data.employeeName, "Bank Name", data.bankName || "N/A"],
      ["Designation", data.designation || "Executive", "Bank A/C No", data.bankAccountNo || "N/A"],
      ["Department", data.department || "Operations", "IFSC Code", data.ifscCode || "N/A"],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // Attendance Summary Strip
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 7.5, fontStyle: "bold", halign: "center" },
    styles: { fontSize: 8, fontStyle: "bold", halign: "center", cellPadding: 2.5 },
    head: [["Total Days", "Present Days", "Absent Days", "Half Days", "Payable Days"]],
    body: [
      [
        String(data.workingDays),
        String(data.presentDays),
        String(data.absentDays),
        String(data.halfDays),
        String(data.paidDays),
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Earnings & Deductions 2-Column Side-by-Side Table
  const fmt = (v: number) => `INR ${(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  const earningsRows = [
    ["Basic / Gross Monthly Salary", fmt(data.basicSalary)],
    ...(data.bonusIncentive > 0 ? [["Performance Bonus / Incentive", fmt(data.bonusIncentive)]] : []),
  ];

  const deductionsRows = [
    ["Absent / Unpaid Leave Deduction", fmt(data.absentDeduction)],
    ["Provident Fund (PF - 12% Statutory)", fmt(data.pfDeduction)],
    ["Professional Tax / TDS", fmt(data.taxDeduction)],
    ...(data.otherDeduction > 0 ? [["Other Deductions", fmt(data.otherDeduction)]] : []),
  ];

  const combinedTableBody: any[] = [];
  const maxRows = Math.max(earningsRows.length, deductionsRows.length);

  for (let i = 0; i < maxRows; i++) {
    const earn = earningsRows[i] || ["", ""];
    const ded = deductionsRows[i] || ["", ""];
    combinedTableBody.push([earn[0], earn[1], ded[0], ded[1]]);
  }

  // Add Totals Row
  combinedTableBody.push([
    "GROSS EARNINGS",
    fmt(data.grossSalary),
    "TOTAL DEDUCTIONS",
    fmt(data.totalDeductions),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: [0, 112, 243], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { halign: "right", fontStyle: "bold", cellWidth: 36 },
      2: { cellWidth: 55 },
      3: { halign: "right", fontStyle: "bold", cellWidth: 36 },
    },
    head: [["EARNINGS", "AMOUNT", "DEDUCTIONS", "AMOUNT"]],
    body: combinedTableBody,
    didParseCell: (hookData) => {
      if (hookData.row.index === maxRows) {
        hookData.cell.styles.fillColor = [241, 245, 249];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Net Pay Box
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(34, 197, 94);
  doc.setLineWidth(0.6);
  doc.roundedRect(14, y, pageWidth - 28, 18, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(21, 128, 61);
  doc.text("NET SALARY PAYABLE:", 20, y + 7);

  doc.setFontSize(12);
  doc.text(fmt(data.netSalary), 20, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`In Words: ${numberToWords(data.netSalary)}`, 85, y + 8);
  doc.text(`Payment Mode: ${data.paymentMode || "Bank Transfer"} | Status: ${data.paymentStatus || "PAID"}`, 85, y + 13);

  y += 26;

  // Signatures Section
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  // Employee Sign
  doc.line(20, y + 16, 75, y + 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Employee Signature", 32, y + 21);

  // Authorized Sign
  doc.line(pageWidth - 75, y + 16, pageWidth - 20, y + 16);
  doc.text("Authorized Signatory", pageWidth - 60, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Siddhi Vinayak Int. Logistics", pageWidth - 63, y + 25);

  // Footer Note
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("This is a computer-generated document and requires authorized validation.", pageWidth / 2, 285, { align: "center" });

  if (action === "download") {
    const filename = `Payslip_${data.employeeName.replace(/\s+/g, "_")}_${data.month.replace(/\s+/g, "_")}.pdf`;
    doc.save(filename);
  } else if (action === "print") {
    doc.autoPrint();
    const blobUrl = doc.output("bloburl");
    window.open(blobUrl, "_blank");
  }

  return doc;
}
