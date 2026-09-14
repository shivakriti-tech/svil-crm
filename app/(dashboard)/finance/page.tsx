"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from "recharts";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

type TimeframeType = "all" | "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "custom";
type TabType = "ledger" | "weekly" | "monthly" | "charts";

const INVOICE_STATUSES = ["", "PENDING", "INVOICED", "PAID", "OVERDUE"];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<TabType>("ledger");
  const [timeframe, setTimeframe] = useState<TimeframeType>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<any>({
    totalSale: 0,
    totalBuy: 0,
    totalCost: 0,
    totalMargin: 0,
    marginPercentage: "0.0",
    totalSaleUsd: 0,
    paidAmount: 0,
    paidCount: 0,
    invoicedAmount: 0,
    invoicedCount: 0,
    pendingAmount: 0,
    pendingCount: 0,
  });
  const [weeklyReport, setWeeklyReport] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [page, setPage] = useState(1);

  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [cellValue, setCellValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "100" });
    params.set("timeframe", timeframe);
    if (timeframe === "custom" && fromDate && toDate) {
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);
    }
    if (search) params.set("search", search);
    if (invoiceStatus) params.set("invoiceStatus", invoiceStatus);

    try {
      const res = await fetch(`/api/finance?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      if (data.summary) setSummary(data.summary);
      if (data.weeklyReport) setWeeklyReport(data.weeklyReport);
      if (data.monthlyReport) setMonthlyReport(data.monthlyReport);
      if (data.chartData) setChartData(data.chartData);
    } catch (e) {
      console.error("Failed to load finance data", e);
    } finally {
      setLoading(false);
    }
  }, [search, invoiceStatus, page, timeframe, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTimeframeChange = (tf: TimeframeType) => {
    setTimeframe(tf);
    setPage(1);
    const now = new Date();
    if (tf === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(end.toISOString().split("T")[0]);
    } else if (tf === "last_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(end.toISOString().split("T")[0]);
    } else if (tf === "this_month") {
      setFromDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
      setToDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]);
    } else if (tf === "last_month") {
      setFromDate(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]);
      setToDate(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]);
    } else if (tf === "this_year") {
      setFromDate(new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0]);
      setToDate(new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0]);
    }
  };

  const handleCellEdit = async (financeId: string, field: string, value: string) => {
    setSaving(true);
    await fetch(`/api/finance/${financeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(false);
    setEditingCell(null);
    load();
  };

  // Export functions
  const handleExportLedger = async () => {
    const XLSX = await import("xlsx");
    const rows = items.map((f) => ({
      "Job ID": f.job?.jobId,
      "Party": f.job?.partyName,
      "POL": f.job?.pol,
      "POD": f.job?.pod,
      "Job Status": getStatusLabel(f.job?.currentStatus),
      "Buy (INR)": Number(f.buy ?? 0),
      "Sale (INR)": Number(f.sale ?? 0),
      "Cost (INR)": Number(f.cost ?? 0),
      "Margin (INR)": Number(f.margin ?? 0),
      "Invoice Ref": f.invoicingRef ?? "",
      "Invoice Status": f.invoiceStatus || (f.job?.invoiceStatus === "INVOICE_GENERATED" ? "INVOICED" : "PENDING"),
      "Courier Tracking": f.courier ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finance Ledger");
    XLSX.writeFile(wb, `SVIL_Finance_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportWeeklyReport = async () => {
    const XLSX = await import("xlsx");
    const rows = weeklyReport.map((w) => ({
      "Week Period": w.period,
      "Total Jobs": w.jobCount,
      "Total Buy (INR)": w.buy,
      "Total Revenue / Sale (INR)": w.sale,
      "Net Margin (INR)": w.margin,
      "Margin (%)": w.sale > 0 ? `${((w.margin / w.sale) * 100).toFixed(1)}%` : "0.0%",
      "Invoices Raised": w.invoicedCount,
      "Pending Invoices": w.pendingCount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Finance Report");
    XLSX.writeFile(wb, `SVIL_Weekly_Finance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportMonthlyReport = async () => {
    const XLSX = await import("xlsx");
    const rows = monthlyReport.map((m) => ({
      "Month": m.period,
      "Total Jobs": m.jobCount,
      "Total Buy (INR)": m.buy,
      "Total Revenue / Sale (INR)": m.sale,
      "Net Margin (INR)": m.margin,
      "Margin (%)": m.sale > 0 ? `${((m.margin / m.sale) * 100).toFixed(1)}%` : "0.0%",
      "Invoices Raised": m.invoicedCount,
      "Pending Invoices": m.pendingCount,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Finance Report");
    XLSX.writeFile(wb, `SVIL_Monthly_Finance_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const fmt = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
  const fmtUsd = (n: number) => `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  const invoiceStatusColor: Record<string, string> = {
    PENDING: "#f59e0b",
    INVOICED: "#0070f3",
    PAID: "#10b981",
    OVERDUE: "#ef4444",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Finance &amp; Invoicing
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Real-time ledger, multi-currency invoicing, weekly &amp; monthly financial statements
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {activeTab === "ledger" && (
            <button id="btn-export-finance" onClick={handleExportLedger} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Export Ledger (Excel)
            </button>
          )}
          {activeTab === "weekly" && (
            <button onClick={handleExportWeeklyReport} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Export Weekly Report (Excel)
            </button>
          )}
          {activeTab === "monthly" && (
            <button onClick={handleExportMonthlyReport} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              Export Monthly Report (Excel)
            </button>
          )}
        </div>
      </div>

      {/* Global Timeframe Filter Bar */}
      <div className="glass-card" style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          {/* Preset Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Time" },
              { id: "this_week", label: "This Week" },
              { id: "last_week", label: "Last Week" },
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "this_year", label: "This Year" },
              { id: "custom", label: "Custom Range" },
            ].map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => handleTimeframeChange(tf.id as TimeframeType)}
                className="btn btn-sm"
                style={{
                  background: timeframe === tf.id ? "#0070f3" : "transparent",
                  color: timeframe === tf.id ? "#ffffff" : "var(--text-main)",
                  fontWeight: timeframe === tf.id ? 700 : 500,
                  border: timeframe === tf.id ? "1px solid #0070f3" : "1px solid var(--border-color)",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  padding: "6px 12px",
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {timeframe === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>to</span>
              <input
                type="date"
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary KPI Cards for Selected Period */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        {/* Total Billed Revenue */}
        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase" }}>Total Billed Revenue</span>
            <span style={{ fontSize: "0.7rem", color: "#10b981", background: "rgba(16, 185, 129, 0.15)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
              {summary.marginPercentage}% Margin
            </span>
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#10b981" }}>
            {fmt(summary.totalSale)}
          </div>
          {summary.totalSaleUsd > 0 && (
            <div style={{ fontSize: "0.75rem", color: "#0070f3", marginTop: "3px", fontWeight: 600 }}>
              ≈ {fmtUsd(summary.totalSaleUsd)} USD
            </div>
          )}
        </div>

        {/* Total Freight & Ops Cost */}
        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Total Buy &amp; Ops Cost
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ea580c" }}>
            {fmt(summary.totalBuy + summary.totalCost)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
            Buy: {fmt(summary.totalBuy)} | Cost: {fmt(summary.totalCost)}
          </div>
        </div>

        {/* Net Profit Margin */}
        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Net Profit Margin
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: summary.totalMargin >= 0 ? "#0070f3" : "#ef4444" }}>
            {fmt(summary.totalMargin)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
            Avg Profit: {items.length > 0 ? fmt(Math.round(summary.totalMargin / items.length)) : "₹0"} / job
          </div>
        </div>

        {/* Invoicing Status & Collection */}
        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Invoices Raised vs Pending
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
            <span style={{ color: "#10b981" }}>{summary.invoicedCount} Raised</span>
            <span style={{ color: "var(--text-subtle)", margin: "0 6px" }}>/</span>
            <span style={{ color: "#f59e0b" }}>{summary.pendingCount} Pending</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "3px" }}>
            Raised: {fmt(summary.invoicedAmount + summary.paidAmount)}
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
        {[
          { id: "ledger", label: "Ledger & Invoicing" },
          { id: "weekly", label: "Weekly Report", count: weeklyReport.length },
          { id: "monthly", label: "Monthly Report", count: monthlyReport.length },
          { id: "charts", label: "Financial Analytics" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as TabType)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? "#0070f3" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "var(--text-muted)",
              fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  background: activeTab === tab.id ? "rgba(255,255,255,0.25)" : "var(--border-color)",
                  color: activeTab === tab.id ? "#ffffff" : "var(--text-main)",
                  fontSize: "0.68rem",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────
         TAB 1: LEDGER & INVOICING (EDITABLE TABLE)
         ───────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Table Filters */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            <input
              id="finance-search"
              type="search"
              placeholder="Search Job ID, Party Name..."
              className="form-input"
              style={{ maxWidth: "280px" }}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select
              id="filter-invoice-status"
              className="form-input"
              style={{ maxWidth: "180px" }}
              value={invoiceStatus}
              onChange={(e) => { setInvoiceStatus(e.target.value); setPage(1); }}
            >
              {INVOICE_STATUSES.map((s) => (
                <option key={s} value={s}>{s ? `Status: ${s}` : "All Invoice Statuses"}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job ID</th>
                    <th>Party Name</th>
                    <th>Job Status</th>
                    <th style={{ textAlign: "right" }}>Buy (₹)</th>
                    <th style={{ textAlign: "right" }}>Sale (₹)</th>
                    <th style={{ textAlign: "right" }}>Cost (₹)</th>
                    <th style={{ textAlign: "right" }}>Margin (₹)</th>
                    <th>Invoice Ref</th>
                    <th>Invoice Status</th>
                    <th>Courier Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading finance records...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No finance records found for this period</td></tr>
                  ) : items.map((item) => {
                    const margin = Number(item.margin ?? (Number(item.sale ?? 0) - Number(item.buy ?? 0) - Number(item.cost ?? 0)));
                    const invStatus = item.invoiceStatus || (item.job?.invoiceStatus === "INVOICE_GENERATED" ? "INVOICED" : "PENDING");
                    return (
                      <tr key={item.id}>
                        <td>
                          <Link href={`/jobs/${item.job?.id}`} style={{ color: "#0070f3", fontWeight: 700, textDecoration: "none", fontSize: "0.875rem" }}>
                            {item.job?.jobId}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-main)" }}>{item.job?.partyName}</td>
                        <td>
                          <span className={`badge ${getStatusColor(item.job?.currentStatus)}`} style={{ fontSize: "0.7rem" }}>
                            {getStatusLabel(item.job?.currentStatus)}
                          </span>
                        </td>

                        {/* Editable finance cells */}
                        {["buy", "sale", "cost"].map((field) => (
                          <td key={field} style={{ textAlign: "right" }}>
                            <InlineNumberCell
                              financeId={item.id}
                              field={field}
                              value={Number(item[field] ?? 0)}
                              isEditing={editingCell?.id === item.id && editingCell?.field === field}
                              cellValue={cellValue}
                              onStartEdit={() => { setEditingCell({ id: item.id, field }); setCellValue(String(Number(item[field] ?? 0))); }}
                              onChange={setCellValue}
                              onSave={() => handleCellEdit(item.id, field, cellValue)}
                              onCancel={() => setEditingCell(null)}
                            />
                          </td>
                        ))}

                        <td style={{ textAlign: "right", fontWeight: 700, color: margin >= 0 ? "#10b981" : "#ef4444" }}>
                          ₹{margin.toLocaleString("en-IN")}
                        </td>

                        <td>
                          <InlineTextCell
                            financeId={item.id}
                            field="invoicingRef"
                            value={item.invoicingRef ?? item.job?.invoiceNo ?? ""}
                            isEditing={editingCell?.id === item.id && editingCell?.field === "invoicingRef"}
                            cellValue={cellValue}
                            onStartEdit={() => { setEditingCell({ id: item.id, field: "invoicingRef" }); setCellValue(item.invoicingRef ?? item.job?.invoiceNo ?? ""); }}
                            onChange={setCellValue}
                            onSave={() => handleCellEdit(item.id, "invoicingRef", cellValue)}
                            onCancel={() => setEditingCell(null)}
                          />
                        </td>

                        <td>
                          <select
                            id={`invoice-status-${item.id}`}
                            className="form-input"
                            style={{ padding: "4px 8px", fontSize: "0.75rem", fontWeight: 600, color: invoiceStatusColor[invStatus] ?? "var(--text-main)" }}
                            value={invStatus}
                            onChange={(e) => handleCellEdit(item.id, "invoiceStatus", e.target.value)}
                          >
                            {["PENDING", "INVOICED", "PAID", "OVERDUE"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <InlineTextCell
                            financeId={item.id}
                            field="courier"
                            value={item.courier ?? ""}
                            isEditing={editingCell?.id === item.id && editingCell?.field === "courier"}
                            cellValue={cellValue}
                            onStartEdit={() => { setEditingCell({ id: item.id, field: "courier" }); setCellValue(item.courier ?? ""); }}
                            onChange={setCellValue}
                            onSave={() => handleCellEdit(item.id, "courier", cellValue)}
                            onCancel={() => setEditingCell(null)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 2: WEEKLY FINANCIAL REPORT
         ───────────────────────────────────────────── */}
      {activeTab === "weekly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Weekly Financial Performance &amp; Margin Report
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {weeklyReport.length} Weeks Analyzed
              </span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Week Period</th>
                    <th style={{ textAlign: "center" }}>Jobs</th>
                    <th style={{ textAlign: "right" }}>Total Buy Cost (₹)</th>
                    <th style={{ textAlign: "right" }}>Total Revenue (₹)</th>
                    <th style={{ textAlign: "right" }}>Net Profit (₹)</th>
                    <th style={{ textAlign: "right" }}>Profit Margin</th>
                    <th style={{ textAlign: "center" }}>Invoices Raised</th>
                    <th style={{ textAlign: "center" }}>Invoices Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyReport.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No weekly data found for this timeframe</td></tr>
                  ) : weeklyReport.map((w) => {
                    const marginPct = w.sale > 0 ? ((w.margin / w.sale) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={w.sortKey}>
                        <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{w.period}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{w.jobCount}</td>
                        <td style={{ textAlign: "right", color: "#ea580c", fontWeight: 600 }}>₹{w.buy.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", color: "#10b981", fontWeight: 700 }}>₹{w.sale.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", color: w.margin >= 0 ? "#0070f3" : "#ef4444", fontWeight: 800 }}>
                          ₹{w.margin.toLocaleString("en-IN")}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: Number(marginPct) >= 15 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: Number(marginPct) >= 15 ? "#10b981" : "#f59e0b",
                            }}
                          >
                            {marginPct}%
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ color: "#10b981", fontWeight: 700 }}>{w.invoicedCount}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ color: "#f59e0b", fontWeight: 700 }}>{w.pendingCount}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 3: MONTHLY FINANCIAL REPORT
         ───────────────────────────────────────────── */}
      {activeTab === "monthly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Monthly Financial Statement &amp; Billing Summary
              </h3>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {monthlyReport.length} Months Tracked
              </span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style={{ textAlign: "center" }}>Total Jobs</th>
                    <th style={{ textAlign: "right" }}>Total Buy Cost (₹)</th>
                    <th style={{ textAlign: "right" }}>Total Revenue (₹)</th>
                    <th style={{ textAlign: "right" }}>Net Profit (₹)</th>
                    <th style={{ textAlign: "right" }}>Profit Margin</th>
                    <th style={{ textAlign: "center" }}>Invoices Raised</th>
                    <th style={{ textAlign: "center" }}>Invoices Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReport.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No monthly data found for this timeframe</td></tr>
                  ) : monthlyReport.map((m) => {
                    const marginPct = m.sale > 0 ? ((m.margin / m.sale) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={m.sortKey}>
                        <td style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.9rem" }}>{m.period}</td>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{m.jobCount}</td>
                        <td style={{ textAlign: "right", color: "#ea580c", fontWeight: 600 }}>₹{m.buy.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", color: "#10b981", fontWeight: 700 }}>₹{m.sale.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", color: m.margin >= 0 ? "#0070f3" : "#ef4444", fontWeight: 800 }}>
                          ₹{m.margin.toLocaleString("en-IN")}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: Number(marginPct) >= 15 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: Number(marginPct) >= 15 ? "#10b981" : "#f59e0b",
                            }}
                          >
                            {marginPct}%
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ color: "#10b981", fontWeight: 700 }}>{m.invoicedCount}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span style={{ color: "#f59e0b", fontWeight: 700 }}>{m.pendingCount}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 4: FINANCIAL ANALYTICS CHARTS
         ───────────────────────────────────────────── */}
      {activeTab === "charts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Revenue vs Cost vs Margin Bar Chart */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "16px" }}>
              Monthly Revenue vs Ops Cost vs Net Profit
            </h3>
            {chartData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No chart data available</div>
            ) : (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                      contentStyle={{ background: "var(--card-bg)", borderColor: "var(--border-color)", borderRadius: "8px", color: "var(--text-main)" }}
                    />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Cost" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Profit" fill="#0070f3" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Job Volume Trend Area Chart */}
          <div className="glass-card" style={{ padding: "20px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "16px" }}>
              Job Volume &amp; Invoicing Trend
            </h3>
            {chartData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No chart data available</div>
            ) : (
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0070f3" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0070f3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: "var(--card-bg)", borderColor: "var(--border-color)", borderRadius: "8px", color: "var(--text-main)" }}
                    />
                    <Area type="monotone" dataKey="Jobs" stroke="#0070f3" strokeWidth={2} fillOpacity={1} fill="url(#colorJobs)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InlineNumberCell({ financeId, field, value, isEditing, cellValue, onStartEdit, onChange, onSave, onCancel }: any) {
  if (isEditing) {
    return (
      <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
        <input
          type="number"
          className="form-input"
          style={{ width: "80px", padding: "2px 6px", fontSize: "0.8rem", textAlign: "right" }}
          value={cellValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
          autoFocus
        />
        <button onClick={onSave} className="btn btn-primary btn-sm" style={{ padding: "2px 6px", fontSize: "0.7rem" }}>✓</button>
        <button onClick={onCancel} className="btn btn-ghost btn-sm" style={{ padding: "2px 6px", fontSize: "0.7rem" }}>✕</button>
      </div>
    );
  }
  return (
    <span
      onClick={onStartEdit}
      style={{ cursor: "pointer", borderBottom: "1px dashed var(--border-color)", paddingBottom: "1px" }}
      title="Click to edit"
    >
      {value ? `₹${value.toLocaleString("en-IN")}` : "—"}
    </span>
  );
}

function InlineTextCell({ financeId, field, value, isEditing, cellValue, onStartEdit, onChange, onSave, onCancel }: any) {
  if (isEditing) {
    return (
      <div style={{ display: "flex", gap: "4px" }}>
        <input
          type="text"
          className="form-input"
          style={{ width: "110px", padding: "2px 6px", fontSize: "0.8rem" }}
          value={cellValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel(); }}
          autoFocus
        />
        <button onClick={onSave} className="btn btn-primary btn-sm" style={{ padding: "2px 6px", fontSize: "0.7rem" }}>✓</button>
        <button onClick={onCancel} className="btn btn-ghost btn-sm" style={{ padding: "2px 6px", fontSize: "0.7rem" }}>✕</button>
      </div>
    );
  }
  return (
    <span
      onClick={onStartEdit}
      style={{ cursor: "pointer", borderBottom: "1px dashed var(--border-color)", paddingBottom: "1px", color: value ? "var(--text-main)" : "var(--text-subtle)", fontSize: "0.8rem" }}
      title="Click to edit"
    >
      {value || "—"}
    </span>
  );
}
