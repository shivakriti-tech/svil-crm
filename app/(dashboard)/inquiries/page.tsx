"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import InquiryFormModal from "@/components/inquiries/InquiryFormModal";
import KanbanBoard from "@/components/inquiries/KanbanBoard";
import ConvertToJobModal from "@/components/inquiries/ConvertToJobModal";
import InquiryQuotationModal from "@/components/inquiries/InquiryQuotationModal";
import { usePermissions } from "@/hooks/usePermissions";

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "2026-04", label: "April 2026" },
  { value: "2026-05", label: "May 2026" },
  { value: "2026-06", label: "June 2026" },
  { value: "2026-07", label: "July 2026" },
  { value: "2026-08", label: "August 2026" },
  { value: "2026-09", label: "September 2026" },
  { value: "2026-10", label: "October 2026" },
  { value: "2026-11", label: "November 2026" },
  { value: "2026-12", label: "December 2026" },
  { value: "2027-01", label: "January 2027" },
];

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "IN_PROCESS", label: "In Process" },
  { value: "BOOKED", label: "Booked / Won" },
  { value: "CLOSE", label: "Closed" },
  { value: "NO_SERVICE", label: "No Service" },
  { value: "RATE_NOT_GIVEN", label: "Rate Not Given" },
  { value: "RATE_UNMATCHED", label: "Rate Unmatched" },
  { value: "CARGO_NOT_READY", label: "Cargo Not Ready" },
  { value: "VESSEL_MISSED", label: "Vessel Missed" },
  { value: "SHIFT_NEXT_DATE", label: "Shift Next Date" },
  { value: "REMARK", label: "Remark" },
];

export default function InquiriesPage() {
  const { can, isAdmin } = usePermissions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [workload, setWorkload] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editInquiry, setEditInquiry] = useState<any>(null);
  const [masters, setMasters] = useState<any>({});

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const followupFilter = searchParams.get("filter") === "followup";

  // Deduplicate and sort employees for the filter dropdown
  const uniqueEmployees: any[] = useMemo(() => {
    return Array.from(
      new Map((masters.users || []).map((u: any) => [u.name.trim().toLowerCase(), u])).values()
    ).sort((a: any, b: any) => a.name.localeCompare(b.name));
  }, [masters.users]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (responsible) params.set("responsible", responsible);
    
    if (followupFilter) {
      params.set("followup", "true");
    } else {
      // Pass "all" when month is set to "all" or empty so API does not restrict to current month
      params.set("month", month || "all");
    }
    
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/inquiries?${params}`);
    const data = await res.json();
    setInquiries(data.items ?? []);
    setTotal(data.total ?? 0);
    if (data.workload) setWorkload(data.workload);
    setLoading(false);
  }, [search, status, responsible, month, page, followupFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/masters")
      .then((r) => r.json())
      .then(setMasters)
      .catch(() => {});
  }, []);

  const [convertAlert, setConvertAlert] = useState<{ jobId: string; id: string; inqNo: number } | null>(null);
  const [convertingInquiry, setConvertingInquiry] = useState<any>(null);
  const [quotationInquiry, setQuotationInquiry] = useState<any>(null);

  const handleConvert = async (inquiryId: string) => {
    const targetInq = inquiries.find((i) => i.id === inquiryId);
    if (targetInq) {
      setConvertingInquiry(targetInq);
    }
  };

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = inquiries.map((inq) => ({
      "Inquiry No": inq.inquiryNo,
      "Date": formatDate(inq.inquiryDate),
      "Customer": inq.customer?.name,
      "Contact": inq.contactPerson,
      "Phone/Email": inq.phoneEmail,
      "POL": inq.pol,
      "POD": inq.pod,
      "Commodity": inq.commodity,
      "EXIM": inq.exim,
      "Shipment Type": inq.shipmentType,
      "Container/Volume": inq.containerVolume,
      "Weight (KGS)": inq.weightKgs,
      "Shipping Line": inq.shippingLine?.name,
      "Rate Sent": inq.rateSent ? "Yes" : "No",
      "Quoted Rate": inq.quotedRate,
      "Status": getStatusLabel(inq.status),
      "Responsible": inq.responsible?.name,
      "Remarks": inq.remarks,
      "Follow Up Date": formatDate(inq.followUpDate),
      "Job ID": inq.job?.jobId ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inquiries");
    XLSX.writeFile(wb, `SVIL_Inquiries_${month || "all"}.xlsx`);
  };

  const activeEmployeeName = uniqueEmployees.find((e) => e.id === responsible)?.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
            Inquiry Management
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {total} inquiries {followupFilter ? "(follow-ups due)" : month === "all" ? "(all historical months)" : `in ${MONTHS.find((m) => m.value === month)?.label ?? "selection"}`}
            {activeEmployeeName && ` • Filtered by: ${activeEmployeeName}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
            <button
              id="view-table"
              onClick={() => setView("table")}
              className="btn btn-sm"
              style={{ borderRadius: 0, background: view === "table" ? "#0070f3" : "transparent", color: view === "table" ? "#ffffff" : "var(--text-muted)" }}
            >
              Table
            </button>
            <button
              id="view-kanban"
              onClick={() => setView("kanban")}
              className="btn btn-sm"
              style={{ borderRadius: 0, background: view === "kanban" ? "#0070f3" : "transparent", color: view === "kanban" ? "#ffffff" : "var(--text-muted)" }}
            >
              Kanban
            </button>
          </div>
          <button id="btn-export-excel" onClick={handleExportExcel} className="btn btn-secondary btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Export Excel
          </button>
          {(isAdmin || can("inquiries", "add")) && (
            <button
              id="btn-new-inquiry"
              onClick={() => { setEditInquiry(null); setShowModal(true); }}
              className="btn btn-primary btn-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
              </svg>
              New Inquiry
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────
         SECTION: EMPLOYEE WORKLOAD OVERVIEW CARDS / PILLS
         ───────────────────────────────────────────── */}
      {workload.length > 0 && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                Employee Workload Distribution
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                (Click an employee to view their inquiries)
              </span>
            </div>
            {responsible && (
              <button
                onClick={() => { setResponsible(""); setPage(1); }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0070f3",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
              >
                Reset Employee Filter ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {/* All Team Button */}
            <button
              onClick={() => { setResponsible(""); setPage(1); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.775rem",
                fontWeight: 600,
                cursor: "pointer",
                border: !responsible ? "1px solid #0070f3" : "1px solid var(--border-color)",
                background: !responsible ? "rgba(0, 112, 243, 0.15)" : "var(--card-hover-bg)",
                color: !responsible ? "#0070f3" : "var(--text-main)",
                transition: "all 0.15s ease",
              }}
            >
              <span>All Executives</span>
              <span
                style={{
                  background: !responsible ? "#0070f3" : "rgba(255, 255, 255, 0.1)",
                  color: "#ffffff",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                }}
              >
                {workload.reduce((sum, e) => sum + e.total, 0)}
              </span>
            </button>

            {/* Individual Employee Workload Pills */}
            {workload.map((emp) => {
              const isSelected = responsible === emp.id;
              // High workload color coding
              const isHigh = emp.active >= 20;

              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    setResponsible(isSelected ? "" : emp.id);
                    setPage(1);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "0.775rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isSelected ? "1px solid #0070f3" : "1px solid var(--border-color)",
                    background: isSelected ? "rgba(0, 112, 243, 0.18)" : "var(--card-hover-bg)",
                    color: isSelected ? "#0070f3" : "var(--text-main)",
                    transition: "all 0.15s ease",
                  }}
                  title={`${emp.name}: ${emp.active} Active / In-Process, ${emp.booked} Booked, ${emp.total} Total`}
                >
                  <span>{emp.name}</span>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <span
                      style={{
                        background: isHigh ? "rgba(239, 68, 68, 0.2)" : "rgba(0, 112, 243, 0.2)",
                        color: isHigh ? "#ef4444" : "#0070f3",
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                      }}
                      title={`${emp.active} Active inquiries`}
                    >
                      {emp.active} active
                    </span>
                    <span
                      style={{
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#10b981",
                        padding: "1px 5px",
                        borderRadius: "9999px",
                        fontSize: "0.68rem",
                        fontWeight: 700,
                      }}
                      title={`${emp.booked} Booked inquiries`}
                    >
                      {emp.booked} won
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <input
          id="inquiry-search"
          type="search"
          placeholder="Search customer, POL, POD..."
          className="form-input"
          style={{ maxWidth: "260px" }}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />

        {/* Month Filter */}
        <select
          id="filter-month"
          className="form-input"
          style={{ maxWidth: "160px" }}
          value={month}
          onChange={(e) => { setMonth(e.target.value); setPage(1); }}
          disabled={followupFilter}
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          id="filter-status"
          className="form-input"
          style={{ maxWidth: "160px" }}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Employee / Workload Filter Dropdown */}
        <select
          id="filter-responsible"
          className="form-input"
          style={{ maxWidth: "180px" }}
          value={responsible}
          onChange={(e) => { setResponsible(e.target.value); setPage(1); }}
        >
          <option value="">All Employees</option>
          {uniqueEmployees.map((e: any) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {(search || status || responsible || (month && month !== `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`) || followupFilter) && (
          <button
            id="btn-clear-inquiry-filters"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSearch("");
              setStatus("");
              setResponsible("");
              const now = new Date();
              setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
              setPage(1);
              if (followupFilter) router.push("/inquiries");
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Convert to Job Success Alert */}
      {convertAlert && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "0.85rem",
            fontWeight: 600,
            background: "rgba(16, 185, 129, 0.15)",
            color: "#10b981",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>
              Inquiry #{convertAlert.inqNo} successfully converted to Job <strong>{convertAlert.jobId}</strong>!
            </span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link
              href={`/jobs/${convertAlert.id}`}
              className="btn btn-sm"
              style={{ background: "#10b981", color: "#ffffff", padding: "4px 12px", textDecoration: "none", borderRadius: "6px" }}
            >
              Open Job &rarr;
            </Link>
            <button
              onClick={() => setConvertAlert(null)}
              style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {view === "kanban" ? (
        <KanbanBoard
          inquiries={inquiries}
          onRefresh={load}
          onEditInquiry={(inq) => { setEditInquiry(inq); setShowModal(true); }}
          onConvertInquiry={handleConvert}
          onQuotationInquiry={setQuotationInquiry}
        />
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>POL → POD</th>
                  <th>EXIM</th>
                  <th>Type</th>
                  <th>Shipping Line</th>
                  <th>Rate Sent</th>
                  <th>Status</th>
                  <th>Responsible</th>
                  <th>Follow Up</th>
                  <th>Job ID</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      Loading inquiries...
                    </td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={13} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      No inquiries found matching selected filters
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inq) => {
                    const isFollowUpDue = inq.followUpDate && new Date(inq.followUpDate) <= new Date();
                    return (
                      <tr key={inq.id} className={isFollowUpDue ? "row-warning" : ""}>
                        <td style={{ fontWeight: 700, color: "#0070f3" }}>{inq.inquiryNo}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDate(inq.inquiryDate)}</td>
                        <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{inq.customer?.name}</td>
                        <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                          {inq.pol} → {inq.pod}
                        </td>
                        <td>
                          <span className="badge" style={{ background: "rgba(0, 112, 243, 0.12)", color: "#0070f3" }}>
                            {inq.exim}
                          </span>
                        </td>
                        <td>{inq.shipmentType}</td>
                        <td style={{ color: "var(--text-muted)" }}>{inq.shippingLine?.name ?? "—"}</td>
                        <td>
                          <span style={{ color: inq.rateSent ? "#10b981" : "var(--text-subtle)", fontWeight: 600, fontSize: "0.8rem" }}>
                            {inq.rateSent ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusColor(inq.status)}`}>
                            {getStatusLabel(inq.status)}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-main)", fontWeight: 500 }}>
                          {inq.responsible?.name ?? "—"}
                        </td>
                        <td>
                          {inq.followUpDate ? (
                            <span style={{ color: isFollowUpDue ? "#d97706" : "var(--text-muted)", fontSize: "0.8rem", fontWeight: isFollowUpDue ? 600 : 400 }}>
                              {formatDate(inq.followUpDate)}
                            </span>
                          ) : "—"}
                        </td>
                        <td>
                          {inq.job ? (
                            <Link href={`/jobs/${inq.job.id}`} style={{ color: "#0070f3", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}>
                              {inq.job.jobId}
                            </Link>
                          ) : "—"}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            <button
                              id={`edit-inquiry-${inq.id}`}
                              onClick={() => { setEditInquiry(inq); setShowModal(true); }}
                              className="btn btn-ghost btn-sm"
                              title="Edit Inquiry"
                              style={{ padding: "4px 6px" }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            {/* Quotation Generator Button */}
                            <button
                              id={`quotation-inquiry-${inq.id}`}
                              onClick={() => setQuotationInquiry(inq)}
                              className="btn btn-sm"
                              style={{
                                background: "rgba(0, 112, 243, 0.12)",
                                color: "#0070f3",
                                border: "1px solid rgba(0, 112, 243, 0.3)",
                                padding: "3px 8px",
                                fontSize: "0.725rem",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                              title="Generate / Download Quotation"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                              </svg>
                              Quote
                            </button>

                            {!inq.job ? (
                              <button
                                id={`convert-inquiry-${inq.id}`}
                                onClick={() => handleConvert(inq.id)}
                                className="btn btn-sm"
                                style={{
                                  background: "rgba(16, 185, 129, 0.15)",
                                  color: "#10b981",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  padding: "3px 8px",
                                  fontSize: "0.725rem",
                                  fontWeight: 600,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title="Convert to Job"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                </svg>
                                Convert
                              </button>
                            ) : (
                              <Link
                                href={`/jobs/${inq.job.id}`}
                                className="chip chip-success"
                                style={{ textDecoration: "none", fontSize: "0.68rem" }}
                                title="Job Active"
                              >
                                Job ✓
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div style={{ padding: "16px", borderTop: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page * pageSize >= total}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <InquiryFormModal
          inquiry={editInquiry}
          masters={masters}
          onClose={() => { setShowModal(false); setEditInquiry(null); }}
          onSave={() => { setShowModal(false); setEditInquiry(null); load(); }}
          onConvert={(inq) => {
            setShowModal(false);
            setEditInquiry(null);
            setConvertingInquiry(inq);
          }}
        />
      )}

      {/* Convert to Job Mandatory Fields Modal */}
      {convertingInquiry && (
        <ConvertToJobModal
          inquiry={convertingInquiry}
          onClose={() => setConvertingInquiry(null)}
          onSuccess={(job) => {
            setConvertAlert({
              jobId: job.jobId,
              id: job.id,
              inqNo: convertingInquiry.inquiryNo || 0,
            });
            setConvertingInquiry(null);
            load();
          }}
        />
      )}

      {/* Inquiry Quotation Generator Modal */}
      {quotationInquiry && (
        <InquiryQuotationModal
          inquiry={quotationInquiry}
          onClose={() => setQuotationInquiry(null)}
          onSuccess={load}
        />
      )}
    </div>
  );
}
