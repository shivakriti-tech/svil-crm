"use client";

import { useState } from "react";

const EXIM_TYPES = ["EX", "IM", "EXIM", "Trns", "Clr", "C_T"];
const SHIPMENT_TYPES = ["FCL", "LCL", "Air"];
const SCOPES = ["Forwarding", "Clearance", "Transportation"];
const INCO_TERMS = ["Ex Works", "FOB", "CIF", "CFR", "DAP", "DDP", "FCA", "CPT"];

export default function JobFormModal({
  masters,
  onClose,
  onSave,
}: {
  masters: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"parties" | "shipment" | "cargo" | "billing">("parties");

  const [form, setForm] = useState({
    partyName: "",
    consignee: "",
    notifyParty: "SIDDHI VINAYAK INTERNATIONAL LOGISTICS\n317, 3RD FLOOR, SHIVALIK SQUARE, VEMALI, VADODARA - 390024",
    shipper: "",
    
    // Route & Ports
    origin: "",
    pol: "",
    pod: "",
    finalDestination: "",
    placeOfAcceptance: "",
    placeOfDelivery: "",
    
    // CAN & BL Document Details
    igmNo: "",
    igmDate: "",
    mblNo: "",
    hblNo: "",
    forwarderHblNo: "",
    carrierName: "",
    cfsName: "JWR LOGISTICS PRIVATE LIMITED",
    vesselVoyage: "",
    incoTerm: "Ex Works",
    itemNo: "",
    subItemNo: "",
    shipmentTerms: "LCL/LCL",
    
    // Container & Cargo
    containerType: "40 HC",
    containerNo: "",
    sealNo: "",
    packageType: "4 PACKAGE(S)",
    marksNumbers: "SL MP 1 4 4",
    cargoDescription: "",
    weightKgs: "",
    volumeCbm: "",
    grossWeight: "",
    netWeight: "",
    
    // Operational
    scope: ["Forwarding"] as string[],
    chaId: "",
    linerId: "",
    shipmentType: "EX",
    fclLcl: "FCL",
    commodity: "",
    volume: "",
    etd: "",
    eta: "",
    responsibleId: "",
    
    // Billing & Multi-Currency (USD -> INR Auto Conversion)
    saleUsd: 0,
    exchangeRate: 87.5,
    saleInr: 0,
    buyUsd: 0,
    buy: 0,
    invoiceStatus: "INVOICE_NOT_GENERATED",
  });

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  // Deduplicate users/employees by name
  const uniqueUsers: any[] = Array.from(
    new Map((masters.users || []).map((u: any) => [u.name.trim().toLowerCase(), u])).values()
  ).sort((a: any, b: any) => a.name.localeCompare(b.name));

  const toggleScope = (scope: string) => {
    setForm((f) => ({
      ...f,
      scope: f.scope.includes(scope) ? f.scope.filter((s) => s !== scope) : [...f.scope, scope],
    }));
  };

  const calculatedInr = form.saleUsd ? (Number(form.saleUsd) * Number(form.exchangeRate || 87.5)).toFixed(2) : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partyName || !form.pol || !form.pod || !form.shipmentType) {
      setError("Party Name, POL, POD and Shipment Type are required");
      return;
    }
    setLoading(true);
    setError("");

    const payload = {
      ...form,
      sale: Number(calculatedInr) || form.saleInr || 0,
    };

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      onSave();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create job");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: "840px", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
              New Job &amp; Shipment Record
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Fill CAN copy specifications, Bill of Lading data, and Multi-Currency billing.
            </p>
          </div>
          <button id="modal-close-job" onClick={onClose} className="btn btn-ghost btn-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", color: "#ef4444", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: "flex", gap: "6px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", marginBottom: "18px" }}>
          {[
            { id: "parties", label: "1. Parties & Route" },
            { id: "shipment", label: "2. CAN & BL Details" },
            { id: "cargo", label: "3. Cargo & Container" },
            { id: "billing", label: "4. Multi-Currency Billing" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className="btn btn-sm"
              style={{
                background: activeTab === tab.id ? "#0070f3" : "transparent",
                color: activeTab === tab.id ? "#ffffff" : "var(--text-muted)",
                fontWeight: activeTab === tab.id ? 700 : 500,
                borderRadius: "8px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* TAB 1: PARTIES & ROUTE */}
          {activeTab === "parties" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Party Name *</label>
                  <input
                    id="job-party"
                    list="customer-list-job"
                    className="form-input"
                    value={form.partyName}
                    onChange={(e) => {
                      set("partyName", e.target.value);
                      if (!form.consignee) set("consignee", e.target.value);
                      if (!form.shipper) set("shipper", e.target.value);
                    }}
                    placeholder="Customer / Party name"
                    required
                  />
                  <datalist id="customer-list-job">
                    {masters.customers?.map((c: any) => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>

                <div>
                  <label style={labelStyle}>Responsible Employee</label>
                  <select id="job-responsible" className="form-input" value={form.responsibleId} onChange={(e) => set("responsibleId", e.target.value)}>
                    <option value="">— Select Employee —</option>
                    {uniqueUsers.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              {/* 3 Mandatory CAN/BL Parties */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", background: "var(--card-hover-bg)", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
                <div>
                  <label style={labelStyle}>Consignee (Full Address)</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="Consignee Name & Address"
                    value={form.consignee}
                    onChange={(e) => set("consignee", e.target.value)}
                    style={{ resize: "vertical", fontSize: "0.8rem" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Notify Party (Full Address)</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="Notify Party Name & Address"
                    value={form.notifyParty}
                    onChange={(e) => set("notifyParty", e.target.value)}
                    style={{ resize: "vertical", fontSize: "0.8rem" }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Shipper (Full Address)</label>
                  <textarea
                    rows={3}
                    className="form-input"
                    placeholder="Shipper Name & Address"
                    value={form.shipper}
                    onChange={(e) => set("shipper", e.target.value)}
                    style={{ resize: "vertical", fontSize: "0.8rem" }}
                  />
                </div>
              </div>

              {/* Route */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Origin City/Port</label>
                  <input className="form-input" placeholder="e.g. Shenzhen, CNSZX" value={form.origin} onChange={(e) => set("origin", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>POL (Port of Loading) *</label>
                  <input id="job-pol" list="port-list-job" className="form-input" value={form.pol} onChange={(e) => set("pol", e.target.value)} required />
                  <datalist id="port-list-job">
                    {masters.ports?.map((p: any) => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle}>POD (Port of Discharge) *</label>
                  <input id="job-pod" list="port-list-job2" className="form-input" value={form.pod} onChange={(e) => set("pod", e.target.value)} required />
                  <datalist id="port-list-job2">
                    {masters.ports?.map((p: any) => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle}>Final Destination</label>
                  <input className="form-input" placeholder="e.g. NHAVA SHEVA, INNSA" value={form.finalDestination} onChange={(e) => set("finalDestination", e.target.value)} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={labelStyle}>Place of Acceptance (BL)</label>
                  <input className="form-input" placeholder="e.g. ICD AHMEDABAD, INDIA" value={form.placeOfAcceptance} onChange={(e) => set("placeOfAcceptance", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>Place of Delivery (BL)</label>
                  <input className="form-input" placeholder="e.g. PORTKLANG, MALAYSIA" value={form.placeOfDelivery} onChange={(e) => set("placeOfDelivery", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAN & BL DETAILS */}
          {activeTab === "shipment" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>IGM No</label>
                <input className="form-input" placeholder="e.g. 1200297" value={form.igmNo} onChange={(e) => set("igmNo", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>IGM Date</label>
                <input type="date" className="form-input" value={form.igmDate} onChange={(e) => set("igmDate", e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>MBL No</label>
                <input id="job-mbl" className="form-input" placeholder="e.g. 030G530663" value={form.mblNo} onChange={(e) => set("mblNo", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>HBL No</label>
                <input id="job-hbl" className="form-input" placeholder="e.g. AFXML26007738" value={form.hblNo} onChange={(e) => set("hblNo", e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Carrier / Shipping Line</label>
                <input className="form-input" placeholder="e.g. WAN HAI LINES (INDIA) PRIVATE LIMITED" value={form.carrierName} onChange={(e) => set("carrierName", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>CFS Name</label>
                <input className="form-input" placeholder="e.g. JWR LOGISTICS PRIVATE LIMITED" value={form.cfsName} onChange={(e) => set("cfsName", e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Vessel / Voyage</label>
                <input className="form-input" placeholder="e.g. WAN HAI 507 / 244" value={form.vesselVoyage} onChange={(e) => set("vesselVoyage", e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>ETD (Departure Date)</label>
                  <input id="job-etd" type="date" className="form-input" value={form.etd} onChange={(e) => set("etd", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>ETA (Arrival Date)</label>
                  <input id="job-eta" type="date" className="form-input" value={form.eta} onChange={(e) => set("eta", e.target.value)} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Inco Term</label>
                <select className="form-input" value={form.incoTerm} onChange={(e) => set("incoTerm", e.target.value)}>
                  {INCO_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Shipment Terms</label>
                <input className="form-input" placeholder="e.g. LCL/LCL, FCL/FCL" value={form.shipmentTerms} onChange={(e) => set("shipmentTerms", e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Item No</label>
                <input className="form-input" placeholder="e.g. 324" value={form.itemNo} onChange={(e) => set("itemNo", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Sub Item No</label>
                <input className="form-input" placeholder="e.g. 7" value={form.subItemNo} onChange={(e) => set("subItemNo", e.target.value)} />
              </div>
            </div>
          )}

          {/* TAB 3: CARGO & CONTAINER SPECIFICATIONS */}
          {activeTab === "cargo" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={labelStyle}>Container No</label>
                <input className="form-input" placeholder="e.g. WHSU6217432" value={form.containerNo} onChange={(e) => set("containerNo", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Seal No</label>
                <input className="form-input" placeholder="e.g. WHA2354488" value={form.sealNo} onChange={(e) => set("sealNo", e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Package Type</label>
                <input className="form-input" placeholder="e.g. 4 PACKAGE(S)" value={form.packageType} onChange={(e) => set("packageType", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Marks &amp; Numbers</label>
                <input className="form-input" placeholder="e.g. SL MP 1 4 4" value={form.marksNumbers} onChange={(e) => set("marksNumbers", e.target.value)} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Cargo Description (Full Details for CAN &amp; BL)</label>
                <textarea
                  rows={4}
                  className="form-input"
                  placeholder="4 PACKAGES STC MACHINE PARTS MACHINE PARTS SUPERIMPOSED XYZ AXIS..."
                  value={form.cargoDescription}
                  onChange={(e) => set("cargoDescription", e.target.value)}
                  style={{ resize: "vertical", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={labelStyle}>Weight (KGS)</label>
                <input className="form-input" placeholder="e.g. 740.000" value={form.weightKgs} onChange={(e) => set("weightKgs", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Volume (CBM)</label>
                <input className="form-input" placeholder="e.g. 1.900" value={form.volumeCbm} onChange={(e) => set("volumeCbm", e.target.value)} />
              </div>

              <div>
                <label style={labelStyle}>Gross Weight (BL)</label>
                <input className="form-input" placeholder="e.g. 3,490.000 KGS" value={form.grossWeight} onChange={(e) => set("grossWeight", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Net Weight (BL)</label>
                <input className="form-input" placeholder="e.g. 1,560.000 KGS" value={form.netWeight} onChange={(e) => set("netWeight", e.target.value)} />
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-CURRENCY BILLING & MULTI-INVOICE */}
          {activeTab === "billing" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "rgba(0, 112, 243, 0.05)", border: "1px solid rgba(0, 112, 243, 0.2)", borderRadius: "10px", padding: "16px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0070f3", margin: "0 0 12px 0", textTransform: "uppercase" }}>
                  Active Shipment Multi-Currency Billing (USD &rarr; INR Auto Conversion)
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "14px", alignItems: "center" }}>
                  <div>
                    <label style={labelStyle}>Billing Rate (USD $)</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      placeholder="e.g. 510"
                      value={form.saleUsd || ""}
                      onChange={(e) => set("saleUsd", Number(e.target.value) || 0)}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Live Exchange Rate (₹ / $)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={form.exchangeRate}
                      onChange={(e) => set("exchangeRate", Number(e.target.value) || 87.5)}
                    />
                  </div>

                  <div style={{ background: "var(--card-bg)", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>
                      Auto-Converted INR Total (₹)
                    </span>
                    <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#10b981" }}>
                      ₹{Number(calculatedInr).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Invoice Status for Shrikar & Finance */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Invoice Status (Shrikar Tracking)</label>
                  <select
                    className="form-input"
                    value={form.invoiceStatus}
                    onChange={(e) => set("invoiceStatus", e.target.value)}
                    style={{ fontWeight: 700, color: form.invoiceStatus === "INVOICE_GENERATED" ? "#10b981" : "#f59e0b" }}
                  >
                    <option value="INVOICE_NOT_GENERATED">⏳ Pending Invoice (Not Raised)</option>
                    <option value="INVOICE_GENERATED">✓ Invoice Generated (Raised)</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>Operational Scope</label>
                  <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    {SCOPES.map((s) => (
                      <label key={s} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                        <input
                          type="checkbox"
                          checked={form.scope.includes(s)}
                          onChange={() => toggleScope(s)}
                          style={{ accentColor: "#0070f3" }}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {activeTab !== "parties" && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: any[] = ["parties", "shipment", "cargo", "billing"];
                    const curIdx = tabs.indexOf(activeTab);
                    if (curIdx > 0) setActiveTab(tabs[curIdx - 1]);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  &larr; Back
                </button>
              )}
              {activeTab !== "billing" && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: any[] = ["parties", "shipment", "cargo", "billing"];
                    const curIdx = tabs.indexOf(activeTab);
                    if (curIdx < tabs.length - 1) setActiveTab(tabs[curIdx + 1]);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Next &rarr;
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button id="cancel-job-modal" type="button" onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button id="submit-job-modal" type="submit" className="btn btn-primary" disabled={loading} style={{ fontWeight: 700 }}>
                {loading ? "Saving Record..." : "Create Job Record"}
              </button>
            </div>
          </div>
        </form>
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
