"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface BillingItem {
  id: string;
  charge: string;
  currency: "USD" | "INR";
  amount: number;
  exchangeRate: number;
  convertedInr: number;
  remarks?: string;
}

export default function JobInvoiceModal({
  job,
  onClose,
  onSave,
}: {
  job: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialItems: BillingItem[] = (() => {
    try {
      if (job.finance?.billingItemsJson) {
        return JSON.parse(job.finance.billingItemsJson);
      }
    } catch (e) {}
    
    // Default fallback from job rates
    const exRate = job.finance?.exchangeRate || 87.5;
    const items: BillingItem[] = [];
    if (job.finance?.saleUsd && job.finance.saleUsd > 0) {
      items.push({
        id: "item_1",
        charge: "Ocean Freight",
        currency: "USD",
        amount: job.finance.saleUsd,
        exchangeRate: exRate,
        convertedInr: job.finance.saleUsd * exRate,
        remarks: `Per Container (${job.containerType || "40 HC"})`,
      });
    }
    if (job.finance?.sale && job.finance.sale > 0 && (!job.finance.saleUsd || job.finance.sale > job.finance.saleUsd * exRate)) {
      const extraInr = job.finance.saleUsd ? Math.max(0, job.finance.sale - job.finance.saleUsd * exRate) : job.finance.sale;
      if (extraInr > 0) {
        items.push({
          id: "item_2",
          charge: "Origin / Destination Handling & Clearance",
          currency: "INR",
          amount: extraInr,
          exchangeRate: 1,
          convertedInr: extraInr,
          remarks: "Local Charges",
        });
      }
    }

    if (items.length === 0) {
      items.push({
        id: "item_1",
        charge: "Ocean Freight",
        currency: "USD",
        amount: 510,
        exchangeRate: 87.5,
        convertedInr: 510 * 87.5,
        remarks: "Per Container",
      });
    }
    return items;
  })();

  const [items, setItems] = useState<BillingItem[]>(initialItems);
  const [exchangeRate, setExchangeRate] = useState<number>(job.finance?.exchangeRate || 87.5);
  const [invoiceNo, setInvoiceNo] = useState<string>(job.invoiceNo || job.svilInvoiceNo || `SVIL/INV/${new Date().getFullYear()}/${job.jobId?.slice(-5) || "001"}`);
  const [invoiceDate, setInvoiceDate] = useState<string>(
    job.invoiceDate ? job.invoiceDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [invoiceStatus, setInvoiceStatus] = useState<string>(
    job.invoiceStatus || (job.finance?.invoiceStatus === "INVOICED" ? "INVOICE_GENERATED" : "INVOICE_NOT_GENERATED")
  );
  const [notes, setNotes] = useState<string>(job.finance?.notes || "");

  // Update item
  const updateItem = (id: string, field: keyof BillingItem, val: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === "currency" || field === "amount" || field === "exchangeRate") {
          const cur = field === "currency" ? val : updated.currency;
          const amt = Number(field === "amount" ? val : updated.amount) || 0;
          const rate = Number(field === "exchangeRate" ? val : (cur === "USD" ? exchangeRate : 1));
          updated.exchangeRate = cur === "USD" ? rate : 1;
          updated.convertedInr = cur === "USD" ? amt * rate : amt;
        }
        return updated;
      })
    );
  };

  const addItem = () => {
    const newItem: BillingItem = {
      id: `item_${Date.now()}`,
      charge: "Local Charges / THC",
      currency: "INR",
      amount: 0,
      exchangeRate: 1,
      convertedInr: 0,
      remarks: "",
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const totalUsd = items.filter((i) => i.currency === "USD").reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalInr = items.reduce((sum, i) => sum + (Number(i.convertedInr) || 0), 0);

  const handleSave = async (markGenerated = false) => {
    setLoading(true);
    setError("");
    const newStatus = markGenerated ? "INVOICE_GENERATED" : invoiceStatus;

    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceStatus: newStatus,
          invoiceNo,
          invoiceDate,
          svilInvoiceNo: invoiceNo,
          saleUsd: totalUsd,
          sale: totalInr,
          exchangeRate,
          billingItemsJson: items,
          notes,
        }),
      });

      setLoading(false);
      if (res.ok) {
        onSave();
        onClose();
      } else {
        const d = await res.json();
        setError(d.error || "Failed to update invoice details");
      }
    } catch (e: any) {
      setLoading(false);
      setError(e.message || "Network error");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: "1020px", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--border-color)", paddingBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ background: "rgba(0, 112, 243, 0.15)", color: "#0070f3", border: "1px solid rgba(0, 112, 243, 0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700 }}>
                FINANCE &amp; BILLING HUB
              </span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Job Invoice &amp; Billing: {job.jobId}
              </h2>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Customer: <strong>{job.partyName || job.customer?.name}</strong> | Route: <strong>{job.pol} &rarr; {job.pod}</strong>
            </p>
          </div>
          <button id="modal-close-invoice" onClick={onClose} className="btn btn-ghost btn-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* Invoice Metadata Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: "12px", background: "var(--card-hover-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "14px", marginBottom: "18px" }}>
          <div>
            <label style={labelStyle}>Invoice Number</label>
            <input
              id="invoice-no-input"
              className="form-input"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="e.g. SVIL/INV/2026/001"
            />
          </div>
          <div>
            <label style={labelStyle}>Invoice Date</label>
            <input
              id="invoice-date-input"
              type="date"
              className="form-input"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Invoice Status</label>
            <select
              id="invoice-status-select"
              className="form-input"
              value={invoiceStatus}
              onChange={(e) => setInvoiceStatus(e.target.value)}
              style={{
                fontWeight: 700,
                color: invoiceStatus === "INVOICE_GENERATED" ? "#10b981" : "#f59e0b",
              }}
            >
              <option value="INVOICE_NOT_GENERATED">Pending Invoice</option>
              <option value="INVOICE_GENERATED">Invoice Generated / Raised</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Live USD Exchange Rate (₹)</label>
            <input
              id="invoice-exchange-rate"
              type="number"
              step="0.01"
              className="form-input"
              value={exchangeRate}
              onChange={(e) => {
                const newRate = Number(e.target.value) || 87.5;
                setExchangeRate(newRate);
                // recompute items converted amount
                setItems((prev) =>
                  prev.map((it) => ({
                    ...it,
                    exchangeRate: it.currency === "USD" ? newRate : 1,
                    convertedInr: it.currency === "USD" ? (Number(it.amount) || 0) * newRate : Number(it.amount) || 0,
                  }))
                );
              }}
            />
          </div>
        </div>

        {/* Multi-Currency Billing Table */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", margin: 0, textTransform: "uppercase" }}>
              Billing Line Items (USD &amp; INR with Auto-Conversion)
            </h3>
            <button id="btn-add-billing-item" type="button" onClick={addItem} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Charge
            </button>
          </div>

          <div style={{ overflowX: "auto", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
            <table className="data-table" style={{ margin: 0, width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: "180px" }}>Charge Description</th>
                  <th style={{ width: "85px", textAlign: "center" }}>Currency</th>
                  <th style={{ width: "150px", textAlign: "right" }}>Amount</th>
                  <th style={{ width: "95px", textAlign: "right" }}>Ex. Rate</th>
                  <th style={{ width: "160px", textAlign: "right" }}>Converted INR (₹)</th>
                  <th style={{ minWidth: "150px" }}>Remarks</th>
                  <th style={{ width: "35px" }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        className="form-input form-input-sm"
                        value={item.charge}
                        onChange={(e) => updateItem(item.id, "charge", e.target.value)}
                        placeholder="e.g. Ocean Freight, THC"
                      />
                    </td>
                    <td>
                      <select
                        className="form-input form-input-sm"
                        value={item.currency}
                        onChange={(e) => updateItem(item.id, "currency", e.target.value as any)}
                        style={{ fontWeight: 800, textAlign: "center", padding: "4px 6px" }}
                      >
                        <option value="USD">$ USD</option>
                        <option value="INR">₹ INR</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        className="form-input form-input-sm"
                        value={item.amount}
                        onChange={(e) => updateItem(item.id, "amount", e.target.value)}
                        placeholder="0.00"
                        style={{ textAlign: "right", fontWeight: 700, fontSize: "0.95rem", width: "100%", color: item.currency === "USD" ? "#0070f3" : "var(--text-main)" }}
                      />
                    </td>
                    <td style={{ textAlign: "right", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      {item.currency === "USD" ? `₹${exchangeRate}` : "1.00"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#10b981", fontSize: "0.95rem", whiteSpace: "nowrap" }}>
                      ₹{Number(item.convertedInr || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <input
                        className="form-input form-input-sm"
                        value={item.remarks || ""}
                        onChange={(e) => updateItem(item.id, "remarks", e.target.value)}
                        placeholder="e.g. Per Container"
                      />
                    </td>
                    <td>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ color: "#ef4444", padding: "2px 6px" }}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Billing Totals Summary Card */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "14px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "16px" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", display: "block" }}>
                Total USD Component
              </span>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0070f3" }}>
                ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                @ 1 USD = ₹{exchangeRate}
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)", textTransform: "uppercase", display: "block" }}>
                Total Converted Invoice Amount (INR)
              </span>
              <span style={{ fontSize: "1.45rem", fontWeight: 900, color: "#10b981" }}>
                ₹{totalInr.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                Ready for Tally Entry
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "18px" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-subtle)" }}>
              Status: <strong style={{ color: invoiceStatus === "INVOICE_GENERATED" ? "#10b981" : "#f59e0b" }}>
                {invoiceStatus === "INVOICE_GENERATED" ? "Invoice Generated (Raised)" : "Invoice Not Generated (Pending)"}
              </strong>
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button
              id="btn-save-invoice-draft"
              type="button"
              onClick={() => handleSave(false)}
              className="btn btn-secondary"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Draft"}
            </button>
            <button
              id="btn-mark-invoice-generated"
              type="button"
              onClick={() => handleSave(true)}
              className="btn btn-primary"
              disabled={loading}
              style={{
                background: "#10b981",
                borderColor: "#10b981",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mark Invoice Raised
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.725rem",
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: "4px",
};
