import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  const n = Number(amount);
  if (isNaN(n)) return "₹0";
  return `₹${n.toLocaleString("en-IN")}`;
}

// Status label maps
const STATUS_LABELS: Record<string, string> = {
  // Inquiry statuses
  IN_PROCESS: "In Process",
  BOOKED: "Booked",
  CLOSE: "Closed",
  NO_SERVICE: "No Service",
  RATE_NOT_GIVEN: "Rate Not Given",
  RATE_UNMATCHED: "Rate Unmatched",
  CARGO_NOT_READY: "Cargo Not Ready",
  VESSEL_MISSED: "Vessel Missed",
  SHIFT_NEXT_DATE: "Shift Next Date",
  REMARK: "Remark",

  // Complete 15 Job / Daily Shipment Statuses
  BOOKING_CONFIRMED: "Booking Confirmed",
  "Booking Confirmed": "Booking Confirmed",
  DOCUMENTS_PENDING: "Documents Pending",
  "Documents Pending": "Documents Pending",
  CARGO_PICKED_UP: "Cargo Picked Up",
  "Cargo Picked Up": "Cargo Picked Up",
  CARGO_GATE_IN: "Cargo Gate in",
  "Cargo Gate in": "Cargo Gate in",
  "Cargo Gate In": "Cargo Gate in",
  CARGO_RECEIVED_WAREHOUSE: "Cargo Received at Warehouse",
  "Cargo Received at Warehouse": "Cargo Received at Warehouse",
  CUSTOMS_CLEARANCE_IN_PROCESS: "Customs Clearance in Process",
  "Customs Clearance in Process": "Customs Clearance in Process",
  CUSTOMS_CLEARANCE: "Customs Clearance in Process",
  CUSTOMS_CLEARED: "Customs Cleared",
  "Customs Cleared": "Customs Cleared",
  VESSEL_SAILED: "Vessel Sailed",
  "Vessel Sailed": "Vessel Sailed",
  IN_TRANSIT: "In Transit",
  "In Transit": "In Transit",
  ARRIVED_AT_DESTINATION: "Arrived at Destination",
  "Arrived at Destination": "Arrived at Destination",
  ARRIVED_AT_POD: "Arrived at Destination",
  DELIVERY_IN_PROCESS: "Delivery in Process",
  "Delivery in Process": "Delivery in Process",
  DELIVERED: "Delivered",
  Delivered: "Delivered",
  COMPLETED: "Completed",
  ON_HOLD_ISSUE: "On Hold / Issue",
  "On Hold / Issue": "On Hold / Issue",
  ON_HOLD: "On Hold / Issue",
  INVOICE_RAISED: "Invoice Raised",
  "Invoice Raised": "Invoice Raised",
  INVOICE_PENDING: "Invoice Pending",
  "Invoice Pending": "Invoice Pending",
};

export function getStatusLabel(status: string): string {
  if (!status) return "—";
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ") ?? "Unknown";
}

// Status color classes (for badge styling)
export function getStatusColor(status: string): string {
  switch (status) {
    case "IN_PROCESS": return "badge-blue";
    case "BOOKED": return "badge-green";
    case "CLOSE": return "badge-gray";
    case "NO_SERVICE": return "badge-gray";
    case "RATE_NOT_GIVEN": return "badge-yellow";
    case "RATE_UNMATCHED": return "badge-orange";
    case "CARGO_NOT_READY": return "badge-yellow";
    case "VESSEL_MISSED": return "badge-red";
    case "SHIFT_NEXT_DATE": return "badge-purple";
    case "REMARK": return "badge-gray";

    // 15 Job / Daily Statuses
    case "BOOKING_CONFIRMED":
    case "Booking Confirmed":
      return "#0070f3";
    case "DOCUMENTS_PENDING":
    case "Documents Pending":
      return "#f59e0b";
    case "CARGO_PICKED_UP":
    case "Cargo Picked Up":
      return "#06b6d4";
    case "CARGO_GATE_IN":
    case "Cargo Gate in":
    case "Cargo Gate In":
      return "#eab308";
    case "CARGO_RECEIVED_WAREHOUSE":
    case "Cargo Received at Warehouse":
      return "#6366f1";
    case "CUSTOMS_CLEARANCE_IN_PROCESS":
    case "Customs Clearance in Process":
    case "CUSTOMS_CLEARANCE":
      return "#f97316";
    case "CUSTOMS_CLEARED":
    case "Customs Cleared":
      return "#14b8a6";
    case "VESSEL_SAILED":
    case "Vessel Sailed":
      return "#8b5cf6";
    case "IN_TRANSIT":
    case "In Transit":
      return "#a855f7";
    case "ARRIVED_AT_DESTINATION":
    case "Arrived at Destination":
    case "ARRIVED_AT_POD":
      return "#ea580c";
    case "DELIVERY_IN_PROCESS":
    case "Delivery in Process":
      return "#2563eb";
    case "DELIVERED":
    case "Delivered":
    case "COMPLETED":
      return "#10b981";
    case "ON_HOLD_ISSUE":
    case "On Hold / Issue":
    case "ON_HOLD":
      return "#ef4444";
    case "INVOICE_RAISED":
    case "Invoice Raised":
      return "#059669";
    case "INVOICE_PENDING":
    case "Invoice Pending":
      return "#d97706";
    default:
      return "badge-gray";
  }
}

export function formatJobId(num: number): string {
  const year = new Date().getFullYear().toString().slice(-2);
  return `SVIL${year}-${String(num).padStart(5, "0")}`;
}
