"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { formatDate, formatDateTime, getStatusColor, getStatusLabel } from "@/lib/utils";

const JOB_STATUSES = [
  "Booking Confirmed",
  "Documents Pending",
  "Cargo Picked Up",
  "Cargo Gate in",
  "Cargo Received at Warehouse",
  "Customs Clearance in Process",
  "Customs Cleared",
  "Vessel Sailed",
  "In Transit",
  "Arrived at Destination",
  "Delivery in Process",
  "Delivered",
  "On Hold / Issue",
  "Invoice Raised",
  "Invoice Pending",
];

export default function DailyStatusPage() {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [viewMode, setViewMode] = useState<"all" | "client_wise">("all");
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [page, setPage] = useState(1);
  const [masters, setMasters] = useState<any>({});

  // Modals
  const [statusModal, setStatusModal] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [remarkModal, setRemarkModal] = useState<any>(null);
  const [newRemark, setNewRemark] = useState("");

  // DSR Email Modal
  const [emailModalClient, setEmailModalClient] = useState<any>(null);
  const [emailForm, setEmailForm] = useState({
    to: "",
    cc: "",
    shipmentType: "IMPORT",
    subject: "",
    customMessage: "",
    saveCustomerEmail: true,
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [emailTab, setEmailTab] = useState<"form" | "preview">("form");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      completed: String(activeTab === "completed"),
      page: String(page),
      pageSize: "200",
    });
    if (search) params.set("search", search);

    const res = await fetch(`/api/jobs?${params}`);
    const data = await res.json();
    setJobs(data.items ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [activeTab, search, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/masters").then((r) => r.json()).then(setMasters).catch(() => {});
  }, []);

  // Group jobs client-wise
  const clientGroups = useMemo(() => {
    const groups: Record<string, { clientName: string; customerId?: string; email?: string; jobs: any[] }> = {};
    for (const job of jobs) {
      const party = (job.partyName || "Unassigned").trim();
      if (!groups[party]) {
        groups[party] = {
          clientName: party,
          customerId: job.customerId,
          email: job.customer?.email || "",
          jobs: [],
        };
      }
      groups[party].jobs.push(job);
    }
    return Object.values(groups).sort((a, b) => b.jobs.length - a.jobs.length);
  }, [jobs]);

  // Unique client list for filter dropdown
  const uniqueClients = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.partyName) set.add(j.partyName.trim());
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered jobs list based on client selection
  const displayedJobs = useMemo(() => {
    if (!selectedClient) return jobs;
    return jobs.filter((j) => j.partyName?.trim() === selectedClient.trim());
  }, [jobs, selectedClient]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !statusModal) return;
    await fetch(`/api/jobs/${statusModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStatus: newStatus, statusNote }),
    });
    setStatusModal(null);
    setNewStatus("");
    setStatusNote("");
    load();
  };

  const handleAddRemark = async () => {
    if (!newRemark.trim() || !remarkModal) return;
    await fetch(`/api/jobs/${remarkModal.id}/remarks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: newRemark }),
    });
    setRemarkModal(null);
    setNewRemark("");
    load();
  };

  // ─────────────────────────────────────────────
  // EXCEL & PDF EXPORT UTILITIES FOR CLIENT-WISE DSR
  // ─────────────────────────────────────────────
  const handleExportClientExcel = async (clientName: string, clientJobsList?: any[]) => {
    const targetJobs = clientJobsList || displayedJobs.filter((j) => !clientName || j.partyName === clientName);
    if (targetJobs.length === 0) {
      alert("No shipments available to export for this client.");
      return;
    }

    const XLSX = await import("xlsx");
    const rows = targetJobs.map((job, idx) => ({
      "SR NO.": idx + 1,
      "JOB NO.": job.jobId,
      "HBL NO.": job.hblNo ?? "—",
      "MBL NO.": job.mblNo ?? "—",
      "SHIPPER": job.shipper ?? "—",
      "CONSIGNEE": job.consignee ?? "—",
      "POL": job.pol,
      "POD": job.pod,
      "ETD": formatDate(job.etd),
      "ETA": formatDate(job.eta),
      "SHIPPING LINE": job.liner?.name ?? "—",
      "CONTAINER / VOLUME": job.volume || job.containerType || "—",
      "FCL/LCL": job.fclLcl ?? "FCL",
      "COMMODITY": job.commodity ?? "—",
      "STATUS": getStatusLabel(job.currentStatus),
      "REMARKS": job.remarksList?.[0]?.note ?? "—",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 8 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
      { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
      { wch: 18 }, { wch: 20 }, { wch: 10 }, { wch: 20 }, { wch: 22 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Client DSR");
    const safeClient = (clientName || "All").replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `SVIL_DSR_${safeClient}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportClientPdf = async (clientName: string, clientJobsList?: any[]) => {
    const targetJobs = clientJobsList || displayedJobs.filter((j) => !clientName || j.partyName === clientName);
    if (targetJobs.length === 0) {
      alert("No shipments available to export for this client.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      // Brand Header Banner
      doc.setFillColor(15, 23, 42); // Dark Navy #0f172a
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 50, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SIDDHI VINAYAK INTERNATIONAL LOGISTICS", 40, 32);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Daily Status Report (DSR) • ${today}`, doc.internal.pageSize.getWidth() - 200, 32);

      // Client Info Subheader
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(`Client: ${clientName || "All Clients"}`, 40, 75);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Total Shipments in Report: ${targetJobs.length}`, 40, 90);

      // Table Generation
      const tableRows = targetJobs.map((j, i) => [
        i + 1,
        j.jobId,
        j.hblNo || "—",
        j.mblNo || "—",
        `${j.pol} → ${j.pod}`,
        formatDate(j.etd),
        formatDate(j.eta),
        j.liner?.name || "—",
        j.volume || "—",
        getStatusLabel(j.currentStatus),
        j.remarksList?.[0]?.note || "—",
      ]);

      autoTable(doc, {
        startY: 105,
        head: [["#", "Job ID", "HBL No", "MBL No", "Route", "ETD", "ETA", "Liner", "Vol", "Status", "Latest Update"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [0, 86, 179],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 65, fontStyle: "bold" },
          2: { cellWidth: 70 },
          3: { cellWidth: 70 },
          4: { cellWidth: 95 },
          5: { cellWidth: 55 },
          6: { cellWidth: 55 },
          7: { cellWidth: 65 },
          8: { cellWidth: 50 },
          9: { cellWidth: 80, fontStyle: "bold" },
          10: { cellWidth: "auto" },
        },
        margin: { left: 40, right: 40 },
      });

      const safeClient = (clientName || "All").replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`SVIL_DSR_${safeClient}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      console.error("PDF Export error:", e);
      alert("Failed to export PDF: " + (e.message || "Unknown error"));
    }
  };

  // ─────────────────────────────────────────────
  // EMAIL DISPATCH MODAL HANDLERS
  // ─────────────────────────────────────────────
  const openEmailModal = (clientObj: { clientName: string; customerId?: string; email?: string; jobs: any[] }) => {
    const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const firstJobExim = clientObj.jobs[0]?.shipmentType?.toUpperCase() === "IM" ? "IMPORT" : "IMPORT";

    setEmailModalClient(clientObj);
    setEmailForm({
      to: clientObj.email || "",
      cc: "",
      shipmentType: firstJobExim,
      subject: `${firstJobExim} - (DSR) - ${today} - ${clientObj.clientName.toUpperCase()}`,
      customMessage: "",
      saveCustomerEmail: true,
    });
    setEmailFeedback(null);
    setEmailTab("form");
  };

  const handleSendDsrEmail = async () => {
    if (!emailModalClient) return;
    if (!emailForm.to.trim()) {
      setEmailFeedback({ type: "error", message: "Please enter a recipient email address." });
      return;
    }

    setSendingEmail(true);
    setEmailFeedback(null);

    try {
      const res = await fetch("/api/dsr/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: emailModalClient.clientName,
          customerId: emailModalClient.customerId,
          to: emailForm.to,
          cc: emailForm.cc,
          subject: emailForm.subject,
          customMessage: emailForm.customMessage,
          shipmentType: emailForm.shipmentType,
          saveCustomerEmail: emailForm.saveCustomerEmail,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setEmailFeedback({
          type: "success",
          message: `DSR successfully dispatched to ${emailForm.to}! (${data.shipmentsCount} shipments attached)`,
        });
        load();
      } else {
        setEmailFeedback({
          type: "error",
          message: data.error || "Failed to send email.",
        });
      }
    } catch (e: any) {
      setEmailFeedback({ type: "error", message: e.message || "Network error sending email." });
    } finally {
      setSendingEmail(false);
    }
  };

  const isOverdue = (job: any) =>
    job.eta && new Date(job.eta) < new Date() && job.currentStatus !== "DELIVERED" && job.currentStatus !== "COMPLETED";

  const hasMissingDocs = (job: any) => !job.hblNo || !job.mblNo;

  const getRowClass = (job: any) => {
    if (job.attentionFlag || isOverdue(job)) return "row-warning";
    return "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─────────────────────────────────────────────
         HEADER & GLOBAL ACTIONS
         ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>
            Daily Status Report (DSR)
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {displayedJobs.length} shipments {selectedClient ? `for ${selectedClient}` : "across all clients"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* Active / Completed Toggle */}
          <div style={{ display: "flex", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
            <button
              id="dsr-tab-active"
              onClick={() => { setActiveTab("active"); setPage(1); }}
              className="btn btn-sm"
              style={{ borderRadius: 0, background: activeTab === "active" ? "#0070f3" : "transparent", color: activeTab === "active" ? "#ffffff" : "var(--text-muted)" }}
            >
              Active Shipments
            </button>
            <button
              id="dsr-tab-completed"
              onClick={() => { setActiveTab("completed"); setPage(1); }}
              className="btn btn-sm"
              style={{ borderRadius: 0, background: activeTab === "completed" ? "#0070f3" : "transparent", color: activeTab === "completed" ? "#ffffff" : "var(--text-muted)" }}
            >
              Completed
            </button>
          </div>

          {/* View Mode Toggle: All Table vs Client-Wise Hub */}
          <div style={{ display: "flex", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", overflow: "hidden" }}>
            <button
              id="view-all-table"
              onClick={() => setViewMode("all")}
              className="btn btn-sm"
              style={{ borderRadius: 0, background: viewMode === "all" ? "#0070f3" : "transparent", color: viewMode === "all" ? "#ffffff" : "var(--text-muted)" }}
            >
              Master Table
            </button>
            <button
              id="view-client-wise"
              onClick={() => setViewMode("client_wise")}
              className="btn btn-sm"
              style={{ borderRadius: 0, background: viewMode === "client_wise" ? "#0070f3" : "transparent", color: viewMode === "client_wise" ? "#ffffff" : "var(--text-muted)" }}
            >
              Client-Wise DSR Hub
            </button>
          </div>

          {/* Export Full DSR */}
          <button
            id="btn-export-full-dsr"
            onClick={() => handleExportClientExcel(selectedClient)}
            className="btn btn-secondary btn-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Export DSR (Excel)
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
         CLIENT-WISE SELECTION & WORKFLOW PANEL
         ───────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
              Client DSR Dispatch & Export:
            </span>
            <select
              id="select-client-dsr"
              className="form-input"
              style={{ maxWidth: "260px", padding: "6px 12px", fontSize: "0.825rem" }}
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">— Select Client / Party —</option>
              {uniqueClients.map((client) => {
                const count = jobs.filter((j) => j.partyName?.trim() === client).length;
                return (
                  <option key={client} value={client}>
                    {client} ({count} active {count === 1 ? "job" : "jobs"})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Client Actions if a client is selected */}
          {selectedClient && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                id="btn-download-client-excel"
                onClick={() => handleExportClientExcel(selectedClient)}
                className="btn btn-secondary btn-sm"
                title={`Download ${selectedClient} DSR as Excel`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                </svg>
                Download Excel
              </button>

              <button
                id="btn-download-client-pdf"
                onClick={() => handleExportClientPdf(selectedClient)}
                className="btn btn-secondary btn-sm"
                title={`Download ${selectedClient} DSR as PDF`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                Download PDF
              </button>

              <button
                id="btn-email-client-dsr"
                onClick={() => {
                  const clientObj = clientGroups.find((g) => g.clientName === selectedClient) || {
                    clientName: selectedClient,
                    jobs: displayedJobs,
                  };
                  openEmailModal(clientObj);
                }}
                className="btn btn-primary btn-sm"
                style={{ background: "#0070f3" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                Send DSR to Customer (Email)
              </button>

              <button
                onClick={() => setSelectedClient("")}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer", padding: "4px" }}
              >
                Clear ✕
              </button>
            </div>
          )}
        </div>

        {/* Quick Click Client Pills */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "4px" }}>Quick Clients:</span>
          {clientGroups.slice(0, 8).map((grp) => {
            const isSelected = selectedClient === grp.clientName;
            return (
              <button
                key={grp.clientName}
                onClick={() => setSelectedClient(isSelected ? "" : grp.clientName)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected ? "1px solid #0070f3" : "1px solid var(--border-color)",
                  background: isSelected ? "rgba(0, 112, 243, 0.18)" : "var(--card-hover-bg)",
                  color: isSelected ? "#0070f3" : "var(--text-main)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{grp.clientName}</span>
                <span
                  style={{
                    background: isSelected ? "#0070f3" : "rgba(255, 255, 255, 0.1)",
                    color: "#ffffff",
                    padding: "0 5px",
                    borderRadius: "9999px",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                  }}
                >
                  {grp.jobs.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────
         VIEW 1: CLIENT-WISE DSR HUB (Card Grid with Direct Actions)
         ───────────────────────────────────────────── */}
      {viewMode === "client_wise" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "18px" }}>
          {clientGroups.map((grp) => {
            return (
              <div
                key={grp.clientName}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: "18px",
                  gap: "14px",
                  border: selectedClient === grp.clientName ? "2px solid #0070f3" : "1px solid var(--border-color)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
                        {grp.clientName}
                      </h3>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {grp.email ? `Email: ${grp.email}` : "Email: Not configured (enter in modal)"}
                      </div>
                    </div>
                    <span
                      style={{
                        background: "rgba(0, 112, 243, 0.15)",
                        color: "#0070f3",
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        fontSize: "0.725rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {grp.jobs.length} Active {grp.jobs.length === 1 ? "Job" : "Jobs"}
                    </span>
                  </div>

                  {/* Summary of Active Job Numbers */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "12px" }}>
                    {grp.jobs.slice(0, 4).map((j) => (
                      <span key={j.id} className="chip chip-gray" style={{ fontSize: "0.68rem", fontFamily: "monospace" }}>
                        {j.jobId} ({getStatusLabel(j.currentStatus)})
                      </span>
                    ))}
                    {grp.jobs.length > 4 && (
                      <span className="chip chip-gray" style={{ fontSize: "0.68rem" }}>
                        +{grp.jobs.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleExportClientExcel(grp.clientName, grp.jobs)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, minWidth: "90px", justifyContent: "center" }}
                    title="Download Excel DSR"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                    </svg>
                    Excel
                  </button>

                  <button
                    onClick={() => handleExportClientPdf(grp.clientName, grp.jobs)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, minWidth: "85px", justifyContent: "center" }}
                    title="Download PDF DSR"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    </svg>
                    PDF
                  </button>

                  <button
                    onClick={() => openEmailModal(grp)}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 2, minWidth: "120px", justifyContent: "center", background: "#0070f3" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                    Email DSR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─────────────────────────────────────────────
           VIEW 2: MASTER TABLE VIEW
           ───────────────────────────────────────────── */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {/* Filter & Legend Strip */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <input
              id="dsr-search"
              type="search"
              placeholder="Search Job ID, Party, HBL, MBL..."
              className="form-input"
              style={{ maxWidth: "280px" }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />

            <div style={{ display: "flex", gap: "16px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", background: "hsl(38 92% 50% / 0.5)", borderRadius: "2px" }}></span>
                Overdue ETA / Attention Flag
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "10px", height: "10px", background: "hsl(0 72% 51% / 0.4)", borderRadius: "2px" }}></span>
                Missing HBL/MBL
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Party (Client)</th>
                  <th>POL → POD</th>
                  <th>HBL / MBL</th>
                  <th>Liner</th>
                  <th>ETD</th>
                  <th>ETA</th>
                  <th>Volume</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "#a1a1aa" }}>Loading DSR shipments...</td></tr>
                ) : displayedJobs.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "#a1a1aa" }}>No shipments found matching criteria</td></tr>
                ) : displayedJobs.map((job) => {
                  const rowClass = getRowClass(job);
                  const missingDocs = hasMissingDocs(job);
                  return (
                    <tr key={job.id} className={missingDocs && !job.isCompleted ? "row-danger" : rowClass}>
                      <td>
                        <Link href={`/jobs/${job.id}`} style={{ color: "#0070f3", fontWeight: 700, textDecoration: "none" }}>
                          {job.jobId}
                        </Link>
                        {job.legacyJobId && <div style={{ fontSize: "0.65rem", color: "#71717a" }}>{job.legacyJobId}</div>}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {job.partyName}
                        {job.attentionFlag && <span className="chip chip-warning" style={{ marginLeft: "6px", fontSize: "0.6rem", padding: "1px 6px" }}>ATTN</span>}
                      </td>
                      <td style={{ color: "#a1a1aa", whiteSpace: "nowrap" }}>{job.pol} → {job.pod}</td>
                      <td>
                        <div style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                          <div style={{ color: job.hblNo ? "var(--text-main)" : "#f87171" }}>
                            HBL: {job.hblNo ?? "MISSING"}
                          </div>
                          <div style={{ color: job.mblNo ? "var(--text-main)" : "#f87171" }}>
                            MBL: {job.mblNo ?? "MISSING"}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>{job.liner?.name ?? "—"}</td>
                      <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{formatDate(job.etd)}</td>
                      <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        <div>{formatDate(job.eta)}</div>
                        {isOverdue(job) && <span className="chip chip-danger" style={{ fontSize: "0.6rem", padding: "1px 6px", marginTop: "2px" }}>OVERDUE</span>}
                      </td>
                      <td style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>{job.volume ?? "—"}</td>
                      <td>
                        <span className={`chip ${getStatusColor(job.currentStatus)}`} style={{ fontSize: "0.7rem" }}>
                          {getStatusLabel(job.currentStatus)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            id={`update-status-${job.id}`}
                            onClick={() => { setStatusModal(job); setNewStatus(job.currentStatus); }}
                            className="btn btn-secondary btn-sm"
                            title="Update Status"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="16 16 12 12 8 16"/><line x1="12" x2="12" y1="12" y2="21"/>
                              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                            </svg>
                          </button>
                          <button
                            id={`add-remark-${job.id}`}
                            onClick={() => setRemarkModal(job)}
                            className="btn btn-ghost btn-sm"
                            title="Add Remark"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         MODAL 1: SEND DSR TO CUSTOMER (EMAIL MODAL)
         ───────────────────────────────────────────── */}
      {emailModalClient && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !sendingEmail) setEmailModalClient(null); }}>
          <div className="modal-content" style={{ maxWidth: "680px", maxHeight: "90vh", overflowY: "auto" }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)" }}>
                  Send Client DSR via Email
                </h2>
                <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Client: <strong style={{ color: "#0070f3" }}>{emailModalClient.clientName}</strong> ({emailModalClient.jobs.length} active shipments)
                </p>
              </div>
              <button
                onClick={() => setEmailModalClient(null)}
                className="btn btn-ghost btn-sm"
                disabled={sendingEmail}
              >
                ✕
              </button>
            </div>

            {/* Tabs: Email Form vs Visual Template Preview */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "18px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
              <button
                onClick={() => setEmailTab("form")}
                className="btn btn-sm"
                style={{ background: emailTab === "form" ? "#0070f3" : "transparent", color: emailTab === "form" ? "#ffffff" : "var(--text-muted)" }}
              >
                Email Setup & Details
              </button>
              <button
                onClick={() => setEmailTab("preview")}
                className="btn btn-sm"
                style={{ background: emailTab === "preview" ? "#0070f3" : "transparent", color: emailTab === "preview" ? "#ffffff" : "var(--text-muted)" }}
              >
                Client Email Preview
              </button>
            </div>

            {emailFeedback && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  marginBottom: "16px",
                  background: emailFeedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  color: emailFeedback.type === "success" ? "#10b981" : "#ef4444",
                  border: `1px solid ${emailFeedback.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                }}
              >
                {emailFeedback.message}
              </div>
            )}

            {emailTab === "form" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* To Recipient */}
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    To (Customer Email) *
                  </label>
                  <input
                    id="email-to-input"
                    type="email"
                    placeholder="e.g. logistics@client.com"
                    className="form-input"
                    value={emailForm.to}
                    onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))}
                    required
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
                    <input
                      id="save-customer-email-cb"
                      type="checkbox"
                      checked={emailForm.saveCustomerEmail}
                      onChange={(e) => setEmailForm((f) => ({ ...f, saveCustomerEmail: e.target.checked }))}
                      style={{ accentColor: "#0070f3" }}
                    />
                    <label htmlFor="save-customer-email-cb" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Save this email to Customer Master record for future DSR dispatches
                    </label>
                  </div>
                </div>

                {/* CC Recipient */}
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    CC (Optional)
                  </label>
                  <input
                    id="email-cc-input"
                    type="text"
                    placeholder="e.g. operations@siddhivinayaklogistics.co.in, sales@siddhivinayaklogistics.co.in"
                    className="form-input"
                    value={emailForm.cc}
                    onChange={(e) => setEmailForm((f) => ({ ...f, cc: e.target.value }))}
                  />
                </div>

                {/* Shipment Type & Subject */}
                <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Type
                    </label>
                    <select
                      className="form-input"
                      value={emailForm.shipmentType}
                      onChange={(e) => {
                        const type = e.target.value;
                        const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                        setEmailForm((f) => ({
                          ...f,
                          shipmentType: type,
                          subject: `${type} - (DSR) - ${today} - ${emailModalClient.clientName.toUpperCase()}`,
                        }));
                      }}
                    >
                      <option value="IMPORT">IMPORT</option>
                      <option value="EXPORT">EXPORT</option>
                      <option value="GENERAL">GENERAL</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                      Subject Line
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Custom Note */}
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "6px" }}>
                    Additional Note / Message (Optional)
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="Any specific note for this client..."
                    value={emailForm.customMessage}
                    onChange={(e) => setEmailForm((f) => ({ ...f, customMessage: e.target.value }))}
                  />
                </div>

                {/* Attachment Info Box */}
                <div
                  style={{
                    background: "var(--card-hover-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-main)" }}>
                        SVIL_DSR_{emailModalClient.clientName.replace(/[^a-zA-Z0-9]/g, "_")}_{new Date().toISOString().slice(0, 10)}.xlsx
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                        Auto-generated client spreadsheet with {emailModalClient.jobs.length} tracking records
                      </div>
                    </div>
                  </div>
                  <span className="chip chip-success" style={{ fontSize: "0.68rem" }}>
                    Auto-attached
                  </span>
                </div>
              </div>
            ) : (
              /* Visual Email Preview matching Customer Image */
              <div
                style={{
                  background: "#ffffff",
                  color: "#1e293b",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  overflow: "hidden",
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.08)",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                {/* Top Company Header */}
                <div style={{ padding: "12px 18px", fontSize: "14px", fontWeight: 700, color: "#0f172a", borderBottom: "2px solid #0f172a" }}>
                  Siddhi Vinayak International Logistics, India
                </div>

                {/* Blue Banner */}
                <div style={{ background: "#0056b3", color: "#ffffff", padding: "12px 18px", fontSize: "13px", fontWeight: 800, textAlign: "right" }}>
                  {emailForm.shipmentType} - <span style={{ background: "#f59e0b", color: "#000000", padding: "1px 5px", borderRadius: "2px" }}>(DSR)</span> - {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - {emailModalClient.clientName.toUpperCase()}
                </div>

                {/* Email Body */}
                <div style={{ padding: "24px 20px", fontSize: "13px", lineHeight: 1.6, color: "#334155" }}>
                  <div style={{ fontWeight: 600, marginBottom: "14px", color: "#0f172a" }}>Dear Sir/Madam,</div>
                  <p>Please find the attached file for {emailForm.shipmentType.toLowerCase()} daily status report of your shipments.</p>
                  
                  {emailForm.customMessage && (
                    <p style={{ background: "#f8fafc", padding: "8px 12px", borderLeft: "3px solid #0056b3", fontStyle: "italic" }}>
                      {emailForm.customMessage}
                    </p>
                  )}

                  <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "13px", letterSpacing: "3px", margin: "24px 0 16px 0" }}>
                    * * * * * * * * * * * * * * *
                  </div>

                  <div style={{ textAlign: "center", fontSize: "13px", fontWeight: 600, color: "#0f172a", marginBottom: "24px" }}>
                    Please visit our website <a href="https://siddhivinayaklogistics.co.in" target="_blank" style={{ color: "#0056b3", textDecoration: "underline", fontWeight: 700 }}>siddhivinayaklogistics.co.in</a> for online tracking.
                  </div>

                  <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px", fontSize: "11px", color: "#475569" }}>
                    <div style={{ fontWeight: 800, color: "#0056b3", marginBottom: "2px" }}>Note</div>
                    <div>: This is an automated email, kindly do not reply.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "22px", paddingTop: "16px", borderTop: "1px solid var(--border-color)" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setEmailModalClient(null)}
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button
                id="btn-confirm-send-dsr-email"
                className="btn btn-primary"
                onClick={handleSendDsrEmail}
                disabled={sendingEmail || !emailForm.to.trim()}
                style={{ background: "#0070f3" }}
              >
                {sendingEmail ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Generating & Sending DSR...
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Send Email to Client
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         MODAL 2: STATUS UPDATE MODAL
         ───────────────────────────────────────────── */}
      {statusModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setStatusModal(null); }}>
          <div className="modal-content" style={{ maxWidth: "480px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px" }}>
              Update Status — {statusModal.jobId}
            </h3>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>New Status</label>
              <select
                id="status-select-modal"
                className="form-input"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>{getStatusLabel(s)}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>Note (optional)</label>
              <textarea
                id="status-note-modal"
                className="form-input"
                rows={2}
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Reason for status change..."
              />
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setStatusModal(null)}>Cancel</button>
              <button id="confirm-status-update" className="btn btn-primary" onClick={handleStatusUpdate}>
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         MODAL 3: REMARK MODAL
         ───────────────────────────────────────────── */}
      {remarkModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRemarkModal(null); }}>
          <div className="modal-content" style={{ maxWidth: "480px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px" }}>
              Add Remark — {remarkModal.jobId}
            </h3>
            <textarea
              id="dsr-remark-input"
              className="form-input"
              rows={4}
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              placeholder="Enter remark..."
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button className="btn btn-secondary" onClick={() => setRemarkModal(null)}>Cancel</button>
              <button id="confirm-add-remark" className="btn btn-primary" onClick={handleAddRemark} disabled={!newRemark.trim()}>
                Add Remark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
