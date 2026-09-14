"use client";

import { useState } from "react";

export default function ConvertToJobModal({
  inquiry,
  onClose,
  onSuccess,
}: {
  inquiry: any;
  onClose: () => void;
  onSuccess: (job: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 3 Mandatory Fields: Consignee, Notify Party, Shipper
  const [consignee, setConsignee] = useState(
    inquiry?.customer?.name ? `${inquiry.customer.name}\n${inquiry.customer.address || ""}`.trim() : ""
  );
  const [notifyParty, setNotifyParty] = useState(
    "SIDDHI VINAYAK INTERNATIONAL LOGISTICS\n317, 3RD FLOOR, SHIVALIK SQUARE, VEMALI, VADODARA - 390024"
  );
  const [shipper, setShipper] = useState(
    inquiry?.customer?.name || ""
  );

  // Optional initial shipment details
  const [pol, setPol] = useState(inquiry?.pol || "MUNDRA");
  const [pod, setPod] = useState(inquiry?.pod || "");
  const [containerType, setContainerType] = useState(inquiry?.containerVolume || "40 HC");
  const [commodity, setCommodity] = useState(inquiry?.commodity || "");
  const [carrierName, setCarrierName] = useState(inquiry?.shippingLine?.name || "");
  const [hblNo, setHblNo] = useState("");
  const [mblNo, setMblNo] = useState("");
  const [igmNo, setIgmNo] = useState("");
  const [vesselVoyage, setVesselVoyage] = useState("");

  // Multi-currency billing
  const [saleUsd, setSaleUsd] = useState(
    inquiry?.quotedRate && !inquiry.quotedRate.includes("INR")
      ? inquiry.quotedRate.replace(/[^0-9.]/g, "")
      : ""
  );
  const [exchangeRate, setExchangeRate] = useState("87.5");

  const calculatedInr = saleUsd ? (Number(saleUsd) * Number(exchangeRate || 87.5)).toFixed(2) : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consignee.trim()) {
      setError("Consignee is mandatory.");
      return;
    }
    if (!notifyParty.trim()) {
      setError("Notify Party is mandatory.");
      return;
    }
    if (!shipper.trim()) {
      setError("Shipper is mandatory.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/inquiries/${inquiry.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consignee: consignee.trim(),
          notifyParty: notifyParty.trim(),
          shipper: shipper.trim(),
          pol,
          pod,
          containerType,
          commodity,
          carrierName,
          hblNo,
          mblNo,
          igmNo,
          vesselVoyage,
          saleUsd: Number(saleUsd) || 0,
          exchangeRate: Number(exchangeRate) || 87.5,
          saleInr: Number(calculatedInr) || 0,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        onSuccess(data.job);
        onClose();
      } else {
        setError(data.error || "Failed to convert inquiry to job");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "Network error converting inquiry");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: "780px", maxHeight: "90vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", borderBottom: "1px solid var(--border-color)", paddingBottom: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700 }}>
                CONVERT TO LIVE JOB
              </span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
                Inquiry #{inquiry?.inquiryNo} &rarr; Shipment
              </h2>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Please enter the 3 mandatory parties (Consignee, Notify Party, Shipper) for CAN & Bill of Lading generation.
            </p>
          </div>
          <button id="modal-close-convert" onClick={onClose} className="btn btn-ghost btn-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Inquiry Summary Chip Card */}
        <div style={{ background: "var(--card-hover-bg)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "12px 16px", marginBottom: "18px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px", fontSize: "0.8rem" }}>
          <div>
            <span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>Customer</span>
            <strong style={{ color: "var(--text-main)" }}>{inquiry?.customer?.name}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>Route</span>
            <strong>{inquiry?.pol} &rarr; {inquiry?.pod}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>Type & Container</span>
            <span>{inquiry?.shipmentType} ({inquiry?.containerVolume || "40 HC"})</span>
          </div>
          <div>
            <span style={{ color: "var(--text-subtle)", display: "block", fontSize: "0.7rem", textTransform: "uppercase" }}>Quoted Rate</span>
            <strong style={{ color: "#10b981" }}>{inquiry?.quotedRate || "—"}</strong>
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: MANDATORY PARTIES */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }}></span>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Mandatory CAN & BL Parties
              </h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              {/* 1. Consignee */}
              <div>
                <label style={mandatoryLabelStyle}>
                  Consignee <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  id="convert-consignee"
                  className="form-input"
                  rows={4}
                  placeholder="Company Name, Address, City, Pincode"
                  value={consignee}
                  onChange={(e) => setConsignee(e.target.value)}
                  required
                  style={{ resize: "vertical", fontSize: "0.8rem", lineHeight: 1.3 }}
                />
                <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>Appears on CAN & BL</span>
              </div>

              {/* 2. Notify Party */}
              <div>
                <label style={mandatoryLabelStyle}>
                  Notify Party <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  id="convert-notify-party"
                  className="form-input"
                  rows={4}
                  placeholder="Notify Party Name & Full Address"
                  value={notifyParty}
                  onChange={(e) => setNotifyParty(e.target.value)}
                  required
                  style={{ resize: "vertical", fontSize: "0.8rem", lineHeight: 1.3 }}
                />
                <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>Usually SVIL or Buyer</span>
              </div>

              {/* 3. Shipper */}
              <div>
                <label style={mandatoryLabelStyle}>
                  Shipper <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <textarea
                  id="convert-shipper"
                  className="form-input"
                  rows={4}
                  placeholder="Exporter / Supplier Name & Address"
                  value={shipper}
                  onChange={(e) => setShipper(e.target.value)}
                  required
                  style={{ resize: "vertical", fontSize: "0.8rem", lineHeight: 1.3 }}
                />
                <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>Shipper / Consignor</span>
              </div>
            </div>
          </div>

          {/* Section 2: OPTIONAL SHIPMENT & BILLING DETAILS */}
          <div style={{ marginBottom: "20px", borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase" }}>
              Shipment & Initial Billing (USD &rarr; INR)
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Port of Loading (POL)</label>
                <input className="form-input" value={pol} onChange={(e) => setPol(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Port of Discharge (POD)</label>
                <input className="form-input" value={pod} onChange={(e) => setPod(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Container / Volume</label>
                <input className="form-input" value={containerType} onChange={(e) => setContainerType(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Carrier / Shipping Line</label>
                <input className="form-input" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginTop: "12px" }}>
              <div>
                <label style={labelStyle}>HBL No</label>
                <input className="form-input" placeholder="e.g. AFXML26007738" value={hblNo} onChange={(e) => setHblNo(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>MBL No</label>
                <input className="form-input" placeholder="e.g. 030G530663" value={mblNo} onChange={(e) => setMblNo(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>IGM No</label>
                <input className="form-input" placeholder="e.g. 1200297" value={igmNo} onChange={(e) => setIgmNo(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Vessel / Voyage</label>
                <input className="form-input" placeholder="e.g. WAN HAI 507 / 244" value={vesselVoyage} onChange={(e) => setVesselVoyage(e.target.value)} />
              </div>
            </div>

            {/* USD -> INR Auto Conversion Box */}
            <div style={{ background: "rgba(0, 112, 243, 0.05)", border: "1px solid rgba(0, 112, 243, 0.2)", borderRadius: "10px", padding: "14px", marginTop: "14px", display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "12px", alignItems: "center" }}>
              <div>
                <label style={labelStyle}>Rate in USD ($)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 510"
                  value={saleUsd}
                  onChange={(e) => setSaleUsd(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Exchange Rate (₹ / $)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </div>
              <div style={{ padding: "8px 12px", background: "var(--card-bg)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>
                  Converted Amount (INR)
                </span>
                <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#10b981" }}>
                  ₹{Number(calculatedInr).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "18px" }}>
            <button id="convert-cancel-btn" type="button" onClick={onClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button
              id="convert-submit-btn"
              type="submit"
              className="btn btn-primary"
              disabled={loading || !consignee.trim() || !notifyParty.trim() || !shipper.trim()}
              style={{
                background: "#10b981",
                borderColor: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
              }}
            >
              {loading ? (
                "Creating Job..."
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  Convert & Create Job
                </>
              )}
            </button>
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

const mandatoryLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "var(--text-main)",
  marginBottom: "5px",
};
