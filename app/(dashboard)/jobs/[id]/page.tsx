"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatDateTime, getStatusColor, getStatusLabel } from "@/lib/utils";
import { generateCANPdf } from "@/lib/canPdf";
import { generateBLPdf } from "@/lib/blPdf";
import JobInvoiceModal from "@/components/jobs/JobInvoiceModal";

const JOB_STATUS_ORDER = [
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

export default function JobDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"can" | "bl" | "billing" | "history" | "remarks">("can");
  const [masters, setMasters] = useState<any>({});
  const [newRemark, setNewRemark] = useState("");
  const [addingRemark, setAddingRemark] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<any>("");
  const [saving, setSaving] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Live currency conversion calculation state
  const [liveSaleUsd, setLiveSaleUsd] = useState<string>("0");
  const [liveExRate, setLiveExRate] = useState<string>("87.50");
  const [financeDirty, setFinanceDirty] = useState<boolean>(false);

  const loadJob = async () => {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) { router.push("/jobs"); return; }
    const data = await res.json();
    setJob(data);

    const usdVal = data.finance?.saleUsd ? String(data.finance.saleUsd) : "0";
    let rateVal = data.finance?.exchangeRate;
    if (!rateVal || rateVal < 20) {
      rateVal = rateVal && rateVal > 0 && rateVal < 10 ? Number((rateVal * 10).toFixed(2)) : 87.5;
    }
    setLiveSaleUsd(usdVal);
    setLiveExRate(String(rateVal));
    setFinanceDirty(false);
    setLoading(false);
  };

  useEffect(() => { loadJob(); }, [id]);
  useEffect(() => {
    fetch("/api/masters").then((r) => r.json()).then(setMasters).catch(() => {});
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStatus: newStatus }),
    });
    setSaving(false);
    loadJob();
  };

  const handleToggleAttention = async () => {
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attentionFlag: !job.attentionFlag }),
    });
    loadJob();
  };

  const handleInlineEdit = async (field: string, value: any) => {
    setSaving(true);
    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSaving(false);
    setEditingField(null);
    loadJob();
  };

  const handleFinanceSave = async (customUsd?: number, customExRate?: number) => {
    setSaving(true);
    const usdVal = customUsd !== undefined ? customUsd : parseFloat(liveSaleUsd) || 0;
    const exRateVal = customExRate !== undefined ? customExRate : parseFloat(liveExRate) || 87.5;
    const finalInr = usdVal * exRateVal;

    await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleUsd: usdVal,
        exchangeRate: exRateVal,
        sale: finalInr,
      }),
    });
    setSaving(false);
    setFinanceDirty(false);
    loadJob();
  };

  const [remarkError, setRemarkError] = useState("");

  const handleAddRemark = async () => {
    if (!newRemark.trim()) return;
    setAddingRemark(true);
    setRemarkError("");
    try {
      const res = await fetch(`/api/jobs/${id}/remarks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newRemark.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewRemark("");
        loadJob();
      } else {
        setRemarkError(data.error || "Failed to add remark");
      }
    } catch (err: any) {
      setRemarkError(err.message || "Failed to add remark");
    } finally {
      setAddingRemark(false);
    }
  };

  const handleDownloadCAN = () => {
    if (!job) return;
    generateCANPdf({
      jobNo: job.jobId,
      igmNo: job.igmNo,
      igmDate: job.igmDate,
      mblNo: job.mblNo,
      mblDate: job.mblDate,
      hblNo: job.hblNo,
      hblDate: job.hblDate,
      forwarderHblNo: job.forwarderHblNo,
      carrierName: job.carrierName || job.liner?.name,
      cfsName: job.cfsName,
      vesselVoyage: job.vesselVoyage,
      vesselName: job.vesselName,
      voyageNo: job.voyageNo,
      etd: job.etd,
      eta: job.eta,
      origin: job.origin || job.pol,
      pol: job.pol,
      pod: job.pod,
      finalDestination: job.finalDestination || job.pod,
      incoTerm: job.incoTerm,
      itemNo: job.itemNo,
      subItemNo: job.subItemNo,
      shipmentTerms: job.shipmentTerms,
      consignee: job.consignee || job.partyName,
      notifyParty: job.notifyParty,
      shipper: job.shipper,
      marksNumbers: job.marksNumbers,
      cargoDescription: job.cargoDescription || job.commodity,
      containerNo: job.containerNo,
      sealNo: job.sealNo,
      packageType: job.packageType || "4 PACKAGE(S)",
      weightKgs: job.weightKgs,
      volumeCbm: job.volumeCbm || job.volume,
      preparedBy: job.responsible?.name || "SVIL Operations",
      refDate: new Date(),
    });
  };

  const handleDownloadBL = () => {
    if (!job) return;
    generateBLPdf({
      blNumber: job.hblNo || job.jobId,
      referenceNo: job.legacyJobId || `REF-${job.jobId}`,
      shipper: job.shipper || job.partyName,
      consignee: job.consignee || job.partyName,
      notifyParty: job.notifyParty,
      placeOfAcceptance: job.placeOfAcceptance || job.pol,
      portOfLoading: job.pol,
      vesselVoyage: job.vesselVoyage || "EVER LIVING / 78",
      portOfDischarge: job.pod,
      placeOfDelivery: job.placeOfDelivery || job.pod,
      containerNo: job.containerNo || "NLLU4145370",
      containerType: job.containerType || "40 HC",
      sealNo: job.sealNo || "56129",
      marksNumbers: job.marksNumbers,
      cargoDescription: job.cargoDescription || job.commodity || "AUTOMATIC MACHINERY PARTS & ACCESSORIES",
      grossWeight: job.grossWeight || (job.weightKgs ? `${job.weightKgs} KGS` : "3,490.000 KGS"),
      netWeight: job.netWeight || "1,560.000 KGS",
      measurement: job.volumeCbm || job.volume,
      packagesCount: job.packageType || "5",
      freightAmount: "FREIGHT COLLECT",
      freightPayableAt: job.freightPayableAt || "DESTINATION",
      deliveryAgent: job.deliveryAgent,
      dateOfIssue: new Date(),
      shippedOnBoardDate: job.shippedOnBoardDate || job.etd || new Date(),
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0070f3" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!job) return null;

  const currentStatusIndex = JOB_STATUS_ORDER.indexOf(job.currentStatus);
  const isInvoiceGenerated = job.invoiceStatus === "INVOICE_GENERATED" || job.finance?.invoiceStatus === "INVOICED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1200px" }}>
      {/* Breadcrumb & Action Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          <Link href="/jobs" style={{ color: "#0070f3", textDecoration: "none", fontWeight: 600 }}>Jobs &amp; Shipments</Link>
          <span>/</span>
          <span>{job.jobId}</span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={handleDownloadCAN} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
            </svg>
            Download CAN (PDF)
          </button>
          <button onClick={handleDownloadBL} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600, background: "rgba(245, 158, 11, 0.1)", color: "#d97706", borderColor: "rgba(245, 158, 11, 0.3)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Download Seaway BL (PDF)
          </button>
          <button onClick={() => setShowInvoiceModal(true)} className="btn btn-primary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", borderColor: "#10b981", fontWeight: 700 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/>
            </svg>
            Invoice &amp; Tally Hub
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="glass-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0070f3", letterSpacing: "-0.02em" }}>{job.jobId}</h1>
              {job.legacyJobId && (
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", background: "var(--card-hover-bg)", borderRadius: "4px", color: "var(--text-muted)" }}>
                  Legacy: {job.legacyJobId}
                </span>
              )}
              {isInvoiceGenerated ? (
                <span style={{ fontSize: "0.75rem", padding: "3px 10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", color: "#10b981", fontWeight: 700 }}>
                  ✓ INVOICE RAISED {job.invoiceNo ? `(${job.invoiceNo})` : ""}
                </span>
              ) : (
                <span style={{ fontSize: "0.75rem", padding: "3px 10px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "6px", color: "#f59e0b", fontWeight: 700 }}>
                  ⏳ PENDING INVOICE
                </span>
              )}
            </div>
            <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>{job.partyName}</p>
            {job.inquiry && (
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Converted from Inquiry #<Link href={`/inquiries`} style={{ color: "#0070f3", textDecoration: "none" }}>{job.inquiry.inquiryNo}</Link>
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              id="btn-attention-toggle"
              onClick={handleToggleAttention}
              className="btn btn-sm"
              style={{
                background: job.attentionFlag ? "rgba(245, 158, 11, 0.15)" : "var(--card-bg)",
                color: job.attentionFlag ? "#f59e0b" : "var(--text-muted)",
                border: `1px solid ${job.attentionFlag ? "rgba(245, 158, 11, 0.4)" : "var(--border-color)"}`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {job.attentionFlag ? "Clear Attention Flag" : "Flag Attention"}
            </button>
          </div>
        </div>

        {/* Key Info Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "20px" }}>
          <InfoItem label="Route" value={`${job.pol} → ${job.pod}`} />
          <InfoItem label="Container Type" value={job.containerType ?? "—"} />
          <InfoItem label="Carrier / Liner" value={job.carrierName || job.liner?.name || "—"} />
          <InfoItem label="Vessel / Voyage" value={job.vesselVoyage ?? "—"} />
          <InfoItem label="ETD" value={formatDate(job.etd)} />
          <InfoItem label="ETA" value={formatDate(job.eta)} highlight={job.eta && new Date(job.eta) < new Date() && job.currentStatus !== "DELIVERED"} />
          <InfoItem label="HBL No" value={job.hblNo ?? "—"} mono />
          <InfoItem label="MBL No" value={job.mblNo ?? "—"} mono />
          <InfoItem label="IGM No" value={job.igmNo ?? "—"} mono />
        </div>

        {/* Status Progress Bar */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px" }}>
          <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px", display: "block" }}>
            Current Shipment Status
          </label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {JOB_STATUS_ORDER.map((s, idx) => {
              const isPast = idx < currentStatusIndex;
              const isCurrent = idx === currentStatusIndex;
              return (
                <button
                  key={s}
                  id={`status-${s.toLowerCase()}`}
                  onClick={() => handleStatusChange(s)}
                  disabled={saving}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "0.725rem",
                    fontWeight: isCurrent ? 700 : 500,
                    border: isCurrent ? "2px solid #0070f3" : "1px solid var(--border-color)",
                    background: isCurrent ? "rgba(0, 112, 243, 0.15)" : isPast ? "rgba(16, 185, 129, 0.1)" : "var(--card-bg)",
                    color: isCurrent ? "#0070f3" : isPast ? "#10b981" : "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {isPast && "✓ "}{getStatusLabel(s)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border-color)", paddingBottom: "0" }}>
        {[
          { id: "can", label: "CAN Copy Details" },
          { id: "bl", label: "Bill of Lading" },
          { id: "billing", label: "Multi-Currency Billing & Finance" },
          { id: "history", label: "Status History" },
          { id: "remarks", label: "Remarks" },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "10px 16px",
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
            {tab.id === "remarks" && job.remarksList?.length > 0 && (
              <span style={{ marginLeft: "6px", background: "#0070f3", color: "white", borderRadius: "9999px", fontSize: "0.65rem", padding: "1px 6px" }}>
                {job.remarksList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────
         TAB 1: CAN COPY DETAILS
         ───────────────────────────────────────────── */}
      {activeTab === "can" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Parties Grid */}
          <div className="glass-card">
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
              Parties on CAN Record
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
              <EditableField
                label="Consignee (Name & Full Address)"
                value={job.consignee}
                field="consignee"
                isTextarea
                editingField={editingField}
                fieldValue={fieldValue}
                onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }}
                onSave={handleInlineEdit}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
              />
              <EditableField
                label="Notify Party"
                value={job.notifyParty}
                field="notifyParty"
                isTextarea
                editingField={editingField}
                fieldValue={fieldValue}
                onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }}
                onSave={handleInlineEdit}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
              />
              <EditableField
                label="Shipper"
                value={job.shipper}
                field="shipper"
                isTextarea
                editingField={editingField}
                fieldValue={fieldValue}
                onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }}
                onSave={handleInlineEdit}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
              />
            </div>
          </div>

          {/* 16 CAN Fields Grid */}
          <div className="glass-card">
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
              Cargo Arrival Notice (16 Fields)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px" }}>
              <EditableField label="IGM No" value={job.igmNo} field="igmNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="IGM Date" value={job.igmDate?.slice?.(0, 10)} field="igmDate" type="date" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ? v.slice(0, 10) : ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="MBL No" value={job.mblNo} field="mblNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

              <EditableField label="HBL No" value={job.hblNo} field="hblNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Forwarder HBL No" value={job.forwarderHblNo} field="forwarderHblNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Carrier Name" value={job.carrierName} field="carrierName" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

              <EditableField label="CFS Name" value={job.cfsName} field="cfsName" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Vessel / Voyage" value={job.vesselVoyage} field="vesselVoyage" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="ETD (Departure Date)" value={job.etd?.slice?.(0, 10)} field="etd" type="date" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ? v.slice(0, 10) : ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="ETA (Arrival Date)" value={job.eta?.slice?.(0, 10)} field="eta" type="date" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ? v.slice(0, 10) : ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

              <EditableField label="Origin" value={job.origin} field="origin" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="POL (Port of Loading)" value={job.pol} field="pol" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="POD (Port of Discharge)" value={job.pod} field="pod" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

              <EditableField label="Final Destination" value={job.finalDestination} field="finalDestination" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Inco Term" value={job.incoTerm} field="incoTerm" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Shipment Terms" value={job.shipmentTerms} field="shipmentTerms" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

              <EditableField label="Item No" value={job.itemNo} field="itemNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Sub Item No" value={job.subItemNo} field="subItemNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
            </div>
          </div>

          {/* Cargo Details Grid */}
          <div className="glass-card">
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
              Cargo &amp; Container Specifications
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px" }}>
              <EditableField label="Container No" value={job.containerNo} field="containerNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Seal No" value={job.sealNo} field="sealNo" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Package Type" value={job.packageType} field="packageType" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

              <EditableField label="Marks & Numbers" value={job.marksNumbers} field="marksNumbers" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Weight (KGS)" value={job.weightKgs} field="weightKgs" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              <EditableField label="Volume (CBM)" value={job.volumeCbm} field="volumeCbm" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

              <div style={{ gridColumn: "1 / -1" }}>
                <EditableField label="Cargo Description" value={job.cargoDescription || job.commodity} field="cargoDescription" isTextarea editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 2: BILL OF LADING
         ───────────────────────────────────────────── */}
      {activeTab === "bl" && (
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", margin: 0, textTransform: "uppercase" }}>
              Seaway Bill of Lading Specific Fields
            </h3>
            <button onClick={handleDownloadBL} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              Download Seaway BL (PDF)
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "18px" }}>
            <EditableField label="Place of Acceptance" value={job.placeOfAcceptance} field="placeOfAcceptance" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
            <EditableField label="Place of Delivery" value={job.placeOfDelivery} field="placeOfDelivery" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
            <EditableField label="Freight Payable At" value={job.freightPayableAt} field="freightPayableAt" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

            <EditableField label="Gross Weight" value={job.grossWeight} field="grossWeight" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
            <EditableField label="Net Weight" value={job.netWeight} field="netWeight" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
            <EditableField label="Shipped on Board Date" value={job.shippedOnBoardDate?.slice?.(0, 10)} field="shippedOnBoardDate" type="date" editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ? v.slice(0, 10) : ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />

            <div style={{ gridColumn: "1 / -1" }}>
              <EditableField label="Delivery Agent (Name & Address)" value={job.deliveryAgent} field="deliveryAgent" isTextarea editingField={editingField} fieldValue={fieldValue} onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }} onSave={handleInlineEdit} onCancel={() => setEditingField(null)} onChange={setFieldValue} />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 3: MULTI-CURRENCY BILLING & FINANCE
         ───────────────────────────────────────────── */}
      {activeTab === "billing" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Multi-Currency Conversion Card */}
          <div className="glass-card" style={{ background: "rgba(0, 112, 243, 0.03)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0070f3", margin: 0, textTransform: "uppercase" }}>
                  Multi-Currency Billing Hub (USD &amp; INR Real-Time Conversion)
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  When USD amount is entered or edited, it automatically converts to INR in the converted amount column.
                </p>
              </div>
              <button onClick={() => setShowInvoiceModal(true)} className="btn btn-primary btn-sm" style={{ background: "#10b981", borderColor: "#10b981", fontWeight: 700 }}>
                Open Full Invoice &amp; Tally Hub
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: "16px", alignItems: "center", background: "var(--card-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
              <div>
                <label style={labelStyle}>Billing Rate (USD $)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  value={liveSaleUsd}
                  onChange={(e) => {
                    setLiveSaleUsd(e.target.value);
                    setFinanceDirty(true);
                  }}
                  onBlur={() => {
                    if (financeDirty) handleFinanceSave();
                  }}
                  placeholder="0.00"
                  style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0070f3" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>Exchange Rate (₹ / $)</label>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {["87.50", "87.00", "88.00"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setLiveExRate(preset);
                          setFinanceDirty(true);
                          handleFinanceSave(parseFloat(liveSaleUsd) || 0, parseFloat(preset));
                        }}
                        style={{
                          fontSize: "0.68rem",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          border: "1px solid var(--border-color)",
                          background: liveExRate === preset ? "rgba(0, 112, 243, 0.15)" : "var(--card-hover-bg)",
                          color: liveExRate === preset ? "#0070f3" : "var(--text-muted)",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  value={liveExRate}
                  onChange={(e) => {
                    setLiveExRate(e.target.value);
                    setFinanceDirty(true);
                  }}
                  onBlur={() => {
                    if (financeDirty) handleFinanceSave();
                  }}
                  style={{ fontSize: "1.1rem", fontWeight: 700 }}
                />
              </div>

              <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "12px 16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>
                    Auto-Converted Billing Amount (INR ₹)
                  </span>
                  <span style={{ fontSize: "1.4rem", fontWeight: 900, color: "#10b981" }}>
                    ₹{((parseFloat(liveSaleUsd) || 0) * (parseFloat(liveExRate) || 87.5)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {financeDirty && (
                  <button
                    type="button"
                    onClick={() => handleFinanceSave()}
                    disabled={saving}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: "0.75rem", padding: "6px 12px", fontWeight: 700 }}
                  >
                    {saving ? "Saving..." : "Save Rate"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Standard Finance Cards */}
          <div className="glass-card">
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "16px", textTransform: "uppercase" }}>
              Profitability &amp; Invoicing Status
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div style={{ padding: "14px", background: "var(--card-hover-bg)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>Buy (Cost of Service)</span>
                <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-main)", margin: "4px 0 0 0" }}>
                  ₹{Number(job.finance?.buy || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div style={{ padding: "14px", background: "var(--card-hover-bg)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>Sale (Revenue)</span>
                <p style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981", margin: "4px 0 0 0" }}>
                  ₹{Number(job.finance?.sale || (parseFloat(liveSaleUsd) || 0) * (parseFloat(liveExRate) || 87.5) || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div style={{ padding: "14px", background: "var(--card-hover-bg)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", textTransform: "uppercase" }}>Net Margin / Profit</span>
                <p style={{ fontSize: "1.2rem", fontWeight: 800, color: Number(job.finance?.margin) >= 0 ? "#10b981" : "#ef4444", margin: "4px 0 0 0" }}>
                  ₹{Number(job.finance?.margin || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <EditableField
                label="Invoice Number"
                value={job.invoiceNo || job.svilInvoiceNo}
                field="invoiceNo"
                editingField={editingField}
                fieldValue={fieldValue}
                onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }}
                onSave={handleInlineEdit}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
              />

              <div>
                <label style={labelStyle}>Invoice Status (Shrikar Tracking)</label>
                <select
                  className="form-input"
                  value={job.invoiceStatus || (job.finance?.invoiceStatus === "INVOICED" ? "INVOICE_GENERATED" : "INVOICE_NOT_GENERATED")}
                  onChange={(e) => handleInlineEdit("invoiceStatus", e.target.value)}
                  style={{
                    fontWeight: 700,
                    color: isInvoiceGenerated ? "#10b981" : "#f59e0b",
                  }}
                >
                  <option value="INVOICE_NOT_GENERATED">⏳ Pending Invoice (Not Raised)</option>
                  <option value="INVOICE_GENERATED">✓ Invoice Generated (Raised)</option>
                </select>
              </div>

              <EditableField
                label="Courier Tracking"
                value={job.finance?.courier}
                field="courier"
                editingField={editingField}
                fieldValue={fieldValue}
                onEdit={(f: string, v: any) => { setEditingField(f); setFieldValue(v ?? ""); }}
                onSave={(f: string, v: any) => handleInlineEdit(f, v)}
                onCancel={() => setEditingField(null)}
                onChange={setFieldValue}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 4: STATUS HISTORY
         ───────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="glass-card">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "16px" }}>Status History</h3>
          {job.statusLogs?.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No status changes recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {job.statusLogs?.map((log: any) => (
                <div key={log.id} style={{ display: "flex", gap: "12px", padding: "12px", background: "var(--card-hover-bg)", borderRadius: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0070f3", marginTop: "5px", minWidth: "8px" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-main)" }}>
                      {log.oldStatus && <><span style={{ color: "var(--text-muted)" }}>{getStatusLabel(log.oldStatus)}</span> → </>}
                      <span style={{ fontWeight: 700, color: "#0070f3" }}>{getStatusLabel(log.newStatus)}</span>
                    </div>
                    {log.note && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>{log.note}</p>}
                    <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "4px" }}>
                      {log.user?.name} · {formatDateTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 5: REMARKS
         ───────────────────────────────────────────── */}
      {activeTab === "remarks" && (
        <div className="glass-card">
          <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "16px" }}>Remarks</h3>

          {/* Add remark */}
          {remarkError && (
            <div style={{ padding: "8px 12px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.8rem", marginBottom: "12px" }}>
              {remarkError}
            </div>
          )}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <textarea
              id="new-remark-input"
              className="form-input"
              rows={2}
              placeholder="Add an operational note or billing remark..."
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              style={{ flex: 1, resize: "vertical" }}
            />
            <button
              id="btn-add-remark"
              onClick={handleAddRemark}
              disabled={addingRemark || !newRemark.trim()}
              className="btn btn-primary"
              style={{ alignSelf: "flex-end" }}
            >
              {addingRemark ? "Adding..." : "Add Remark"}
            </button>
          </div>

          {job.remarksList?.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No remarks recorded.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {job.remarksList?.map((remark: any) => (
                <div key={remark.id} style={{ padding: "14px", background: "var(--card-hover-bg)", borderRadius: "8px", borderLeft: "3px solid #0070f3" }}>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-main)", lineHeight: 1.5, margin: 0 }}>{remark.note}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "8px", margin: "8px 0 0 0" }}>
                    {remark.user?.name} · {formatDateTime(remark.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <JobInvoiceModal
          job={job}
          onClose={() => setShowInvoiceModal(false)}
          onSave={() => {
            setShowInvoiceModal(false);
            loadJob();
          }}
        />
      )}
    </div>
  );
}

function InfoItem({ label, value, mono, highlight }: { label: string; value: any; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: "0.7rem", color: "var(--text-subtle)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: "3px" }}>
        {label}
      </label>
      <p style={{ fontSize: "0.875rem", color: highlight ? "#ef4444" : "var(--text-main)", fontFamily: mono ? "monospace" : "inherit", fontWeight: highlight ? 700 : 500, margin: 0 }}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function EditableField({ label, value, field, type = "text", isTextarea, editingField, fieldValue, onEdit, onSave, onCancel, onChange }: any) {
  const isEditing = editingField === field;
  return (
    <div>
      <label style={{ fontSize: "0.725rem", color: "var(--text-subtle)", fontWeight: 600, marginBottom: "4px", display: "block", textTransform: "uppercase" }}>{label}</label>
      {isEditing ? (
        <div style={{ display: "flex", gap: "6px" }}>
          {isTextarea ? (
            <textarea
              className="form-input"
              rows={3}
              value={fieldValue}
              onChange={(e) => onChange(e.target.value)}
              style={{ flex: 1, resize: "vertical", fontSize: "0.85rem" }}
              autoFocus
            />
          ) : (
            <input
              id={`field-${field}`}
              type={type}
              className="form-input"
              value={fieldValue}
              onChange={(e) => onChange(e.target.value)}
              style={{ flex: 1 }}
              autoFocus
            />
          )}
          <button className="btn btn-primary btn-sm" onClick={() => onSave(field, fieldValue)}>Save</button>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", background: "var(--card-hover-bg)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
          <p style={{ fontSize: "0.85rem", color: "var(--text-main)", margin: 0, whiteSpace: "pre-line", flex: 1 }}>{value || "—"}</p>
          <button id={`edit-${field}`} onClick={() => onEdit(field, value)} className="btn btn-ghost btn-sm" style={{ opacity: 0.6, padding: "2px 4px" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
        </div>
      )}
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
