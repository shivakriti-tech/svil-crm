"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

const CHART_COLORS = ["#0070f3", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#64748b"];

type TimeframeType = "this_week" | "last_week" | "this_month" | "last_month" | "this_year" | "custom";
type TabType = "conversion" | "employee" | "shipments" | "overview";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("conversion");
  const [timeframe, setTimeframe] = useState<TimeframeType>("this_month");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [shipmentSearch, setShipmentSearch] = useState<string>("");
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState<string>("");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize current month dates
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
    setFromDate(firstDay);
    setToDate(lastDay);
  }, []);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("timeframe", timeframe);
    if (timeframe === "custom" && fromDate && toDate) {
      params.set("fromDate", fromDate);
      params.set("toDate", toDate);
    }
    if (employeeFilter) {
      params.set("employeeId", employeeFilter);
    }

    try {
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load reports", e);
    } finally {
      setLoading(false);
    }
  }, [timeframe, fromDate, toDate, employeeFilter]);

  useEffect(() => {
    if (fromDate && toDate) {
      loadReports();
    }
  }, [loadReports, fromDate, toDate]);

  const handleTimeframeChange = (tf: TimeframeType) => {
    setTimeframe(tf);
    const now = new Date();
    if (tf === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.setDate(diff));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setFromDate(start.toISOString().split("T")[0]);
      setToDate(end.toISOString().split("T")[0]);
    } else if (tf === "last_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const start = new Date(now.setDate(diff));
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

  const fmtCurrency = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;
  const fmtUsd = (n: number) => `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;

  // Filtered shipments list
  const filteredShipments = useMemo(() => {
    if (!data?.shipmentSummary?.shipments) return [];
    return data.shipmentSummary.shipments.filter((s: any) => {
      const matchStatus = !shipmentStatusFilter || s.currentStatus === shipmentStatusFilter;
      const matchSearch =
        !shipmentSearch ||
        s.jobId?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.partyName?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.consignee?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.pol?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.pod?.toLowerCase().includes(shipmentSearch.toLowerCase()) ||
        s.carrier?.toLowerCase().includes(shipmentSearch.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [data, shipmentStatusFilter, shipmentSearch]);

  // Export Shipment Summary to CSV
  const handleExportShipmentCSV = () => {
    if (!filteredShipments.length) return;
    const headers = [
      "Job ID",
      "Party Name",
      "Consignee",
      "Shipper",
      "POL",
      "POD",
      "Carrier / Liner",
      "Vessel / Voyage",
      "ETD",
      "ETA",
      "Current Status",
      "Invoice Status",
      "Invoice No",
      "Responsible",
      "Billing (USD)",
      "Billing (INR)",
      "Cost (INR)",
      "Margin (INR)",
    ];

    const rows = filteredShipments.map((s: any) => [
      `"${s.jobId || ""}"`,
      `"${s.partyName || ""}"`,
      `"${(s.consignee || "").replace(/"/g, '""')}"`,
      `"${(s.shipper || "").replace(/"/g, '""')}"`,
      `"${s.pol || ""}"`,
      `"${s.pod || ""}"`,
      `"${s.carrier || ""}"`,
      `"${s.vesselVoyage || ""}"`,
      `"${s.etd ? s.etd.slice(0, 10) : ""}"`,
      `"${s.eta ? s.eta.slice(0, 10) : ""}"`,
      `"${getStatusLabel(s.currentStatus)}"`,
      `"${s.invoiceStatus === "INVOICE_GENERATED" ? "Invoice Raised" : "Pending Invoice"}"`,
      `"${s.invoiceNo || ""}"`,
      `"${s.responsible || ""}"`,
      s.saleUsd || 0,
      s.saleInr || 0,
      s.buyInr || 0,
      s.margin || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e: (string | number)[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SVIL_Shipment_Summary_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─────────────────────────────────────────────
         PAGE HEADER & TIMEFRAME FILTERS
         ───────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Reports &amp; Analytics Hub
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Executive intelligence: Lead conversion funnels, employee KPIs, and shipment date summaries.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", background: "var(--card-bg)", padding: "6px 10px", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
          {/* Quick preset buttons */}
          {(
            [
              { id: "this_week", label: "Weekly" },
              { id: "this_month", label: "Monthly" },
              { id: "last_month", label: "Last Month" },
              { id: "this_year", label: "This Year" },
              { id: "custom", label: "Custom" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => handleTimeframeChange(t.id)}
              className="btn btn-sm"
              style={{
                background: timeframe === t.id ? "#0070f3" : "transparent",
                color: timeframe === t.id ? "#ffffff" : "var(--text-muted)",
                fontWeight: timeframe === t.id ? 700 : 500,
                padding: "5px 12px",
                borderRadius: "8px",
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
              }}
              style={{ padding: "4px 8px", fontSize: "0.78rem", width: "130px" }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>to</span>
            <input
              type="date"
              className="form-input"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setTimeframe("custom");
              }}
              style={{ padding: "4px 8px", fontSize: "0.78rem", width: "130px" }}
            />
          </div>

          <button
            onClick={loadReports}
            className="btn btn-secondary btn-sm"
            title="Refresh Data"
            style={{ padding: "5px 8px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* Date Span Indicator */}
      {data?.dateRange && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
          <span>
            Active Window: <strong>{formatDate(data.dateRange.startDate)}</strong> &rarr; <strong>{formatDate(data.dateRange.endDate)}</strong>
          </span>
          {employeeFilter && (
            <span className="badge badge-blue" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
              Filtered by Employee
            </span>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
         MAIN REPORT TABS
         ───────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border-color)", paddingBottom: "0" }}>
        {[
          { id: "conversion", label: "Lead Conversion Report" },
          { id: "employee", label: "Employee Performance Report" },
          { id: "shipments", label: "Shipment Summary Report" },
          { id: "overview", label: "Financial & Status Overview" },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as TabType)}
            style={{
              padding: "11px 18px",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              borderBottom: activeTab === tab.id ? "2px solid #0070f3" : "2px solid transparent",
              color: activeTab === tab.id ? "#0070f3" : "var(--text-muted)",
              transition: "all 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "350px", flexDirection: "column", gap: "12px" }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontWeight: 500 }}>Generating Analytics &amp; Reports...</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : !data ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
          No data available for the selected time range.
        </div>
      ) : (
        <>
          {/* ─────────────────────────────────────────────
             TAB 1: LEAD CONVERSION REPORT
             ───────────────────────────────────────────── */}
          {activeTab === "conversion" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Conversion KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <KpiCard
                  title="Total Inquiries Received"
                  value={data.leadConversion.totalInquiries}
                  subtitle="Inquiries in active period"
                  color="#0070f3"
                />
                <KpiCard
                  title="Rates / Quotes Sent"
                  value={data.leadConversion.rateSentInquiries}
                  subtitle={`${data.leadConversion.rateSentRate}% quote send-out rate`}
                  color="#8b5cf6"
                />
                <KpiCard
                  title="Jobs Won / Booked"
                  value={data.leadConversion.bookedInquiries}
                  subtitle="Converted into active jobs"
                  color="#10b981"
                />
                <KpiCard
                  title="Lead Conversion Rate"
                  value={`${data.leadConversion.overallConversionRate}%`}
                  subtitle="Total Booked / Total Inquiries"
                  color="#f59e0b"
                  highlight
                />
              </div>

              {/* Conversion Funnel & Visuals */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px" }}>
                {/* Top Customers Conversion */}
                <div className="card">
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
                    Conversion by Top Customers
                  </h3>
                  {data.leadConversion.topCustomerConversion?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={data.leadConversion.topCustomerConversion}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                        <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            color: "var(--text-main)",
                            fontSize: "0.8rem",
                          }}
                        />
                        <Legend formatter={(v) => <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{v}</span>} />
                        <Bar dataKey="total" name="Total Inquiries" fill="#0070f3" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="booked" name="Jobs Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No customer data</div>
                  )}
                </div>

                {/* EXIM & Shipment Type Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div className="card">
                    <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px", textTransform: "uppercase" }}>
                      Conversion: Exports vs Imports
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {data.leadConversion.conversionByExim?.map((ex: any) => (
                        <div key={ex.name} style={{ background: "var(--card-hover-bg)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.85rem" }}>{ex.name}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                              {ex.booked} Won / {ex.total} Total Inquiries
                            </span>
                          </div>
                          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: ex.conversionRate >= 50 ? "#10b981" : "#0070f3" }}>
                            {ex.conversionRate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "12px", textTransform: "uppercase" }}>
                      Conversion: Shipment Type (FCL / LCL / Air)
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px" }}>
                      {data.leadConversion.conversionByType?.map((t: any) => (
                        <div key={t.name} style={{ background: "var(--card-hover-bg)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border-color)" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", textTransform: "uppercase" }}>{t.name}</span>
                          <p style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: "4px 0" }}>{t.conversionRate}%</p>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{t.booked}/{t.total} won</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Lead Breakdown Table */}
              <div className="glass-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", margin: 0, textTransform: "uppercase" }}>
                    Recent Inquiries &amp; Conversion Tracking
                  </h3>
                  <Link href="/inquiries" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                    Open Inquiries Kanban &rarr;
                  </Link>
                </div>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Inquiry #</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Route</th>
                        <th>Type</th>
                        <th>Rate Sent</th>
                        <th>Responsible</th>
                        <th>Status</th>
                        <th>Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.leadConversion.inquiries?.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                            No inquiries recorded in this period.
                          </td>
                        </tr>
                      ) : (
                        data.leadConversion.inquiries.map((inq: any) => (
                          <tr key={inq.id}>
                            <td style={{ fontWeight: 700, color: "#0070f3" }}>#{inq.inquiryNo}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{formatDate(inq.inquiryDate)}</td>
                            <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{inq.customer}</td>
                            <td style={{ color: "var(--text-muted)" }}>{inq.route}</td>
                            <td>{inq.shipmentType} ({inq.exim})</td>
                            <td>
                              <span style={{ color: inq.rateSent ? "#10b981" : "var(--text-subtle)", fontWeight: 600, fontSize: "0.8rem" }}>
                                {inq.rateSent ? "✓ Sent" : "Pending"}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-main)", fontWeight: 500 }}>{inq.responsible}</td>
                            <td>
                              <span className={`badge ${getStatusColor(inq.status)}`}>{getStatusLabel(inq.status)}</span>
                            </td>
                            <td>
                              {inq.jobId ? (
                                <Link
                                  href={`/jobs`}
                                  className="chip chip-success"
                                  style={{ textDecoration: "none", fontSize: "0.7rem", fontWeight: 700 }}
                                >
                                  Won ({inq.jobId})
                                </Link>
                              ) : inq.status === "CLOSE" ? (
                                <span className="chip chip-danger" style={{ fontSize: "0.7rem" }}>Lost</span>
                              ) : (
                                <span className="chip chip-warning" style={{ fontSize: "0.7rem" }}>In Pipeline</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────
             TAB 2: EMPLOYEE PERFORMANCE REPORT
             ───────────────────────────────────────────── */}
          {activeTab === "employee" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Employee Filter & Quick Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <KpiCard
                  title="Top Converter"
                  value={
                    [...data.employeePerformance].sort((a: any, b: any) => b.conversionRate - a.conversionRate)[0]?.name || "—"
                  }
                  subtitle={`Highest Conversion (${[...data.employeePerformance].sort((a: any, b: any) => b.conversionRate - a.conversionRate)[0]?.conversionRate || 0}%)`}
                  color="#10b981"
                />
                <KpiCard
                  title="Highest Revenue"
                  value={
                    [...data.employeePerformance].sort((a: any, b: any) => b.totalRevenueInr - a.totalRevenueInr)[0]?.name || "—"
                  }
                  subtitle={fmtCurrency(
                    [...data.employeePerformance].sort((a: any, b: any) => b.totalRevenueInr - a.totalRevenueInr)[0]?.totalRevenueInr || 0
                  )}
                  color="#0070f3"
                />
                <KpiCard
                  title="Most Bookings Won"
                  value={
                    [...data.employeePerformance].sort((a: any, b: any) => b.inquiriesBooked - a.inquiriesBooked)[0]?.name || "—"
                  }
                  subtitle={`${[...data.employeePerformance].sort((a: any, b: any) => b.inquiriesBooked - a.inquiriesBooked)[0]?.inquiriesBooked || 0} Inquiries Won`}
                  color="#8b5cf6"
                />
                <KpiCard
                  title="Total Margin Created"
                  value={fmtCurrency(
                    data.employeePerformance.reduce((acc: number, cur: any) => acc + (cur.totalMarginInr || 0), 0)
                  )}
                  subtitle="Gross profit by all sales employees"
                  color="#f59e0b"
                />
              </div>

              {/* Comparative Chart */}
              <div className="card">
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
                  Employee Bookings &amp; Conversion Comparison
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.employeePerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card-bg)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        color: "var(--text-main)",
                        fontSize: "0.8rem",
                      }}
                    />
                    <Legend formatter={(v) => <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{v}</span>} />
                    <Bar dataKey="inquiriesTotal" name="Assigned Inquiries" fill="#0070f3" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inquiriesBooked" name="Booked / Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="jobsActive" name="Active Shipments" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Comprehensive Employee Table */}
              <div className="glass-card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
                  Complete Employee Scorecard
                </h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Role</th>
                        <th style={{ textAlign: "center" }}>Inquiries Assigned</th>
                        <th style={{ textAlign: "center" }}>Quotes Sent</th>
                        <th style={{ textAlign: "center" }}>Jobs Won</th>
                        <th style={{ textAlign: "center" }}>Conversion Rate</th>
                        <th style={{ textAlign: "center" }}>Active Shipments</th>
                        <th style={{ textAlign: "center" }}>Completed</th>
                        <th style={{ textAlign: "right" }}>Revenue (INR)</th>
                        <th style={{ textAlign: "right" }}>Net Margin (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.employeePerformance?.map((emp: any) => (
                        <tr key={emp.id}>
                          <td style={{ fontWeight: 700, color: "var(--text-main)" }}>{emp.name}</td>
                          <td>
                            <span className="badge badge-gray" style={{ fontSize: "0.7rem" }}>{emp.role}</span>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: 600 }}>{emp.inquiriesTotal}</td>
                          <td style={{ textAlign: "center" }}>{emp.inquiriesRateSent}</td>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "#10b981" }}>{emp.inquiriesBooked}</td>
                          <td style={{ textAlign: "center" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                background: emp.conversionRate >= 40 ? "rgba(16, 185, 129, 0.15)" : "rgba(0, 112, 243, 0.15)",
                                color: emp.conversionRate >= 40 ? "#10b981" : "#0070f3",
                              }}
                            >
                              {emp.conversionRate}%
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>{emp.jobsActive}</td>
                          <td style={{ textAlign: "center", color: "#10b981", fontWeight: 600 }}>{emp.jobsCompleted}</td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#0070f3" }}>
                            {fmtCurrency(emp.totalRevenueInr)}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800, color: emp.totalMarginInr >= 0 ? "#10b981" : "#ef4444" }}>
                            {fmtCurrency(emp.totalMarginInr)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────
             TAB 3: SHIPMENT SUMMARY REPORT (FROM - TO DATE)
             ───────────────────────────────────────────── */}
          {activeTab === "shipments" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Shipment KPI Summary */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <KpiCard
                  title="Total Shipments (Period)"
                  value={data.shipmentSummary.total}
                  subtitle={`From ${fromDate} to ${toDate}`}
                  color="#0070f3"
                />
                <KpiCard
                  title="Active / In-Transit"
                  value={data.shipmentSummary.active}
                  subtitle="Under operational tracking"
                  color="#f59e0b"
                />
                <KpiCard
                  title="Delivered / Completed"
                  value={data.shipmentSummary.completed}
                  subtitle="Successfully closed"
                  color="#10b981"
                />
                <KpiCard
                  title="Invoices Raised"
                  value={data.shipmentSummary.invoiced}
                  subtitle={`${Math.round((data.shipmentSummary.invoiced / (data.shipmentSummary.total || 1)) * 100)}% billed`}
                  color="#8b5cf6"
                />
                <KpiCard
                  title="Freight Revenue (INR)"
                  value={fmtCurrency(data.summary.revenueInr)}
                  subtitle={`${fmtUsd(data.summary.revenueUsd)} USD`}
                  color="#10b981"
                  highlight
                />
              </div>

              {/* Charts Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }}>
                {/* Status Distribution */}
                <div className="card">
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
                    Shipments by Operational Stage
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {data.shipmentSummary.statusDistribution?.map((st: any) => (
                      <div key={st.status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card-hover-bg)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                        <span className={`badge ${getStatusColor(st.status)}`} style={{ fontSize: "0.725rem" }}>
                          {getStatusLabel(st.status)}
                        </span>
                        <span style={{ fontWeight: 800, color: "var(--text-main)", fontSize: "0.9rem" }}>
                          {st.count} shipments
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Carriers */}
                <div className="card">
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
                    Top Shipping Lines &amp; Carriers
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {data.shipmentSummary.carrierDistribution?.map((c: any, i: number) => (
                      <div key={c.carrier} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--card-hover-bg)", padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.85rem" }}>{c.carrier}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: "#0070f3", fontSize: "0.9rem" }}>{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Shipment List Table with Filter & Export */}
              <div className="glass-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: 0, textTransform: "uppercase" }}>
                      Shipment Summary Report ({filteredShipments.length} Records)
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Showing shipments registered from {fromDate} to {toDate}.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search Job ID, Party, Consignee, Port..."
                      value={shipmentSearch}
                      onChange={(e) => setShipmentSearch(e.target.value)}
                      style={{ width: "240px", fontSize: "0.8rem", padding: "6px 10px" }}
                    />
                    <select
                      className="form-input"
                      value={shipmentStatusFilter}
                      onChange={(e) => setShipmentStatusFilter(e.target.value)}
                      style={{ width: "160px", fontSize: "0.8rem", padding: "6px 10px" }}
                    >
                      <option value="">All Statuses</option>
                      <option value="BOOKING_CONFIRMED">Booking Confirmed</option>
                      <option value="CARGO_GATE_IN">Cargo Gate In</option>
                      <option value="VESSEL_SAILED">Vessel Sailed</option>
                      <option value="IN_TRANSIT">In Transit</option>
                      <option value="ARRIVED_AT_POD">Arrived at POD</option>
                      <option value="CUSTOMS_CLEARANCE">Customs Clearance</option>
                      <option value="DELIVERED">Delivered</option>
                    </select>
                    <button onClick={handleExportShipmentCSV} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                      </svg>
                      Export CSV / Excel
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Job ID</th>
                        <th>Party Name</th>
                        <th>Route (POL &rarr; POD)</th>
                        <th>Carrier / Vessel</th>
                        <th>ETD</th>
                        <th>ETA</th>
                        <th>Status</th>
                        <th>Invoice Status</th>
                        <th style={{ textAlign: "right" }}>Billing (USD / INR)</th>
                        <th style={{ textAlign: "right" }}>Margin (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredShipments.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                            No shipments found matching the date range &amp; filters.
                          </td>
                        </tr>
                      ) : (
                        filteredShipments.map((s: any) => (
                          <tr key={s.id}>
                            <td>
                              <Link href={`/jobs/${s.id}`} style={{ fontWeight: 700, color: "#0070f3", textDecoration: "none" }}>
                                {s.jobId}
                              </Link>
                            </td>
                            <td style={{ fontWeight: 600, color: "var(--text-main)" }}>
                              {s.partyName}
                              {s.consignee && <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)" }}>C: {s.consignee.slice(0, 30)}</span>}
                            </td>
                            <td style={{ color: "var(--text-muted)" }}>{s.pol} &rarr; {s.pod}</td>
                            <td>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-main)", fontWeight: 500 }}>{s.carrier}</span>
                              <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)" }}>{s.vesselVoyage}</span>
                            </td>
                            <td style={{ whiteSpace: "nowrap" }}>{formatDate(s.etd)}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{formatDate(s.eta)}</td>
                            <td>
                              <span className={`badge ${getStatusColor(s.currentStatus)}`}>{getStatusLabel(s.currentStatus)}</span>
                            </td>
                            <td>
                              {s.invoiceStatus === "INVOICE_GENERATED" ? (
                                <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.75rem" }}>
                                  ✓ Raised {s.invoiceNo ? `(${s.invoiceNo})` : ""}
                                </span>
                              ) : (
                                <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.75rem" }}>
                                  ⏳ Pending
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {s.saleUsd > 0 && <span style={{ display: "block", fontSize: "0.75rem", color: "#0070f3", fontWeight: 600 }}>${s.saleUsd.toLocaleString()}</span>}
                              <span style={{ fontWeight: 700, color: "#10b981" }}>₹{s.saleInr.toLocaleString("en-IN")}</span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: s.margin >= 0 ? "#10b981" : "#ef4444" }}>
                              ₹{s.margin.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────
             TAB 4: OVERVIEW / DASHBOARD KPIS
             ───────────────────────────────────────────── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <KpiCard title="Total Revenue (Sale)" value={fmtCurrency(data.summary.revenueInr)} subtitle={`${fmtUsd(data.summary.revenueUsd)} USD`} color="#10b981" highlight />
                <KpiCard title="Total Cost of Freight" value={fmtCurrency(data.summary.costInr)} subtitle="Buy + local clearance costs" color="#f97316" />
                <KpiCard title="Net Profit Margin" value={fmtCurrency(data.summary.marginInr)} subtitle="Gross profit generated" color={data.summary.marginInr >= 0 ? "#10b981" : "#ef4444"} highlight />
                <KpiCard title="System Active Jobs" value={data.summary.allActiveJobsSystem} subtitle="All live shipments" color="#0070f3" />
                <KpiCard title="Overdue ETAs (Urgent)" value={data.summary.allOverdueJobsSystem} subtitle="Requires immediate attention" color="#ef4444" />
              </div>

              <div className="card">
                <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
                  Quick Navigation Links
                </h3>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <Link href="/daily-status" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                    Daily Status Report (Client-wise DSR)
                  </Link>
                  <Link href="/jobs" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                    Jobs &amp; Shipments Hub
                  </Link>
                  <Link href="/inquiries" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                    Inquiries Pipeline
                  </Link>
                  <Link href="/finance" className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                    Finance &amp; Tally Hub
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  color = "#0070f3",
  highlight,
}: {
  title: string;
  value: any;
  subtitle?: string;
  color?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "18px 20px",
        borderLeft: highlight ? `4px solid ${color}` : "1px solid var(--border-color)",
        background: "var(--card-bg)",
      }}
    >
      <span style={{ fontSize: "0.725rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", display: "block" }}>
        {title}
      </span>
      <p style={{ fontSize: "1.6rem", fontWeight: 900, color: color, margin: "6px 0 2px 0", letterSpacing: "-0.02em" }}>
        {value}
      </p>
      {subtitle && <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>{subtitle}</span>}
    </div>
  );
}
