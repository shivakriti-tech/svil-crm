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

type TimeframeType = "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "custom" | "all";

const STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "IN_PROCESS", label: "In Process" },
  { value: "BOOKED", label: "Booked / Won" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
  { value: "COSTING_PURPOSE", label: "Costing Purpose" },
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

  const formatLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Filter states
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeType>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const followupFilter = searchParams.get("filter") === "followup";

  const handleTimeframeChange = (tf: TimeframeType) => {
    setTimeframe(tf);
    const now = new Date();
    if (tf === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date(now.getFullYear(), now.getMonth(), diff + 6);
      setFromDate(formatLocalDateString(start));
      setToDate(formatLocalDateString(end));
    } else if (tf === "last_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date(now.getFullYear(), now.getMonth(), diff + 6);
      setFromDate(formatLocalDateString(start));
      setToDate(formatLocalDateString(end));
    } else if (tf === "this_month") {
      setFromDate(formatLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(formatLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
    } else if (tf === "last_month") {
      setFromDate(formatLocalDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setToDate(formatLocalDateString(new Date(now.getFullYear(), now.getMonth(), 0)));
    } else if (tf === "this_year") {
      setFromDate(formatLocalDateString(new Date(now.getFullYear(), 0, 1)));
      setToDate(formatLocalDateString(new Date(now.getFullYear(), 11, 31)));
    } else if (tf === "all") {
      setFromDate("");
      setToDate("");
    }
    setPage(1);
  };

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
    } else if (fromDate || toDate) {
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
    }

    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    try {
      const res = await fetch(`/api/inquiries?${params}`);
      const data = await res.json();
      setInquiries(data.items ?? []);
      setTotal(data.total ?? 0);
      if (data.workload) setWorkload(data.workload);
    } catch (err) {
      console.error("Failed to fetch inquiries", err);
    } finally {
      setLoading(false);
    }
  }, [search, status, responsible, fromDate, toDate, page, followupFilter]);

  useEffect(() => {
    load();
  }, [load]);

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
      "Type": inq.inquiryType || "Export",
      "Inco Terms": inq.incoTerms || "—",
      "Contact": inq.contactPerson,
      "Phone/Email": inq.phoneEmail,
      "POL": inq.pol || "—",
      "POD": inq.pod || "—",
      "Commodity": inq.commodity || "—",
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
    XLSX.writeFile(wb, `SVIL_Inquiries_${fromDate || "all"}_${toDate || ""}.xlsx`);
  };

  const activeEmployeeName = uniqueEmployees.find((e) => e.id === responsible)?.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
            Inquiry Management
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {total} inquiries {followupFilter ? "(follow-ups due)" : fromDate && toDate ? `(${formatDate(fromDate)} → ${formatDate(toDate)})` : "(all historical entries)"}
            {activeEmployeeName && ` • Filtered by: ${activeEmployeeName}`}
          </p>
        </div>

        {/* Action Controls & Views */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
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

      {/* Reports-Style Date Filter & Controls */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
          padding: "10px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        {/* Search & Select Filters */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", flex: "1 1 auto" }}>
          <input
            id="inquiry-search"
            type="search"
            placeholder="Search customer, POL, POD, Inco terms..."
            className="form-input"
            style={{ maxWidth: "260px", fontSize: "0.82rem", padding: "6px 10px" }}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />

          <select
            id="filter-status"
            className="form-input"
            style={{ maxWidth: "160px", fontSize: "0.82rem", padding: "6px 10px" }}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <select
            id="filter-responsible"
            className="form-input"
            style={{ maxWidth: "180px", fontSize: "0.82rem", padding: "6px 10px" }}
            value={responsible}
            onChange={(e) => { setResponsible(e.target.value); setPage(1); }}
          >
            <option value="">All Employees</option>
            {uniqueEmployees.map((e: any) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          {(search || status || responsible || timeframe !== "all" || fromDate || toDate || followupFilter) && (
            <button
              id="btn-clear-inquiry-filters"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch("");
                setStatus("");
                setResponsible("");
                handleTimeframeChange("all");
                setPage(1);
                if (followupFilter) router.push("/inquiries");
              }}
              style={{ fontSize: "0.78rem", padding: "5px 10px" }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Date Timeframe Pill Buttons (Matching Reports Module) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "var(--bg-main)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "3px 5px",
            flexWrap: "wrap",
          }}
        >
          {(
            [
              { id: "this_week", label: "Weekly" },
              { id: "this_month", label: "Monthly" },
              { id: "last_month", label: "Last Month" },
              { id: "this_year", label: "This Year" },
              { id: "all", label: "All Time" },
              { id: "custom", label: "Custom" },
            ] as { id: TimeframeType; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => handleTimeframeChange(t.id)}
              className="btn btn-sm"
              style={{
                background: timeframe === t.id ? "#0070f3" : "transparent",
                color: timeframe === t.id ? "#ffffff" : "var(--text-muted)",
                fontWeight: timeframe === t.id ? 700 : 500,
                padding: "4px 10px",
                fontSize: "0.78rem",
                borderRadius: "6px",
              }}
            >
              {t.label}
            </button>
          ))}

          {/* Date Range Inputs */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", borderLeft: "1px solid var(--border-color)", paddingLeft: "8px" }}>
            <input
              type="date"
              className="form-input"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setTimeframe("custom");
                setPage(1);
              }}
              style={{ padding: "4px 8px", fontSize: "0.78rem", width: "125px" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>to</span>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setTimeframe("custom");
                setPage(1);
              }}
              style={{ padding: "4px 8px", fontSize: "0.78rem", width: "125px" }}
            />
          </div>

          <button
            onClick={load}
            className="btn btn-secondary btn-sm"
            title="Refresh Inquiries"
            style={{ padding: "4px 8px" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* Employee Workload Bar */}
      {workload.length > 0 && (
        <div
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
                Employee Workload Distribution
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                (Click to view assigned inquiries)
              </span>
            </div>
            {responsible && (
              <button
                onClick={() => { setResponsible(""); setPage(1); }}
                style={{ background: "transparent", border: "none", color: "#0070f3", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", padding: "2px 6px" }}
              >
                Reset Employee Filter ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => { setResponsible(""); setPage(1); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 10px",
                borderRadius: "8px",
                border: "1px solid",
                fontSize: "0.76rem",
                cursor: "pointer",
                fontWeight: 600,
                background: !responsible ? "rgba(0, 112, 243, 0.15)" : "var(--bg-main)",
                borderColor: !responsible ? "#0070f3" : "var(--border-color)",
                color: !responsible ? "#0070f3" : "var(--text-muted)",
              }}
            >
              <span>All Executives</span>
              <span style={{ background: !responsible ? "#0070f3" : "var(--border-color)", color: !responsible ? "#ffffff" : "var(--text-main)", borderRadius: "10px", padding: "1px 6px", fontSize: "0.7rem", fontWeight: 700 }}>
                {total}
              </span>
            </button>

            {workload.map((w: any) => {
              const isSelected = responsible === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => { setResponsible(isSelected ? "" : w.id); setPage(1); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "5px 10px",
                    borderRadius: "8px",
                    border: "1px solid",
                    fontSize: "0.76rem",
                    cursor: "pointer",
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? "rgba(0, 112, 243, 0.15)" : "var(--bg-main)",
                    borderColor: isSelected ? "#0070f3" : "var(--border-color)",
                    color: isSelected ? "#0070f3" : "var(--text-main)",
                  }}
                >
                  <span>{w.name}</span>
                  <span style={{ background: "rgba(0, 112, 243, 0.12)", color: "#0070f3", borderRadius: "10px", padding: "1px 6px", fontSize: "0.7rem", fontWeight: 600 }}>
                    {w.active} active
                  </span>
                  {w.booked > 0 && (
                    <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderRadius: "10px", padding: "1px 6px", fontSize: "0.7rem", fontWeight: 600 }}>
                      {w.booked} won
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          <button
            onClick={() => setConvertAlert(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Content: Kanban vs Table */}
      {view === "kanban" ? (
        <KanbanBoard
          inquiries={inquiries}
          onRefresh={load}
          onEditInquiry={(inq) => { setEditInquiry(inq); setShowModal(true); }}
          onConvertInquiry={handleConvert}
          onQuotationInquiry={setQuotationInquiry}
        />
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
          {/* Scrollable container with sticky headers and sticky first 3 columns */}
          <div style={{ maxHeight: "calc(100vh - 290px)", overflow: "auto", position: "relative" }}>
            <table
              className="data-table"
              style={{
                borderCollapse: "separate",
                borderSpacing: 0,
                width: "100%",
                minWidth: "1550px",
              }}
            >
              <thead>
                <tr>
                  {/* Column 1: # (Sticky Header) */}
                  <th
                    style={{
                      position: "sticky",
                      top: 0,
                      left: 0,
                      zIndex: 25,
                      background: "var(--card-bg, #ffffff)",
                      width: "55px",
                      minWidth: "55px",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    #
                  </th>

                  {/* Column 2: Date (Sticky Header) */}
                  <th
                    style={{
                      position: "sticky",
                      top: 0,
                      left: "55px",
                      zIndex: 25,
                      background: "var(--card-bg, #ffffff)",
                      width: "105px",
                      minWidth: "105px",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    Date
                  </th>

                  {/* Column 3: Customer (Sticky Header) */}
                  <th
                    style={{
                      position: "sticky",
                      top: 0,
                      left: "160px",
                      zIndex: 25,
                      background: "var(--card-bg, #ffffff)",
                      width: "180px",
                      minWidth: "180px",
                      borderRight: "2px solid var(--border-color)",
                      borderBottom: "1px solid var(--border-color)",
                      boxShadow: "3px 0 6px -2px rgba(0,0,0,0.08)",
                    }}
                  >
                    Customer
                  </th>

                  {/* Remaining Columns (Sticky Top Header only) */}
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Type</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Inco Terms</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>POL → POD</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>EXIM</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Shipment</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Shipping Line</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Rate Sent</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Status</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Responsible</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Follow Up</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)" }}>Job ID</th>
                  <th style={{ position: "sticky", top: 0, zIndex: 10, background: "var(--card-bg, #ffffff)", borderBottom: "1px solid var(--border-color)", width: "130px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      Loading inquiries...
                    </td>
                  </tr>
                ) : inquiries.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                      No inquiries found matching selected filters
                    </td>
                  </tr>
                ) : (
                  inquiries.map((inq) => {
                    const isFollowUpDue = inq.followUpDate && new Date(inq.followUpDate) <= new Date();
                    return (
                      <tr key={inq.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        {/* Column 1: # (Sticky Body) */}
                        <td
                          style={{
                            position: "sticky",
                            left: 0,
                            zIndex: 4,
                            background: "var(--card-bg, #ffffff)",
                            fontWeight: 700,
                            color: "#0070f3",
                            width: "55px",
                            minWidth: "55px",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          {inq.inquiryNo}
                        </td>

                        {/* Column 2: Date (Sticky Body) */}
                        <td
                          style={{
                            position: "sticky",
                            left: "55px",
                            zIndex: 4,
                            background: "var(--card-bg, #ffffff)",
                            whiteSpace: "nowrap",
                            width: "105px",
                            minWidth: "105px",
                            borderBottom: "1px solid var(--border-color)",
                          }}
                        >
                          {formatDate(inq.inquiryDate)}
                        </td>

                        {/* Column 3: Customer (Sticky Body) */}
                        <td
                          style={{
                            position: "sticky",
                            left: "160px",
                            zIndex: 4,
                            background: "var(--card-bg, #ffffff)",
                            fontWeight: 600,
                            color: "var(--text-main)",
                            width: "180px",
                            minWidth: "180px",
                            borderRight: "2px solid var(--border-color)",
                            borderBottom: "1px solid var(--border-color)",
                            boxShadow: "3px 0 6px -2px rgba(0,0,0,0.08)",
                          }}
                        >
                          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "170px" }} title={inq.customer?.name}>
                            {inq.customer?.name}
                          </div>
                        </td>

                        {/* Column 4: Type of Inquiry (Export vs Import) */}
                        <td>
                          <span
                            className="badge"
                            style={{
                              background: inq.inquiryType === "Import" ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                              color: inq.inquiryType === "Import" ? "#d97706" : "#10b981",
                              fontWeight: 600,
                              fontSize: "0.75rem",
                            }}
                          >
                            {inq.inquiryType || "Export"}
                          </span>
                        </td>

                        {/* Column 5: Inco Terms */}
                        <td style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-main)" }}>
                          {inq.incoTerms || "—"}
                        </td>

                        {/* Column 6: POL → POD */}
                        <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {inq.pol || "—"} → {inq.pod || "—"}
                        </td>

                        {/* Column 7: EXIM */}
                        <td>
                          <span className="badge" style={{ background: "rgba(0, 112, 243, 0.12)", color: "#0070f3", fontSize: "0.75rem" }}>
                            {inq.exim}
                          </span>
                        </td>

                        {/* Column 8: Shipment Type */}
                        <td style={{ fontSize: "0.8rem" }}>{inq.shipmentType}</td>

                        {/* Column 9: Shipping Line */}
                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{inq.shippingLine?.name ?? "—"}</td>

                        {/* Column 10: Rate Sent */}
                        <td>
                          <span style={{ color: inq.rateSent ? "#10b981" : "var(--text-subtle)", fontWeight: 600, fontSize: "0.78rem" }}>
                            {inq.rateSent ? "Yes" : "No"}
                          </span>
                        </td>

                        {/* Column 11: Status */}
                        <td>
                          <span className={`badge ${getStatusColor(inq.status)}`} style={{ fontSize: "0.75rem" }}>
                            {getStatusLabel(inq.status)}
                          </span>
                        </td>

                        {/* Column 12: Responsible */}
                        <td style={{ color: "var(--text-main)", fontWeight: 500, fontSize: "0.8rem" }}>
                          {inq.responsible?.name ?? "—"}
                        </td>

                        {/* Column 13: Follow Up */}
                        <td style={{ fontSize: "0.8rem" }}>
                          {inq.followUpDate ? (
                            <span style={{ color: isFollowUpDue ? "#d97706" : "var(--text-muted)", fontWeight: isFollowUpDue ? 600 : 400 }}>
                              {formatDate(inq.followUpDate)}
                            </span>
                          ) : "—"}
                        </td>

                        {/* Column 14: Job ID */}
                        <td>
                          {inq.job ? (
                            <Link href={`/jobs/${inq.job.id}`} style={{ color: "#0070f3", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}>
                              {inq.job.jobId}
                            </Link>
                          ) : "—"}
                        </td>

                        {/* Column 15: Actions */}
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
                                fontSize: "0.72rem",
                                fontWeight: 600,
                              }}
                              title="Generate Official Quotation PDF"
                            >
                              Quote
                            </button>

                            {/* Convert to Job Button */}
                            {!inq.job && inq.status !== "CLOSE" && (
                              <button
                                id={`convert-inquiry-${inq.id}`}
                                onClick={() => handleConvert(inq.id)}
                                className="btn btn-sm"
                                style={{
                                  background: "rgba(16, 185, 129, 0.12)",
                                  color: "#10b981",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  padding: "3px 8px",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                }}
                                title="Convert to Active Job"
                              >
                                Convert
                              </button>
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
        </div>
      )}

      {/* Inquiry Form Modal */}
      {showModal && (
        <InquiryFormModal
          inquiry={editInquiry}
          masters={masters}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
          onConvert={(inq) => {
            setShowModal(false);
            setConvertingInquiry(inq);
          }}
        />
      )}

      {/* Convert to Job Modal */}
      {convertingInquiry && (
        <ConvertToJobModal
          inquiry={convertingInquiry}
          onClose={() => setConvertingInquiry(null)}
          onSuccess={(job: any) => {
            setConvertAlert({ jobId: job?.jobId || job?.id || "Created", id: job?.id, inqNo: convertingInquiry.inquiryNo });
            setConvertingInquiry(null);
            load();
          }}
        />
      )}

      {/* Quotation Generator Modal */}
      {quotationInquiry && (
        <InquiryQuotationModal
          inquiry={quotationInquiry}
          onClose={() => setQuotationInquiry(null)}
          onSuccess={() => {
            setQuotationInquiry(null);
            load();
          }}
        />
      )}
    </div>
  );
}
