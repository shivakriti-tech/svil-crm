"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "450px" }}>
        <div style={{ textAlign: "center" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" style={{ animation: "spin 1s linear infinite", margin: "0 auto" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <p style={{ marginTop: "14px", color: "var(--text-muted)", fontSize: "0.875rem", fontWeight: 600 }}>
            Loading live CRM dashboard...
          </p>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const fmtUsd = (n: number) => `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  const isScoped = Boolean(stats?.isScopedUser);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* ─────────────────────────────────────────────
         HEADER & ACTION BUTTONS
         ───────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            {isScoped ? `Welcome, ${stats?.userName || "Sales"} | Sales Dashboard` : "Operations & Executive Dashboard"}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "3px" }}>
            {isScoped
              ? "Your personal control tower: Assigned inquiries pipeline, active shipments, and follow-ups."
              : "Real-time control tower: Inquiries pipeline, freight operations, and company-wide financial metrics."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link
            href="/inquiries"
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", fontWeight: 700, padding: "8px 16px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {isScoped ? "My Inquiries &rarr;" : "Inquiries Pipeline &rarr;"}
          </Link>
          <Link
            href="/jobs"
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", fontWeight: 600, padding: "8px 16px" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            {isScoped ? "My Shipments" : "All Shipments"}
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
         SECTION 1: LIVE KPI CARDS
         ───────────────────────────────────────────── */}
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
          
          {/* Card 1 — Inquiries Pipeline */}
          <Link
            href="/inquiries"
            className="kpi-card kpi-card-blue"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "transform 0.15s ease" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                    {isScoped ? "My Inquiries Pipeline" : "Inquiries Pipeline"}
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", opacity: 0.9, fontWeight: 700 }}>View All &rarr;</span>
              </div>
              <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: "4px" }}>
                {stats?.inquiries?.totalAllTime ?? 0} {isScoped ? "Assigned Leads" : "Total Leads Registered"}
              </div>
              
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "14px" }}>
                <span style={{ fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 }}>
                  {stats?.inquiries?.thisMonth ?? 0}
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: "9999px" }}>
                  This Month
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.25)", fontSize: "0.75rem", fontWeight: 600 }}>
              <div><span style={{ opacity: 0.8 }}>Booked: </span>{stats?.inquiries?.booked ?? 0}</div>
              <div><span style={{ opacity: 0.8 }}>Win Rate: </span>{stats?.inquiries?.conversionRate ?? 0}%</div>
              {stats?.inquiries?.followUpsToday > 0 && (
                <div style={{ background: "rgba(255,255,255,0.3)", padding: "1px 6px", borderRadius: "4px" }}>
                  {stats.inquiries.followUpsToday} Due Today
                </div>
              )}
            </div>
          </Link>

          {/* Card 2 — Active Shipments */}
          <Link
            href="/jobs"
            className="kpi-card kpi-card-dark"
            style={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "transform 0.15s ease" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {isScoped ? "My Live Shipments" : "Live Shipments"}
                  </span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#0070f3", fontWeight: 700 }}>View All &rarr;</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {stats?.jobs?.total ?? 0} {isScoped ? "Assigned Jobs" : "Total Historical Jobs"}
              </div>
              
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "14px" }}>
                <span style={{ fontSize: "2.2rem", fontWeight: 900, lineHeight: 1, color: "var(--text-main)" }}>
                  {stats?.jobs?.active ?? 0}
                </span>
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", background: "rgba(16,185,129,0.15)", padding: "2px 8px", borderRadius: "9999px" }}>
                  Active Tracking
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--border-color)", fontSize: "0.75rem", fontWeight: 600 }}>
              <div style={{ color: "#059669" }}>✓ {stats?.jobs?.completed ?? 0} Completed</div>
              <div style={{ color: stats?.jobs?.overdue > 0 ? "#ef4444" : "var(--text-muted)" }}>
                {stats?.jobs?.overdue ?? 0} Overdue ETAs
              </div>
            </div>
          </Link>

          {/* Card 3 — For Admin: Revenue | For Sales: Quotations */}
          {isScoped ? (
            <Link
              href="/quotations"
              className="kpi-card kpi-card-green"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "transform 0.15s ease" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>My Quotations</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", opacity: 0.9, fontWeight: 700 }}>Quotes Hub &rarr;</span>
                </div>
                <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: "4px" }}>
                  {stats?.quotations?.total ?? 0} Total Quotes Sent
                </div>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "14px" }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 }}>
                    {stats?.quotations?.thisMonth ?? 0}
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: "9999px" }}>
                    This Month
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.25)", fontSize: "0.75rem", fontWeight: 600 }}>
                <div><span style={{ opacity: 0.8 }}>Rates Sent: </span>{stats?.inquiries?.rateSentCount ?? 0}</div>
                <div><span style={{ opacity: 0.8 }}>Status: </span>Active</div>
              </div>
            </Link>
          ) : (
            <Link
              href="/finance"
              className="kpi-card kpi-card-green"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "transform 0.15s ease" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" x2="12" y1="1" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Total Billed Revenue</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", opacity: 0.9, fontWeight: 700 }}>Tally Hub &rarr;</span>
                </div>
                <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: "4px" }}>
                  {fmtUsd(stats?.finance?.revenueUsd)} USD Total
                </div>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "14px" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>
                    {formatCurrency(stats?.finance?.revenue)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.25)", fontSize: "0.75rem", fontWeight: 600 }}>
                <div><span style={{ opacity: 0.8 }}>Net Profit Margin: </span>{formatCurrency(stats?.finance?.margin)}</div>
              </div>
            </Link>
          )}

          {/* Card 4 — For Admin: Outstanding | For Sales: Follow-ups Today */}
          {isScoped ? (
            <Link
              href="/inquiries?followup=true"
              className="kpi-card kpi-card-purple"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "transform 0.15s ease" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Priority Follow-ups</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", opacity: 0.9, fontWeight: 700 }}>Callbacks &rarr;</span>
                </div>
                <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: "4px" }}>
                  Scheduled Client Callbacks
                </div>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "14px" }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 900, lineHeight: 1 }}>
                    {stats?.inquiries?.followUpsToday ?? 0}
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: "9999px" }}>
                    Due Today
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.25)", fontSize: "0.75rem", fontWeight: 600 }}>
                <div><span style={{ opacity: 0.8 }}>Status: </span>Action Required</div>
              </div>
            </Link>
          ) : (
            <Link
              href="/finance"
              className="kpi-card kpi-card-purple"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer", transition: "transform 0.15s ease" }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Outstanding Balance</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", opacity: 0.9, fontWeight: 700 }}>Billing &rarr;</span>
                </div>
                <div style={{ fontSize: "0.75rem", opacity: 0.85, marginTop: "4px" }}>
                  Pending Invoices Collection
                </div>
                
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "14px" }}>
                  <span style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>
                    {formatCurrency(stats?.finance?.outstanding)}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.25)", fontSize: "0.75rem", fontWeight: 600 }}>
                <div><span style={{ opacity: 0.8 }}>Status: </span>Action Required</div>
              </div>
            </Link>
          )}

        </div>
      </div>

      {/* ─────────────────────────────────────────────
         SECTION 2: MAIN GRID (Charts & Operations)
         ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "24px" }}>
        
        {/* Left Column: Volume & Conversion Area Chart */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                {isScoped ? "My Monthly Trajectory & Conversion Trend" : "Monthly Operational Volume & Conversion Trend"}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                {isScoped
                  ? "Your personal 6-month historical trajectory of leads handled and shipments booked."
                  : "Live 6-month historical trajectory of customer inquiries and shipment bookings."}
              </p>
            </div>
            {!isScoped && (
              <Link href="/reports" className="btn btn-secondary btn-sm" style={{ textDecoration: "none", fontSize: "0.75rem", fontWeight: 600 }}>
                Deep Analytics &rarr;
              </Link>
            )}
          </div>

          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInquiries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0070f3" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#0070f3" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorShipments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-subtle)" tickLine={false} style={{ fontSize: "0.75rem" }} />
                <YAxis stroke="var(--text-subtle)" tickLine={false} style={{ fontSize: "0.75rem" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "10px",
                    color: "var(--text-main)",
                    fontSize: "0.8rem",
                  }}
                />
                <Legend formatter={(v) => <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600 }}>{v}</span>} />
                <Area type="monotone" dataKey="Inquiries" stroke="#0070f3" strokeWidth={3} fillOpacity={1} fill="url(#colorInquiries)" />
                <Area type="monotone" dataKey="Shipments" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorShipments)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "12px", fontSize: "0.8rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#0070f3" }} />
              {isScoped ? "My Inquiries" : "Total Inquiries Received"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }} />
              {isScoped ? "My Shipments Booked" : "Shipments / Jobs Handled"}
            </div>
          </div>
        </div>

        {/* Right Column: Scoped Follow-ups OR Admin Team Overview */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {isScoped ? (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>
                    My Priority Callbacks &amp; Action Items
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {stats?.upcomingFollowUps?.length || 0} scheduled follow-ups
                  </span>
                </div>
                <Link href="/inquiries?followup=true" style={{ fontSize: "0.75rem", color: "#0070f3", fontWeight: 700, textDecoration: "none" }}>
                  All &rarr;
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "240px", overflowY: "auto" }}>
                {stats?.upcomingFollowUps?.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    No pending callbacks for today!
                  </div>
                ) : (
                  stats?.upcomingFollowUps?.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/inquiries`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "var(--card-hover-bg)",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                        textDecoration: "none",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", display: "block" }}>
                          {item.customerName}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {item.pol} &rarr; {item.pod} {item.commodity ? `· ${item.commodity}` : ""}
                        </span>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b", display: "block" }}>
                          {item.followUpDate ? formatDate(item.followUpDate) : "Due Today"}
                        </span>
                        <span style={{ fontSize: "0.68rem", color: "#0070f3", fontWeight: 600 }}>
                          {item.phone || "Follow up"}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>
                    Operations &amp; Sales Team
                  </h3>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {stats?.team?.length || 0} active members
                  </span>
                </div>
                <Link href="/reports" style={{ fontSize: "0.75rem", color: "#0070f3", fontWeight: 700, textDecoration: "none" }}>
                  Scorecard &rarr;
                </Link>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "240px", overflowY: "auto" }}>
                {stats?.team?.map((member: any, i: number) => (
                  <div
                    key={member.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--card-hover-bg)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: ["#0070f3", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4"][i % 5],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          fontWeight: 800,
                          color: "#ffffff",
                        }}
                      >
                        {member.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)", display: "block" }}>
                          {member.name}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {member.role}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0070f3", display: "block" }}>
                        {member.activeJobs} Active Jobs
                      </span>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>
                        {member.inquiries} Inquiries
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Direct Routing Hub */}
          <div className="card" style={{ background: "linear-gradient(135deg, rgba(0,112,243,0.06), rgba(16,185,129,0.06))" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "8px" }}>
              Quick Workflows
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <Link
                href="/inquiries"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: "none", fontSize: "0.75rem", fontWeight: 700, textAlign: "center" }}
              >
                Inquiries Pipeline
              </Link>
              <Link
                href="/quotations"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: "none", fontSize: "0.75rem", fontWeight: 700, textAlign: "center" }}
              >
                Quotations Hub
              </Link>
              <Link
                href="/jobs"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: "none", fontSize: "0.75rem", fontWeight: 700, textAlign: "center" }}
              >
                {isScoped ? "My Shipments" : "All Shipments"}
              </Link>
              <Link
                href="/daily-status"
                className="btn btn-secondary btn-sm"
                style={{ textDecoration: "none", fontSize: "0.75rem", fontWeight: 700, textAlign: "center" }}
              >
                Client DSR
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ─────────────────────────────────────────────
         SECTION 3: REAL RECENT SHIPMENTS / TRANSACTIONS
         ───────────────────────────────────────────── */}
      <div className="glass-card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-main)", margin: 0, textTransform: "uppercase" }}>
              {isScoped ? "My Recent Shipments & Activity" : "Latest Live Shipments & Activity"}
            </h3>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
              {isScoped ? "Your assigned active consignments with live milestone updates." : "Real registered consignments with live status and tally billing status."}
            </p>
          </div>
          <Link href="/jobs" className="btn btn-secondary btn-sm" style={{ textDecoration: "none", fontWeight: 700, fontSize: "0.8rem" }}>
            {isScoped ? "View My Shipments &rarr;" : "View All Shipments &rarr;"}
          </Link>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Party / Customer</th>
                <th>Route (POL &rarr; POD)</th>
                <th>Registered Date</th>
                <th>Operational Status</th>
                <th>Invoice Status</th>
                <th>Responsible</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stats?.jobs?.recent?.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No recent shipments recorded.
                  </td>
                </tr>
              ) : (
                stats?.jobs?.recent?.map((job: any) => (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/jobs/${job.id}`} style={{ fontWeight: 800, color: "#0070f3", textDecoration: "none" }}>
                        {job.jobId}
                      </Link>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--text-main)" }}>
                      {job.partyName}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {job.pol} &rarr; {job.pod}
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {formatDate(job.createdAt)}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: `${getStatusColor(job.currentStatus)}18`,
                          color: getStatusColor(job.currentStatus),
                          border: `1px solid ${getStatusColor(job.currentStatus)}30`,
                        }}
                      >
                        {getStatusLabel(job.currentStatus)}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: job.invoiceStatus === "INVOICE_GENERATED" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                          color: job.invoiceStatus === "INVOICE_GENERATED" ? "#10b981" : "#f59e0b",
                        }}
                      >
                        {job.invoiceStatus === "INVOICE_GENERATED" ? "✓ Invoiced" : "Pending"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {job.responsible || "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: "0.72rem", padding: "4px 8px", textDecoration: "none" }}
                      >
                        View &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
