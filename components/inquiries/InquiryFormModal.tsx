"use client";

import { useState, useEffect } from "react";

const STATUSES = [
  { value: "IN_PROCESS", label: "In Process" },
  { value: "BOOKED", label: "Booked" },
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

const EXIM = ["EX", "IM", "EXIM", "Trns", "Clr", "Insurance"];
const SHIPMENT = ["FCL", "LCL", "Air", "Courier"];
const INCO_TERMS = ["CFI", "FOB", "DDP", "FCA", "DDU", "EXW", "DAP", "Other"];
const INQUIRY_TYPES = ["Export", "Import"];

export default function InquiryFormModal({
  inquiry,
  masters,
  onClose,
  onSave,
  onConvert,
}: {
  inquiry?: any;
  masters: any;
  onClose: () => void;
  onSave: () => void;
  onConvert?: (inquiry: any) => void;
}) {
  const isEdit = !!inquiry;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customerName: inquiry?.customer?.name ?? "",
    contactPerson: inquiry?.contactPerson ?? "",
    phoneEmail: inquiry?.phoneEmail ?? "",
    inquiryDate: inquiry?.inquiryDate ? inquiry.inquiryDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    pol: inquiry?.pol ?? "",
    pod: inquiry?.pod ?? "",
    commodity: inquiry?.commodity ?? "",
    exim: inquiry?.exim ?? "EX",
    shipmentType: inquiry?.shipmentType ?? "FCL",
    incoTerms: inquiry?.incoTerms ?? "",
    inquiryType: inquiry?.inquiryType ?? "Export",
    containerVolume: inquiry?.containerVolume ?? "",
    weightKgs: inquiry?.weightKgs ?? "",
    shippingLineId: inquiry?.shippingLine?.id ?? "",
    rateSent: inquiry?.rateSent ?? false,
    quotedRate: inquiry?.quotedRate ?? "",
    status: inquiry?.status ?? "IN_PROCESS",
    responsibleId: inquiry?.responsible?.id ?? "",
    remarks: inquiry?.remarks ?? "",
    followUpDate: inquiry?.followUpDate ? inquiry.followUpDate.slice(0, 10) : "",
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  // Auto-populate customer details on customer selection
  const handleCustomerChange = (val: string) => {
    const matched = (masters.customers || []).find(
      (c: any) => c.name?.trim().toLowerCase() === val?.trim().toLowerCase()
    );
    if (matched) {
      setForm((f) => ({
        ...f,
        customerName: val,
        contactPerson: matched.contactPerson || f.contactPerson || "",
        phoneEmail: matched.phone || matched.email || f.phoneEmail || "",
      }));
    } else {
      set("customerName", val);
    }
  };

  // Deduplicate users/employees by name so each person appears exactly once in the dropdown
  const uniqueUsers: any[] = Array.from(
    new Map((masters.users || []).map((u: any) => [u.name.trim().toLowerCase(), u])).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName?.trim()) {
      setError("Customer Name is required");
      return;
    }
    setLoading(true);
    setError("");

    const url = isEdit ? `/api/inquiries/${inquiry.id}` : "/api/inquiries";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (res.ok) {
      onSave();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to save");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--text-main)" }}>
            {isEdit ? "Edit Inquiry" : "New Inquiry"}
          </h2>
          <button id="modal-close" onClick={onClose} className="btn btn-ghost btn-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "#ef4444", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <FormField label="Customer Name" required>
              <input
                id="inq-customer"
                list="customer-list"
                className="form-input"
                value={form.customerName}
                onChange={(e) => handleCustomerChange(e.target.value)}
                placeholder="Type or select customer..."
                required
              />
              <datalist id="customer-list">
                {masters.customers?.map((c: any) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Inquiry Date" required>
              <input
                id="inq-date"
                type="date"
                className="form-input"
                value={form.inquiryDate}
                onChange={(e) => set("inquiryDate", e.target.value)}
                required
              />
            </FormField>

            <FormField label="Contact Person">
              <input
                id="inq-contact"
                className="form-input"
                placeholder="Auto-filled or enter contact..."
                value={form.contactPerson}
                onChange={(e) => set("contactPerson", e.target.value)}
              />
            </FormField>

            <FormField label="Phone / Email">
              <input
                id="inq-phone"
                className="form-input"
                placeholder="Auto-filled or enter phone/email..."
                value={form.phoneEmail}
                onChange={(e) => set("phoneEmail", e.target.value)}
              />
            </FormField>

            <FormField label="Type of Inquiry">
              <select
                id="inq-type"
                className="form-input"
                value={form.inquiryType}
                onChange={(e) => set("inquiryType", e.target.value)}
              >
                {INQUIRY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Inco Terms">
              <select
                id="inq-incoterms"
                className="form-input"
                value={form.incoTerms}
                onChange={(e) => set("incoTerms", e.target.value)}
              >
                <option value="">— Select Inco Terms (Optional) —</option>
                {INCO_TERMS.map((inc) => (
                  <option key={inc} value={inc}>{inc}</option>
                ))}
              </select>
            </FormField>

            <FormField label="POL (Port of Loading)">
              <input
                id="inq-pol"
                list="port-list"
                className="form-input"
                value={form.pol}
                onChange={(e) => set("pol", e.target.value)}
                placeholder="e.g. Mundra (Optional)"
              />
              <datalist id="port-list">
                {masters.ports?.map((p: any) => <option key={p.id} value={p.name} />)}
              </datalist>
            </FormField>

            <FormField label="POD (Port of Discharge)">
              <input
                id="inq-pod"
                list="port-list-2"
                className="form-input"
                value={form.pod}
                onChange={(e) => set("pod", e.target.value)}
                placeholder="e.g. Shanghai (Optional)"
              />
              <datalist id="port-list-2">
                {masters.ports?.map((p: any) => <option key={p.id} value={p.name} />)}
              </datalist>
            </FormField>

            <FormField label="EXIM">
              <select id="inq-exim" className="form-input" value={form.exim} onChange={(e) => set("exim", e.target.value)}>
                {EXIM.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </FormField>

            <FormField label="Shipment Type">
              <select id="inq-shipment" className="form-input" value={form.shipmentType} onChange={(e) => set("shipmentType", e.target.value)}>
                {SHIPMENT.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>

            <FormField label="Commodity">
              <input id="inq-commodity" className="form-input" placeholder="e.g. Ceramic Tiles" value={form.commodity} onChange={(e) => set("commodity", e.target.value)} />
            </FormField>

            <FormField label="Container / Volume">
              <input id="inq-container" className="form-input" placeholder="e.g. 20/40 or 5 CBM" value={form.containerVolume} onChange={(e) => set("containerVolume", e.target.value)} />
            </FormField>

            <FormField label="Weight (KGS)">
              <input id="inq-weight" className="form-input" placeholder="e.g. 28000" value={form.weightKgs} onChange={(e) => set("weightKgs", e.target.value)} />
            </FormField>

            <FormField label="Shipping Line">
              <select id="inq-liner" className="form-input" value={form.shippingLineId} onChange={(e) => set("shippingLineId", e.target.value)}>
                <option value="">— Select —</option>
                {masters.liners?.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </FormField>

            <FormField label="Quoted Rate">
              <input id="inq-rate" className="form-input" placeholder="e.g. USD 2478/20'" value={form.quotedRate} onChange={(e) => set("quotedRate", e.target.value)} />
            </FormField>

            <FormField label="Rate Sent">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "8px" }}>
                <input
                  id="inq-rate-sent"
                  type="checkbox"
                  style={{ width: "16px", height: "16px", accentColor: "#0070f3" }}
                  checked={form.rateSent}
                  onChange={(e) => set("rateSent", e.target.checked)}
                />
                <label htmlFor="inq-rate-sent" style={{ fontSize: "0.875rem", color: "var(--text-main)", fontWeight: 600, cursor: "pointer" }}>
                  Rate Sent to Client
                </label>
              </div>
            </FormField>

            <FormField label="Status">
              <select id="inq-status" className="form-input" value={form.status} onChange={(e) => set("status", e.target.value)}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </FormField>

            <FormField label="Responsible Employee" required>
              <select id="inq-responsible" className="form-input" value={form.responsibleId} onChange={(e) => set("responsibleId", e.target.value)} required>
                <option value="">— Select Employee —</option>
                {uniqueUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FormField>

            <FormField label="Follow-up Date">
              <input
                id="inq-followup"
                type="date"
                className="form-input"
                value={form.followUpDate}
                onChange={(e) => set("followUpDate", e.target.value)}
              />
            </FormField>

            <div style={{ gridColumn: "1 / -1" }}>
              <FormField label="Remarks">
                <textarea
                  id="inq-remarks"
                  className="form-input"
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => set("remarks", e.target.value)}
                  style={{ resize: "vertical" }}
                  placeholder="Internal notes or inquiry remarks..."
                />
              </FormField>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-color)" }}>
            {isEdit && inquiry && !inquiry?.job && (
              <button
                id="btn-convert-job-modal"
                type="button"
                onClick={() => {
                  if (onConvert) {
                    onConvert(inquiry);
                  }
                }}
                className="btn btn-secondary"
                style={{
                  marginRight: "auto",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
                Convert to Job
              </button>
            )}
            <button id="modal-cancel" type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button id="modal-submit" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Inquiry" : "Create Inquiry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      {children}
    </div>
  );
}
