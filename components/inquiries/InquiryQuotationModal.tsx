"use client";

import { useState } from "react";
import { generateQuotationPdf } from "@/lib/quotationPdf";

const CHARGE_PRESETS = [
  "Sea Freight",
  "Ocean Freight",
  "Air Freight",
  "THC",
  "SEAL",
  "BL CHARGES",
  "MUC",
  "TOLL",
  "AGENCY",
  "EXAMINATION",
  "VGM",
  "WAREHOUSE CHARGES",
  "LOLO",
  "TRANSPORT",
  "BAFAR CHARGES",
  "CFS CHARGES",
  "DO CHARGES",
  "CUSTOMS CLEARANCE",
  "INSURANCE",
];

const UNIT_PRESETS = [
  "Per CONTAINER",
  "Per BL",
  "Per CBM",
  "Per KG",
  "Per TRUCK",
  "Per SET",
  "Per TEU",
  "Per SHIPMENT",
  "At Actual",
  "Lump Sum",
];

export default function InquiryQuotationModal({
  inquiry,
  onClose,
  onSuccess,
}: {
  inquiry: any;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const initialCompanyName = inquiry?.customer?.name || inquiry?.contactPerson || "";
  const initialFreightType = inquiry?.exim === "EXPORT" ? "Sea Freight Export" : inquiry?.exim === "AIR" ? "Air Freight" : "Sea Freight";
  const initialPortOrigin = inquiry?.pol || "MUNDRA";
  const initialPortDest = inquiry?.pod || "";
  const initialContainer = inquiry?.containerVolume || "40 FT";
  const initialVolWeight = `${inquiry?.weightKgs ? inquiry.weightKgs + " KGS" : ""} ${inquiry?.containerVolume ? inquiry.containerVolume : "28 MT APX"}`.trim();
  const initialCommodity = inquiry?.commodity || "";

  // Parse quoted rate from inquiry if available
  const parsedCurrency = inquiry?.quotedRate?.toUpperCase().includes("INR") ? "INR" : "USD";
  const parsedAmount = inquiry?.quotedRate ? inquiry.quotedRate.replace(/[^0-9.]/g, "") : "510";

  const [form, setForm] = useState({
    quotationNo: `SV-Q${inquiry?.inquiryNo ? String(inquiry.inquiryNo).padStart(4, "0") : String(Date.now()).slice(-4)}`,
    companyName: initialCompanyName,
    freightType: initialFreightType,
    date: new Date().toISOString().slice(0, 10),
    validUntilText: "VALID 7 DAYS",
    originPort: initialPortOrigin,
    destinationPort: initialPortDest,
    containerType: initialContainer,
    volumeWeight: initialVolWeight,
    commodity: initialCommodity,
    routing: inquiry?.shippingLine?.name ? inquiry.shippingLine.name : "MLO",
    vesselSchedule: "SUBJECT TO CONFIRMATION",
    transitTime: "4 DAYS",
    freeDays: "14 DAYS",
    spaceAvailability: "SUBJECT TO SPACE AVAILABILITY.",
    notes: "- Rates are subject to space availability and change without prior notice.\n- GST & Govt charges will be at actual as per gov norms.\nFor any queries or clarification, please feel free to contact us.",
  });

  const [items, setItems] = useState([
    { chargeDescription: "Sea Freight", rateCurrency: parsedCurrency, rateAmount: parsedAmount || "510", unit: "Per CONTAINER", remarks: "Ocean Freight" },
    { chargeDescription: "THC", rateCurrency: "INR", rateAmount: "18500", unit: "Per CONTAINER", remarks: "Terminal Handling Charge" },
    { chargeDescription: "SEAL", rateCurrency: "INR", rateAmount: "900", unit: "Per CONTAINER", remarks: "Bottle Seal" },
    { chargeDescription: "BL CHARGES", rateCurrency: "INR", rateAmount: "5300", unit: "Per BL", remarks: "Documentation" },
  ]);

  const setField = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addItem = () => {
    setItems((curr) => [
      ...curr,
      { chargeDescription: "CFS CHARGES", rateCurrency: "INR", rateAmount: "4500", unit: "Per CONTAINER", remarks: "" },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((curr) => curr.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, k: string, v: any) => {
    setItems((curr) => {
      const copy = [...curr];
      copy[index] = { ...copy[index], [k]: v };
      return copy;
    });
  };

  const buildPdfData = () => ({
    quotationNo: form.quotationNo,
    date: form.date,
    validUntilText: form.validUntilText,
    companyName: form.companyName,
    freightType: form.freightType,
    originPort: form.originPort,
    destinationPort: form.destinationPort,
    containerType: form.containerType,
    volumeWeight: form.volumeWeight,
    commodity: form.commodity,
    routing: form.routing,
    vesselSchedule: form.vesselSchedule,
    transitTime: form.transitTime,
    freeDays: form.freeDays,
    spaceAvailability: form.spaceAvailability,
    notes: form.notes,
    items: items.map((it) => ({
      chargeDescription: it.chargeDescription,
      rateCurrency: it.rateCurrency,
      rateAmount: it.rateAmount,
      unit: it.unit,
      remarks: it.remarks,
    })),
  });

  const handlePreviewPdf = () => {
    if (!form.companyName?.trim()) {
      setError("Company Name is required to preview quotation");
      return;
    }
    setError("");
    generateQuotationPdf(buildPdfData(), "print");
  };

  const handleDownloadPdf = () => {
    if (!form.companyName?.trim()) {
      setError("Company Name is required to generate quotation");
      return;
    }
    setError("");
    generateQuotationPdf(buildPdfData(), "download");

    // Also mark inquiry as rateSent = true
    if (inquiry?.id) {
      fetch(`/api/inquiries/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateSent: true }),
      }).catch(() => {});
    }
  };

  const handleSaveAndRegister = async () => {
    if (!form.companyName?.trim()) {
      setError("Company Name is required");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        customerId: inquiry?.customer?.id || undefined,
        items,
      };

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Quotation successfully created and archived!");
        // Update inquiry rateSent flag
        if (inquiry?.id) {
          await fetch(`/api/inquiries/${inquiry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rateSent: true, quotedRate: `${items[0]?.rateCurrency || "USD"} ${items[0]?.rateAmount || ""}` }),
          });
        }
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      } else {
        setError(data.error || "Failed to save quotation");
      }
    } catch (e: any) {
      setError(e.message || "Failed to save quotation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: "880px", maxHeight: "92vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0, 112, 243, 0.12)", color: "#0070f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                Generate Quotation &mdash; Inquiry #{inquiry?.inquiryNo}
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Auto-populated from inquiry details. Download as official SVIL PDF or register to CRM quotations.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.85rem", marginBottom: "14px" }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: "10px 14px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", color: "#10b981", fontSize: "0.85rem", marginBottom: "14px" }}>
            {successMsg}
          </div>
        )}

        {/* Form Body */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Section 1: Company & Quotation Metadata */}
          <div className="glass-card" style={{ padding: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Company / Customer *</label>
              <input
                className="form-input"
                value={form.companyName}
                onChange={(e) => setField("companyName", e.target.value)}
                placeholder="Company Name"
                required
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Quotation No</label>
              <input
                className="form-input"
                value={form.quotationNo}
                onChange={(e) => setField("quotationNo", e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Freight Type</label>
              <input
                className="form-input"
                value={form.freightType}
                onChange={(e) => setField("freightType", e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Validity</label>
              <input
                className="form-input"
                value={form.validUntilText}
                onChange={(e) => setField("validUntilText", e.target.value)}
                placeholder="e.g. VALID 7 DAYS"
              />
            </div>
          </div>

          {/* Section 2: Route & Shipment Specifications */}
          <div className="glass-card" style={{ padding: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Origin Port (POL)</label>
              <input className="form-input" value={form.originPort} onChange={(e) => setField("originPort", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Destination Port (POD)</label>
              <input className="form-input" value={form.destinationPort} onChange={(e) => setField("destinationPort", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Container / Type</label>
              <input className="form-input" value={form.containerType} onChange={(e) => setField("containerType", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Volume &amp; Weight</label>
              <input className="form-input" value={form.volumeWeight} onChange={(e) => setField("volumeWeight", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Commodity</label>
              <input className="form-input" value={form.commodity} onChange={(e) => setField("commodity", e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Routing / Line</label>
              <input className="form-input" value={form.routing} onChange={(e) => setField("routing", e.target.value)} />
            </div>
          </div>

          {/* Section 3: Itemized Quotation Charges */}
          <div className="glass-card" style={{ padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)", margin: 0, textTransform: "uppercase" }}>
                Freight &amp; Ancillary Charges Breakdown
              </h4>
              <button type="button" onClick={addItem} className="btn btn-secondary btn-sm" style={{ padding: "3px 8px", fontSize: "0.75rem" }}>
                + Add Charge
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.2fr 1.5fr 2fr 32px", gap: "8px", alignItems: "center" }}>
                  <input
                    list={`charge-presets-${idx}`}
                    className="form-input"
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                    value={it.chargeDescription}
                    onChange={(e) => updateItem(idx, "chargeDescription", e.target.value)}
                    placeholder="Charge Name"
                  />
                  <datalist id={`charge-presets-${idx}`}>
                    {CHARGE_PRESETS.map((c) => <option key={c} value={c} />)}
                  </datalist>

                  <select
                    className="form-input"
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                    value={it.rateCurrency}
                    onChange={(e) => updateItem(idx, "rateCurrency", e.target.value)}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="AED">AED</option>
                  </select>

                  <input
                    className="form-input"
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                    value={it.rateAmount}
                    onChange={(e) => updateItem(idx, "rateAmount", e.target.value)}
                    placeholder="Rate / Amount"
                  />

                  <input
                    list={`unit-presets-${idx}`}
                    className="form-input"
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                    value={it.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    placeholder="Unit"
                  />
                  <datalist id={`unit-presets-${idx}`}>
                    {UNIT_PRESETS.map((u) => <option key={u} value={u} />)}
                  </datalist>

                  <input
                    className="form-input"
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                    value={it.remarks || ""}
                    onChange={(e) => updateItem(idx, "remarks", e.target.value)}
                    placeholder="Optional remarks/notes..."
                  />

                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: "#ef4444", padding: "4px", minWidth: "28px" }}
                    title="Remove charge"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Transit Time & Schedule */}
          <div className="glass-card" style={{ padding: "14px" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 12px 0" }}>
              4. Transit Time &amp; Schedule
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>Routing (e.g. MLO, Direct)</label>
                <input
                  className="form-input"
                  value={form.routing}
                  onChange={(e) => setField("routing", e.target.value)}
                  placeholder="e.g. MLO"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>Vessel / Schedule</label>
                <input
                  className="form-input"
                  value={form.vesselSchedule}
                  onChange={(e) => setField("vesselSchedule", e.target.value)}
                  placeholder="e.g. SUBJECT TO CONFIRMATION"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>Transit Time</label>
                <input
                  className="form-input"
                  value={form.transitTime}
                  onChange={(e) => setField("transitTime", e.target.value)}
                  placeholder="e.g. 4 DAYS"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>Free Days</label>
                <input
                  className="form-input"
                  value={form.freeDays}
                  onChange={(e) => setField("freeDays", e.target.value)}
                  placeholder="e.g. 14 DAYS"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>Space Terms &amp; Availability</label>
              <input
                className="form-input"
                value={form.spaceAvailability}
                onChange={(e) => setField("spaceAvailability", e.target.value)}
                placeholder="e.g. SUBJECT TO SPACE AVAILABILITY."
              />
            </div>
          </div>

          {/* Section 5: Standard Terms & Notes */}
          <div className="glass-card" style={{ padding: "14px" }}>
            <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "6px" }}>
              Standard Terms &amp; Notes
            </label>
            <textarea
              className="form-input"
              rows={4}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="- Rates are subject to space availability and change without prior notice.&#10;- GST & Govt charges will be at actual as per gov norms.&#10;For any queries or clarification, please feel free to contact us."
              style={{ width: "100%", fontFamily: "inherit", fontSize: "0.825rem", lineHeight: "1.4" }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "20px", borderTop: "1px solid var(--border-color)", paddingTop: "14px", flexWrap: "wrap", gap: "10px" }}>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePreviewPdf}
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 600 }}
          >
            Live Preview PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="btn btn-secondary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, borderColor: "#0070f3", color: "#0070f3", background: "rgba(0, 112, 243, 0.08)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Download PDF
          </button>
          <button
            type="button"
            onClick={handleSaveAndRegister}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
          >
            {loading ? "Saving..." : "Save Quotation"}
          </button>
        </div>
      </div>
    </div>
  );
}
