"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import JobFormModal from "@/components/jobs/JobFormModal";
import JobInvoiceModal from "@/components/jobs/JobInvoiceModal";
import { generateCANPdf } from "@/lib/canPdf";
import { generateBLPdf } from "@/lib/blPdf";
import { usePermissions } from "@/hooks/usePermissions";

const JOB_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "Booking Confirmed", label: "Booking Confirmed" },
  { value: "Documents Pending", label: "Documents Pending" },
  { value: "Cargo Picked Up", label: "Cargo Picked Up" },
  { value: "Cargo Gate in", label: "Cargo Gate in" },
  { value: "Cargo Received at Warehouse", label: "Cargo Received at Warehouse" },
  { value: "Customs Clearance in Process", label: "Customs Clearance in Process" },
  { value: "Customs Cleared", label: "Customs Cleared" },
  { value: "Vessel Sailed", label: "Vessel Sailed" },
  { value: "In Transit", label: "In Transit" },
  { value: "Arrived at Destination", label: "Arrived at Destination" },
  { value: "Delivery in Process", label: "Delivery in Process" },
  { value: "Delivered", label: "Delivered" },
  { value: "On Hold / Issue", label: "On Hold / Issue" },
  { value: "Invoice Raised", label: "Invoice Raised" },
  { value: "Invoice Pending", label: "Invoice Pending" },
];

const INVOICE_STATUS_FILTER = [
  { value: "", label: "All Invoices (Generated & Pending)" },
  { value: "INVOICE_GENERATED", label: "✓ Invoice Generated / Raised" },
  { value: "INVOICE_NOT_GENERATED", label: "⏳ Pending Invoice / Not Raised" },
];

export default function JobsPage() {
  const { can, isAdmin } = usePermissions();
  const searchParams = useSearchParams();
  const completedParam = searchParams.get("completed") === "true";
  const [completed, setCompleted] = useState(completedParam);
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isScopedUser, setIsScopedUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [masters, setMasters] = useState<any>({});

  // Expandable row state
  const [expandedJobIds, setExpandedJobIds] = useState<Set<string>>(new Set());

  // Invoice Modal state
  const [selectedInvoiceJob, setSelectedInvoiceJob] = useState<any>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (invoiceStatus) params.set("invoiceStatus", invoiceStatus);
    params.set("completed", String(completed));
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();
    setJobs(data.items ?? []);
    setTotal(data.total ?? 0);
    setIsScopedUser(Boolean(data.isScopedUser));
    setLoading(false);
  }, [search, status, invoiceStatus, completed, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/masters").then((r) => r.json()).then(setMasters).catch(() => {});
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const rows = jobs.map((job) => {
      const isInv = job.invoiceStatus === "INVOICE_GENERATED" || job.finance?.invoiceStatus === "INVOICED";
      return {
        "Job ID": job.jobId,
        "Legacy ID": job.legacyJobId ?? "",
        "Party Name": job.partyName,
        "Consignee": job.consignee ?? "",
        "Shipper": job.shipper ?? "",
        "POL": job.pol,
        "POD": job.pod,
        "Container": job.containerType,
        "HBL No": job.hblNo,
        "MBL No": job.mblNo,
        "IGM No": job.igmNo ?? "",
        "Vessel / Voyage": job.vesselVoyage ?? "",
        "Liner": job.liner?.name,
        "ETD": formatDate(job.etd),
        "ETA": formatDate(job.eta),
        "Status": getStatusLabel(job.currentStatus),
        "Invoice Status": isInv ? "Invoice Raised" : "Pending Invoice",
        "Invoice No": job.invoiceNo || job.svilInvoiceNo || "",
        "Sale USD": job.finance?.saleUsd || 0,
        "Exchange Rate": job.finance?.exchangeRate || 87.5,
        "Sale INR": job.finance?.sale || 0,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Jobs");
    XLSX.writeFile(wb, `SVIL_Jobs_${completed ? "completed" : "active"}.xlsx`);
  };

  const isOverdue = (job: any) =>
    !job.isCompleted && job.eta && new Date(job.eta) < new Date() && job.currentStatus !== "DELIVERED";

  const handleDownloadCAN = (job: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    generateCANPdf({
      jobNo: job.jobId,
      igmNo: job.igmNo,
      igmDate: job.igmDate,
      mblNo: job.mblNo,
      mblDate: job.mblDate,
      hblNo: job.hblNo,
      hblDate: job.hblDate,
      forwarderHblNo: job.forwarderHblNo,
      carrierName: job.carrierName || job.liner?.name,
      cfsName: job.cfsName,
      vesselVoyage: job.vesselVoyage,
      vesselName: job.vesselName,
      voyageNo: job.voyageNo,
      etd: job.etd,
      eta: job.eta,
      origin: job.origin || job.pol,
      pol: job.pol,
      pod: job.pod,
      finalDestination: job.finalDestination || job.pod,
      incoTerm: job.incoTerm,
      itemNo: job.itemNo,
      subItemNo: job.subItemNo,
      shipmentTerms: job.shipmentTerms,
      consignee: job.consignee || job.partyName,
      notifyParty: job.notifyParty,
      shipper: job.shipper,
      marksNumbers: job.marksNumbers,
      cargoDescription: job.cargoDescription || job.commodity,
      containerNo: job.containerNo,
      sealNo: job.sealNo,
      packageType: job.packageType || "PACKAGE(S)",
      weightKgs: job.weightKgs,
      volumeCbm: job.volumeCbm || job.volume,
      preparedBy: job.responsible?.name || "SVIL Operations",
      refDate: new Date(),
    });
  };

  const handleDownloadBL = (job: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    generateBLPdf({
      blNumber: job.hblNo || job.jobId,
      referenceNo: job.legacyJobId || `REF-${job.jobId}`,
      shipper: job.shipper || job.partyName,
      consignee: job.consignee || job.partyName,
      notifyParty: job.notifyParty,
      placeOfAcceptance: job.placeOfAcceptance || job.pol,
      portOfLoading: job.pol,
      vesselVoyage: job.vesselVoyage || "EVER LIVING / 78",
      portOfDischarge: job.pod,
      placeOfDelivery: job.placeOfDelivery || job.pod,
      containerNo: job.containerNo || "NLLU4145370",
      containerType: job.containerType || "40 HC",
      sealNo: job.sealNo || "56129",
      marksNumbers: job.marksNumbers,
      cargoDescription: job.cargoDescription || job.commodity || "AUTOMATIC MACHINERY PARTS & ACCESSORIES",
      grossWeight: job.grossWeight || (job.weightKgs ? `${job.weightKgs} KGS` : "3,490.000 KGS"),
      netWeight: job.netWeight || "1,560.000 KGS",
      measurement: job.volumeCbm || job.volume,
      packagesCount: job.packageType || "5",
      freightAmount: "FREIGHT COLLECT",
      freightPayableAt: job.freightPayableAt || "DESTINATION",
      deliveryAgent: job.deliveryAgent,
      dateOfIssue: new Date(),
      shippedOnBoardDate: job.shippedOnBoardDate || job.etd || new Date(),
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            {isScopedUser ? "My Jobs & Shipments" : "Jobs & Shipments"}
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {total} {completed ? "completed" : "active"} {isScopedUser ? "assigned jobs" : "jobs"} | Click any job row to expand CAN, BL &amp; Multi-Currency details
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* Active / Completed toggle */}
          <div style={{ display: "flex", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
            <button id="tab-active" onClick={() => { setCompleted(false); setPage(1); }} className="btn btn-sm"
              style={{ borderRadius: 0, background: !completed ? "#0070f3" : "transparent", color: !completed ? "#ffffff" : "var(--text-muted)", fontWeight: 600 }}>
              Active
            </button>
            <button id="tab-completed" onClick={() => { setCompleted(true); setPage(1); }} className="btn btn-sm"
              style={{ borderRadius: 0, background: completed ? "#0070f3" : "transparent", color: completed ? "#ffffff" : "var(--text-muted)", fontWeight: 600 }}>
              Completed
            </button>
          </div>
          <button id="btn-export-jobs" onClick={handleExport} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Export Excel
          </button>
          {(isAdmin || can("jobs", "add")) && (
            <button id="btn-new-job" onClick={() => setShowModal(true)} className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New Job
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar with Invoice Status */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          id="job-search"
          type="search"
          placeholder="Search Job ID, Party, Consignee, HBL, IGM..."
          className="form-input"
          style={{ maxWidth: "320px" }}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          id="filter-job-status"
          className="form-input"
          style={{ maxWidth: "200px" }}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Invoice Status Filter for Shrikar / Finance */}
        <select
          id="filter-invoice-status"
          className="form-input"
          style={{
            maxWidth: "270px",
            borderColor: invoiceStatus === "INVOICE_GENERATED" ? "#10b981" : invoiceStatus === "INVOICE_NOT_GENERATED" ? "#f59e0b" : "var(--border-color)",
          }}
          value={invoiceStatus}
          onChange={(e) => { setInvoiceStatus(e.target.value); setPage(1); }}
        >
          {INVOICE_STATUS_FILTER.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {(search || status || invoiceStatus) && (
          <button
            onClick={() => { setSearch(""); setStatus(""); setInvoiceStatus(""); setPage(1); }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Jobs Table with Expandable Rows */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "36px" }}></th>
                <th>Job ID</th>
                <th>Party Name</th>
                <th>Route (POL &rarr; POD)</th>
                <th>ETD / ETA</th>
                <th>Container</th>
                <th>HBL / MBL</th>
                <th>Status</th>
                <th>Invoice Status</th>
                <th>Billing (USD &rarr; INR)</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading jobs...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No jobs found</td></tr>
              ) : (
                jobs.map((job) => {
                  const overdue = isOverdue(job);
                  const isExpanded = expandedJobIds.has(job.id);
                  const isInvoiceGenerated = job.invoiceStatus === "INVOICE_GENERATED" || job.finance?.invoiceStatus === "INVOICED";

                  const rateUsd = job.finance?.saleUsd || 0;
                  const rateEx = job.finance?.exchangeRate || 87.5;
                  const rateInr = job.finance?.sale || (rateUsd * rateEx);

                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        className={job.attentionFlag ? "row-warning" : overdue ? "row-danger" : ""}
                        style={{ cursor: "pointer", background: isExpanded ? "var(--card-hover-bg)" : "transparent" }}
                        onClick={() => toggleExpand(job.id)}
                      >
                        {/* Expand Chevron */}
                        <td style={{ textAlign: "center", padding: "8px 4px" }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(job.id); }}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: "4px 6px", color: "var(--text-muted)" }}
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              style={{
                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                              }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </td>

                        {/* Job ID */}
                        <td>
                          <div>
                            <Link
                              href={`/jobs/${job.id}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: "#0070f3", fontWeight: 700, textDecoration: "none", fontSize: "0.875rem" }}
                            >
                              {job.jobId}
                            </Link>
                            {job.legacyJobId && (
                              <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>Legacy: {job.legacyJobId}</div>
                            )}
                          </div>
                        </td>

                        {/* Party Name */}
                        <td style={{ fontWeight: 600, color: "var(--text-main)" }}>
                          {job.partyName}
                          {job.attentionFlag && (
                            <span style={{ marginLeft: "6px", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "1px 5px", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700 }}>
                              ATTN
                            </span>
                          )}
                        </td>

                        {/* Route */}
                        <td style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {job.pol} &rarr; {job.pod}
                        </td>

                        {/* ETD / ETA */}
                        <td style={{ whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                          <div><span style={{ color: "var(--text-subtle)", fontSize: "0.7rem", fontWeight: 600 }}>D:</span> {formatDate(job.etd) || "—"}</div>
                          <div style={{ color: overdue ? "#ef4444" : "inherit" }}><span style={{ color: "var(--text-subtle)", fontSize: "0.7rem", fontWeight: 600 }}>A:</span> {formatDate(job.eta) || "—"}</div>
                        </td>

                        {/* Container */}
                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {job.containerType ?? "—"}
                        </td>

                        {/* HBL / MBL */}
                        <td style={{ fontSize: "0.78rem", fontFamily: "monospace", color: "var(--text-main)" }}>
                          <div>H: {job.hblNo || "—"}</div>
                          <div style={{ color: "var(--text-subtle)", fontSize: "0.7rem" }}>M: {job.mblNo || "—"}</div>
                        </td>

                        {/* Status */}
                        <td>
                          <span className={`badge ${getStatusColor(job.currentStatus)}`} style={{ fontSize: "0.7rem" }}>
                            {getStatusLabel(job.currentStatus)}
                          </span>
                        </td>

                        {/* Invoice Status (Shrikar tracking feature) */}
                        <td>
                          {isInvoiceGenerated ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "0.725rem",
                                fontWeight: 700,
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Invoice Raised
                              {job.invoiceNo && <span style={{ opacity: 0.8, fontSize: "0.65rem" }}>({job.invoiceNo})</span>}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "rgba(245, 158, 11, 0.15)",
                                color: "#f59e0b",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "0.725rem",
                                fontWeight: 700,
                              }}
                            >
                              ⏳ Pending Invoice
                            </span>
                          )}
                        </td>

                        {/* Multi-Currency Billing (USD & INR Auto Converted) */}
                        <td>
                          <div style={{ fontSize: "0.8rem" }}>
                            {rateUsd > 0 && (
                              <div style={{ color: "#0070f3", fontWeight: 700 }}>
                                ${rateUsd.toLocaleString("en-US")} USD
                              </div>
                            )}
                            <div style={{ color: "#10b981", fontWeight: 700 }}>
                              ₹{rateInr.toLocaleString("en-IN")} INR
                            </div>
                          </div>
                        </td>

                        {/* Quick Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                            {/* Invoice Button */}
                            <button
                              id={`btn-invoice-${job.id}`}
                              onClick={() => setSelectedInvoiceJob(job)}
                              className="btn btn-secondary btn-sm"
                              title="Prepare / View Invoice"
                              style={{
                                background: isInvoiceGenerated ? "rgba(16, 185, 129, 0.1)" : "rgba(0, 112, 243, 0.1)",
                                color: isInvoiceGenerated ? "#10b981" : "#0070f3",
                                border: `1px solid ${isInvoiceGenerated ? "rgba(16, 185, 129, 0.3)" : "rgba(0, 112, 243, 0.3)"}`,
                                fontSize: "0.75rem",
                                padding: "4px 8px",
                                fontWeight: 600,
                              }}
                            >
                              Invoice
                            </button>

                            {/* CAN PDF */}
                            <button
                              id={`btn-can-${job.id}`}
                              onClick={(e) => handleDownloadCAN(job, e)}
                              className="btn btn-secondary btn-sm"
                              title="Download CAN (Cargo Arrival Notice)"
                              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                            >
                              CAN PDF
                            </button>

                            {/* View Job Link */}
                            <Link href={`/jobs/${job.id}`} id={`view-job-${job.id}`} className="btn btn-ghost btn-sm">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* ─────────────────────────────────────────────
                         EXPANDED ROW: FULL CAN & SHIPMENT COPY VIEW
                         ───────────────────────────────────────────── */}
                      {isExpanded && (
                        <tr style={{ background: "rgba(0, 112, 243, 0.03)" }}>
                          <td colSpan={11} style={{ padding: "18px 24px", borderTop: "none", borderBottom: "2px solid var(--border-color)" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                              {/* Top Action Bar in Accordion */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)" }}>
                                    {job.jobId} &mdash; Cargo Arrival Notice (CAN) &amp; Bill of Lading Details
                                  </span>
                                  <span className={`badge ${getStatusColor(job.currentStatus)}`}>
                                    {getStatusLabel(job.currentStatus)}
                                  </span>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <button
                                    onClick={(e) => handleDownloadCAN(job, e)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                                    </svg>
                                    Export CAN Copy (PDF)
                                  </button>
                                  <button
                                    onClick={(e) => handleDownloadBL(job, e)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, background: "rgba(245, 158, 11, 0.1)", color: "#d97706", borderColor: "rgba(245, 158, 11, 0.3)" }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                                    </svg>
                                    Export Seaway BL (PDF)
                                  </button>
                                  <button
                                    onClick={() => setSelectedInvoiceJob(job)}
                                    className="btn btn-primary btn-sm"
                                    style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", borderColor: "#10b981", fontWeight: 700 }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/>
                                    </svg>
                                    Invoice &amp; Tally Billing
                                  </button>
                                </div>
                              </div>

                              {/* 2-Column CAN Grid */}
                              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "20px" }}>
                                {/* Left Section: Parties */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "12px", background: "var(--card-bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                                  <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", margin: 0 }}>
                                    Parties on Record
                                  </h4>
                                  <div style={{ borderBottom: "1px dashed var(--border-color)", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>Consignee</span>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600, margin: "2px 0 0 0", whiteSpace: "pre-line" }}>
                                      {job.consignee || job.partyName || "—"}
                                    </p>
                                  </div>
                                  <div style={{ borderBottom: "1px dashed var(--border-color)", paddingBottom: "8px" }}>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>Notify Party</span>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600, margin: "2px 0 0 0", whiteSpace: "pre-line" }}>
                                      {job.notifyParty || "SIDDHI VINAYAK INTERNATIONAL LOGISTICS"}
                                    </p>
                                  </div>
                                  <div>
                                    <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>Shipper</span>
                                    <p style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 600, margin: "2px 0 0 0", whiteSpace: "pre-line" }}>
                                      {job.shipper || job.partyName || "—"}
                                    </p>
                                  </div>
                                </div>

                                {/* Right Section: 16 Key CAN Fields Grid */}
                                <div style={{ background: "var(--card-bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                                  <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", margin: "0 0 10px 0" }}>
                                    CAN Shipment Metadata
                                  </h4>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", fontSize: "0.8rem" }}>
                                    <div><span style={{ color: "var(--text-subtle)" }}>IGM No. / Date:</span> <strong>{job.igmNo || "—"} {job.igmDate ? ` / ${formatDate(job.igmDate)}` : ""}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>MBL No:</span> <strong>{job.mblNo || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>HBL No:</span> <strong>{job.hblNo || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>Carrier Name:</span> <strong>{job.carrierName || job.liner?.name || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>CFS Name:</span> <strong>{job.cfsName || "JWR LOGISTICS PRIVATE LIMITED"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>Vessel / Voyage:</span> <strong>{job.vesselVoyage || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>ETD (Departure):</span> <strong>{formatDate(job.etd) || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>ETA (Arrival):</span> <strong>{formatDate(job.eta) || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>Origin:</span> <strong>{job.origin || job.pol || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>POL &rarr; POD:</span> <strong>{job.pol} &rarr; {job.pod}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>Final Destination:</span> <strong>{job.finalDestination || job.pod || "—"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>Inco Term:</span> <strong>{job.incoTerm || "Ex Works"}</strong></div>
                                    <div><span style={{ color: "var(--text-subtle)" }}>Shipment Terms:</span> <strong>{job.shipmentTerms || "LCL/LCL"}</strong></div>
                                  </div>
                                </div>
                              </div>

                              {/* Cargo Table Preview inside Accordion */}
                              <div style={{ background: "var(--card-bg)", borderRadius: "10px", border: "1px solid var(--border-color)", overflow: "hidden" }}>
                                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <h4 style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)", margin: 0, textTransform: "uppercase" }}>
                                    Cargo &amp; Container Specifications
                                  </h4>
                                  <Link href={`/jobs/${job.id}`} style={{ fontSize: "0.75rem", color: "#0070f3", textDecoration: "none", fontWeight: 600 }}>
                                    Full Editor &rarr;
                                  </Link>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", padding: "12px 14px", gap: "10px", fontSize: "0.8rem" }}>
                                  <div><span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem" }}>Container No</span><strong>{job.containerNo || job.containerType || "—"}</strong></div>
                                  <div><span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem" }}>Seal No</span><strong>{job.sealNo || "—"}</strong></div>
                                  <div><span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem" }}>Package Type</span><strong>{job.packageType || "4 PACKAGE(S)"}</strong></div>
                                  <div><span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem" }}>Weight (KGS)</span><strong>{job.weightKgs || job.grossWeight || "—"}</strong></div>
                                  <div><span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem" }}>Volume (CBM)</span><strong>{job.volumeCbm || job.volume || "—"}</strong></div>
                                  <div><span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem" }}>Marks &amp; Numbers</span><strong>{job.marksNumbers || "SL MP 1 4 4"}</strong></div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => p + 1)} disabled={page * pageSize >= total}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* New Job Modal */}
      {showModal && (
        <JobFormModal
          masters={masters}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); load(); }}
        />
      )}

      {/* Job Invoice / Billing Modal */}
      {selectedInvoiceJob && (
        <JobInvoiceModal
          job={selectedInvoiceJob}
          onClose={() => setSelectedInvoiceJob(null)}
          onSave={() => {
            setSelectedInvoiceJob(null);
            load();
          }}
        />
      )}
    </div>
  );
}
