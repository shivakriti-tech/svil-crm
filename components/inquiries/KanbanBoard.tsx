"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

const KANBAN_COLUMNS = [
  { status: "IN_PROCESS", label: "In Process", color: "#0070f3", chipClass: "chip-primary" },
  { status: "BOOKED", label: "Booked / Won", color: "#10b981", chipClass: "chip-success" },
  { status: "RATE_NOT_GIVEN", label: "Rate Pending", color: "#f59e0b", chipClass: "chip-warning" },
  { status: "RATE_UNMATCHED", label: "Rate Unmatched", color: "#f97316", chipClass: "chip-warning" },
  { status: "CARGO_NOT_READY", label: "Cargo Not Ready", color: "#a855f7", chipClass: "chip-purple" },
  { status: "VESSEL_MISSED", label: "Vessel Missed", color: "#ef4444", chipClass: "chip-danger" },
  { status: "SHIFT_NEXT_DATE", label: "Shifted Date", color: "#0284c7", chipClass: "chip-primary" },
  { status: "NO_SERVICE", label: "No Service", color: "#64748b", chipClass: "chip-gray" },
  { status: "CLOSE", label: "Closed", color: "#475569", chipClass: "chip-gray" },
];

export default function KanbanBoard({
  inquiries,
  onRefresh,
  onEditInquiry,
  onConvertInquiry,
  onQuotationInquiry,
}: {
  inquiries: any[];
  onRefresh: () => void;
  onEditInquiry?: (inquiry: any) => void;
  onConvertInquiry?: (inquiryId: string) => void;
  onQuotationInquiry?: (inquiry: any) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetCol, setDropTargetCol] = useState<string | null>(null);

  const getColumnItems = (status: string) =>
    inquiries.filter((inq) => inq.status === status);

  const handleDrop = async (status: string) => {
    if (!draggingId) return;
    setDropTargetCol(null);
    try {
      await fetch(`/api/inquiries/${draggingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDraggingId(null);
    }
  };

  return (
    <div style={{ overflowX: "auto", paddingBottom: "24px" }}>
      <div style={{ display: "flex", gap: "16px", minWidth: "1200px", alignItems: "flex-start" }}>
        {KANBAN_COLUMNS.map((col) => {
          const items = getColumnItems(col.status);
          const isTarget = dropTargetCol === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTargetCol(col.status);
              }}
              onDragLeave={() => setDropTargetCol(null)}
              onDrop={() => handleDrop(col.status)}
              style={{
                flex: "1 1 260px",
                minWidth: "260px",
                maxWidth: "320px",
                background: isTarget ? "var(--card-hover-bg)" : "var(--card-bg)",
                border: isTarget ? `2px dashed ${col.color}` : "1px solid var(--border-color)",
                borderRadius: "14px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                transition: "all 0.15s ease",
              }}
            >
              {/* Column Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }}></span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className={`chip ${col.chipClass}`}
                  style={{ fontSize: "0.68rem", fontWeight: 700, padding: "1px 7px" }}
                >
                  {items.length}
                </span>
              </div>

              {/* Column Cards */}
              {items.map((inq) => {
                const isFollowUpDue = inq.followUpDate && new Date(inq.followUpDate) <= new Date();
                const initials = inq.responsible?.name
                  ? inq.responsible.name.slice(0, 2).toUpperCase()
                  : "SV";

                return (
                  <div
                    key={inq.id}
                    draggable
                    onDragStart={() => setDraggingId(inq.id)}
                    onClick={() => onEditInquiry && onEditInquiry(inq)}
                    className="glass-card"
                    style={{
                      padding: "12px 14px",
                      cursor: "grab",
                      border: isFollowUpDue ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid var(--border-color)",
                      background: "var(--card-bg)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      borderRadius: "10px",
                      transition: "transform 0.1s ease, box-shadow 0.1s ease",
                    }}
                  >
                    {/* Top Row: Inquiry No & EXIM badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0070f3", fontFamily: "monospace" }}>
                        #{inq.inquiryNo}
                      </span>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: inq.exim === "IMP" ? "rgba(0, 112, 243, 0.15)" : "rgba(16, 185, 129, 0.15)",
                          color: inq.exim === "IMP" ? "#0070f3" : "#10b981",
                        }}
                      >
                        {inq.exim ?? "EXP"}
                      </span>
                    </div>

                    {/* Customer */}
                    <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text-main)", lineHeight: 1.2 }}>
                      {inq.customer?.name}
                    </div>

                    {/* Route */}
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>{inq.pol || "POL"}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                      <span>{inq.pod || "POD"}</span>
                    </div>

                    {/* Quoted rate if available */}
                    {inq.quotedRate && (
                      <div style={{ fontSize: "0.725rem", color: "#10b981", fontWeight: 600 }}>
                        Rate: {inq.quotedRate}
                      </div>
                    )}

                    {/* Footer Row: Follow-up / Actions / Initials */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px", paddingTop: "8px", borderTop: "1px solid var(--border-color)", gap: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {inq.followUpDate && (
                          <span
                            className={isFollowUpDue ? "chip chip-warning" : "chip chip-gray"}
                            style={{ fontSize: "0.625rem", padding: "2px 6px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {formatDate(inq.followUpDate)}
                          </span>
                        )}

                        {onQuotationInquiry && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuotationInquiry(inq);
                            }}
                            className="btn btn-sm"
                            style={{
                              background: "rgba(0, 112, 243, 0.12)",
                              color: "#0070f3",
                              border: "1px solid rgba(0, 112, 243, 0.3)",
                              padding: "2px 6px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                            title="Generate Quotation"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            Quote
                          </button>
                        )}

                        {!inq.job && onConvertInquiry && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConvertInquiry(inq.id);
                            }}
                            className="btn btn-sm"
                            style={{
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#10b981",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              padding: "2px 6px",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                            title="Convert to Job"
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                            Job
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#0070f3",
                          color: "#ffffff",
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title={`Responsible: ${inq.responsible?.name ?? "Unassigned"}`}
                      >
                        {initials}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty Column Drop Hint */}
              {items.length === 0 && (
                <div
                  style={{
                    padding: "30px 16px",
                    textAlign: "center",
                    color: "var(--text-subtle)",
                    fontSize: "0.775rem",
                    border: "2px dashed var(--border-color)",
                    borderRadius: "14px",
                  }}
                >
                  Drag & Drop inquiry here
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
