"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatDate } from "@/lib/utils";
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
  "SURCHARGE",
  "CUSTOMS CLEARANCE",
  "COURIER CHARGES",
  "CONTAINER DETENTION",
  "BOND CHARGES",
  "SURVEY CHARGES",
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
  "Per TON",
  "At Actual",
  "Lump Sum",
];

const RATE_PRESETS = [
  { label: "USD 510", currency: "USD", amount: "510" },
  { label: "USD 20", currency: "USD", amount: "20" },
  { label: "USD 100", currency: "USD", amount: "100" },
  { label: "USD 250", currency: "USD", amount: "250" },
  { label: "INR 18,500", currency: "INR", amount: "18500" },
  { label: "INR 57,500", currency: "INR", amount: "57500" },
  { label: "INR 17,500", currency: "INR", amount: "17500" },
  { label: "INR 11,000", currency: "INR", amount: "11000" },
  { label: "INR 5,300", currency: "INR", amount: "5300" },
  { label: "INR 4,500", currency: "INR", amount: "4500" },
  { label: "INR 3,500", currency: "INR", amount: "3500" },
  { label: "INR 3,000", currency: "INR", amount: "3000" },
  { label: "INR 1,200", currency: "INR", amount: "1200" },
  { label: "INR 900", currency: "INR", amount: "900" },
  { label: "INR 185", currency: "INR", amount: "185" },
];

const CONTAINER_TYPES = [
  "40 FT",
  "20 FT",
  "40 HC",
  "20 GP",
  "40 GP",
  "40 FLAT RACK",
  "20 OPEN TOP",
  "40 OPEN TOP",
  "LCL",
  "AIR CARGO",
];

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<any>({});

  // Filters
  const [search, setSearch] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [filterFreightType, setFilterFreightType] = useState("all");
  const [page, setPage] = useState(1);

  // Form Modal (Add / Edit)
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Email Modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState<any>({
    quotation: null,
    to: "",
    cc: "",
    subject: "",
    customMessage: "",
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<any>(null);

  const handleOpenEmailModal = (q: any) => {
    const customerEmail = q.customer?.email || "";
    setEmailForm({
      quotation: q,
      to: customerEmail,
      cc: "",
      subject: `Freight Quotation: ${q.quotationNo} - Siddhi Vinayak International Logistics`,
      customMessage: `Dear ${q.companyName || "Valued Client"},\n\nPlease find attached our official freight quotation for your review.\n\nRouting: ${q.originPort || "—"} to ${q.destinationPort || "—"}\nContainer: ${q.containerType || "—"}\n\nFeel free to reach out if you have any questions.`,
    });
    setEmailStatus(null);
    setShowEmailModal(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailForm.to.trim() || !emailForm.quotation) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const pdfDataUri = generateQuotationPdf(emailForm.quotation, "datauristring");
      const res = await fetch(`/api/quotations/${emailForm.quotation.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailForm.to.trim(),
          cc: emailForm.cc.trim(),
          subject: emailForm.subject,
          customMessage: emailForm.customMessage,
          pdfBase64: pdfDataUri,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailStatus({ type: "success", msg: "Quotation email dispatched successfully!" });
        setTimeout(() => setShowEmailModal(false), 2000);
      } else {
        setEmailStatus({ type: "error", msg: data.error || "Failed to send email" });
      }
    } catch (err: any) {
      setEmailStatus({ type: "error", msg: err.message || "Failed to send email" });
    } finally {
      setSendingEmail(false);
    }
  };

  const defaultItems = [
    { chargeDescription: "Sea Freight", rateCurrency: "USD", rateAmount: "510", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "THC", rateCurrency: "INR", rateAmount: "18500", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "SEAL", rateCurrency: "INR", rateAmount: "900", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "BL CHARGES", rateCurrency: "INR", rateAmount: "5300", unit: "Per BL", remarks: "" },
    { chargeDescription: "MUC", rateCurrency: "INR", rateAmount: "185", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "TOLL", rateCurrency: "INR", rateAmount: "1200", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "AGENCY", rateCurrency: "INR", rateAmount: "4500", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "EXAMINATION", rateCurrency: "INR", rateAmount: "3000", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "VGM", rateCurrency: "USD", rateAmount: "20", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "WAREHOUSE CHARGES", rateCurrency: "INR", rateAmount: "17500", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "LOLO", rateCurrency: "INR", rateAmount: "3500", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "TRANSPORT", rateCurrency: "INR", rateAmount: "57500", unit: "Per CONTAINER", remarks: "" },
    { chargeDescription: "BAFAR CHARGES", rateCurrency: "INR", rateAmount: "11000", unit: "Per CONTAINER", remarks: "" },
  ];

  const [form, setForm] = useState<any>({
    companyName: "",
    customerId: "",
    freightType: "Sea Freight",
    date: new Date().toISOString().slice(0, 10),
    validUntilText: "6TH AUG",
    originPort: "MUNDRA",
    destinationPort: "COLOMBO",
    containerType: "40 FT",
    volumeWeight: "28 MT APX",
    commodity: "",
    routing: "MLO",
    vesselSchedule: "VESSEL 16TH AUG",
    transitTime: "4 DAYS",
    freeDays: "14 DAYS",
    spaceAvailability: "SUBJECT TO SPACE AVAILABILITY.",
    notes: "- Rates are subject to space availability and change without prior notice.\n- GST & Govt charges will be at actual as per gov norms.\nFor any queries or clarification, please feel free to contact us.",
    status: "DRAFT",
    items: defaultItems,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "50",
    });
    if (search) params.set("search", search);
    if (filterCompany) params.set("companyName", filterCompany);
    if (filterMonth && filterMonth !== "all") params.set("month", filterMonth);
    if (filterFromDate) params.set("fromDate", filterFromDate);
    if (filterToDate) params.set("toDate", filterToDate);
    if (filterFreightType && filterFreightType !== "all") params.set("freightType", filterFreightType);

    try {
      const res = await fetch(`/api/quotations?${params}`);
      const data = await res.json();
      setQuotations(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterCompany, filterMonth, filterFromDate, filterToDate, filterFreightType, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/masters").then((r) => r.json()).then(setMasters).catch(() => {});
  }, []);

  // Quick list of all companies from Customers Master
  const uniqueCompanies = useMemo(() => {
    const list = (masters.customers || []).map((c: any) => c.name);
    return Array.from(new Set(list)).sort() as string[];
  }, [masters.customers]);

  const handleOpenNew = () => {
    setEditItem(null);
    setForm({
      companyName: "",
      customerId: "",
      freightType: "Sea Freight",
      date: new Date().toISOString().slice(0, 10),
      validUntilText: "7 DAYS",
      originPort: "MUNDRA",
      destinationPort: "",
      containerType: "40 FT",
      volumeWeight: "",
      commodity: "",
      routing: "MLO",
      vesselSchedule: "SUBJECT TO CONFIRMATION",
      transitTime: "4 DAYS",
      freeDays: "14 DAYS",
      spaceAvailability: "SUBJECT TO SPACE AVAILABILITY.",
      notes: "- Rates are subject to space availability and change without prior notice.\n- GST & Govt charges will be at actual as per gov norms.\nFor any queries or clarification, please feel free to contact us.",
      status: "DRAFT",
      items: [
        { chargeDescription: "Sea Freight", rateCurrency: "USD", rateAmount: "510", unit: "Per CONTAINER", remarks: "" },
        { chargeDescription: "THC", rateCurrency: "INR", rateAmount: "18500", unit: "Per CONTAINER", remarks: "" },
        { chargeDescription: "SEAL", rateCurrency: "INR", rateAmount: "900", unit: "Per CONTAINER", remarks: "" },
        { chargeDescription: "BL CHARGES", rateCurrency: "INR", rateAmount: "5300", unit: "Per BL", remarks: "" },
      ],
    });
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEdit = (q: any) => {
    setEditItem(q);
    setForm({
      ...q,
      date: q.date ? new Date(q.date).toISOString().slice(0, 10) : "",
      items: q.items?.length
        ? q.items.map((it: any) => ({
            chargeDescription: it.chargeDescription,
            rateCurrency: it.rateCurrency || "USD",
            rateAmount: it.rateAmount,
            unit: it.unit || "Per CONTAINER",
            remarks: it.remarks || "",
          }))
        : defaultItems,
    });
    setFormError("");
    setShowModal(true);
  };

  const handleClone = (q: any) => {
    setEditItem(null);
    setForm({
      ...q,
      quotationNo: undefined,
      date: new Date().toISOString().slice(0, 10),
      items: q.items?.map((it: any) => ({
        chargeDescription: it.chargeDescription,
        rateCurrency: it.rateCurrency || "USD",
        rateAmount: it.rateAmount,
        unit: it.unit || "Per CONTAINER",
        remarks: it.remarks || "",
      })),
    });
    setFormError("");
    setShowModal(true);
  };

  const handleDelete = async (id: string, qNo: string) => {
    if (!confirm(`Are you sure you want to delete Quotation ${qNo}?`)) return;
    await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    load();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName?.trim()) {
      setFormError("Company Name is required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const url = editItem ? `/api/quotations/${editItem.id}` : `/api/quotations`;
      const method = editItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save quotation.");
      } else {
        setShowModal(false);
        load();
      }
    } catch (err: any) {
      setFormError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  // Charge Item row operations
  const handleAddItem = () => {
    setForm((f: any) => ({
      ...f,
      items: [
        ...f.items,
        { chargeDescription: "Sea Freight", rateCurrency: "USD", rateAmount: "", unit: "Per CONTAINER", remarks: "" },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setForm((f: any) => ({
      ...f,
      items: f.items.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setForm((f: any) => {
      const updated = [...f.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...f, items: updated };
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>Quotation Management</h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Generate, filter and download official Sea & Air Freight Quotations on SVIL Letterhead
          </p>
        </div>

        <button
          id="btn-new-quotation"
          onClick={handleOpenNew}
          className="btn btn-primary btn-sm"
          style={{ background: "#0070f3" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create New Quotation
        </button>
      </div>

      {/* ─────────────────────────────────────────────
         FILTER BAR: NAME & DATE & FREIGHT TYPE FILTERS
         ───────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderRadius: "14px",
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", alignItems: "flex-end" }}>
          {/* Customer / Company Name Filter */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "5px" }}>
              Filter by Company Name
            </label>
            <select
              id="filter-quotation-company"
              className="form-input"
              value={filterCompany}
              onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }}
            >
              <option value="">— All Companies / Clients —</option>
              {uniqueCompanies.map((comp) => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
          </div>

          {/* Quick Month Filter */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "5px" }}>
              Filter by Month
            </label>
            <select
              id="filter-quotation-month"
              className="form-input"
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setFilterFromDate("");
                setFilterToDate("");
                setPage(1);
              }}
            >
              <option value="all">All Dates / Months</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-06">June 2026</option>
              <option value="2026-05">May 2026</option>
              <option value="2026-04">April 2026</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "5px" }}>
              From Date
            </label>
            <input
              type="date"
              className="form-input"
              value={filterFromDate}
              onChange={(e) => { setFilterFromDate(e.target.value); setFilterMonth("all"); setPage(1); }}
            />
          </div>

          {/* To Date */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "5px" }}>
              To Date
            </label>
            <input
              type="date"
              className="form-input"
              value={filterToDate}
              onChange={(e) => { setFilterToDate(e.target.value); setFilterMonth("all"); setPage(1); }}
            />
          </div>

          {/* Search Box */}
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "5px" }}>
              Search
            </label>
            <input
              id="quotation-search"
              type="search"
              placeholder="Search Quotation No, Port..."
              className="form-input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Active Filter Badges */}
        {(filterCompany || filterMonth !== "all" || filterFromDate || filterToDate || search) && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", paddingTop: "6px", borderTop: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Filters:</span>
            {filterCompany && (
              <span className="chip chip-primary" style={{ fontSize: "0.725rem" }}>
                Company: {filterCompany}
              </span>
            )}
            {filterMonth !== "all" && (
              <span className="chip chip-gray" style={{ fontSize: "0.725rem" }}>
                Month: {filterMonth}
              </span>
            )}
            {filterFromDate && (
              <span className="chip chip-gray" style={{ fontSize: "0.725rem" }}>
                From: {filterFromDate}
              </span>
            )}
            {filterToDate && (
              <span className="chip chip-gray" style={{ fontSize: "0.725rem" }}>
                To: {filterToDate}
              </span>
            )}
            <button
              onClick={() => {
                setFilterCompany("");
                setFilterMonth("all");
                setFilterFromDate("");
                setFilterToDate("");
                setSearch("");
                setPage(1);
              }}
              style={{ background: "transparent", border: "none", color: "#0070f3", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
            >
              Clear All ✕
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────
         DATA TABLE
         ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quotation No</th>
                <th>Date</th>
                <th>Company (Client)</th>
                <th>Freight Type</th>
                <th>Route (POL → POD)</th>
                <th>Container Type</th>
                <th>Charges</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th style={{ width: "160px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading quotations...</td></tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No quotations found. Click &quot;Create New Quotation&quot; to generate one.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <span style={{ fontWeight: 800, color: "#0070f3", fontFamily: "monospace" }}>
                        {q.quotationNo}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{formatDate(q.date)}</td>
                    <td style={{ fontWeight: 600 }}>{q.companyName}</td>
                    <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{q.freightType}</td>
                    <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {q.originPort || "—"} → {q.destinationPort || "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{q.containerType || "—"}</td>
                    <td style={{ fontSize: "0.8rem" }}>
                      <span className="chip chip-gray" style={{ fontSize: "0.7rem" }}>
                        {q.items?.length ?? 0} Items
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "#f59e0b", fontWeight: 600 }}>
                      {q.validUntilText || (q.validUntil ? formatDate(q.validUntil) : "—")}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          background: q.status === "ACCEPTED" ? "rgba(16, 185, 129, 0.15)" : "rgba(0, 112, 243, 0.15)",
                          color: q.status === "ACCEPTED" ? "#10b981" : "#0070f3",
                        }}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {/* Download PDF */}
                        <button
                          onClick={() => generateQuotationPdf(q, "download")}
                          className="btn btn-secondary btn-sm"
                          title="Download Quotation PDF"
                          style={{ padding: "4px 8px" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>

                        {/* Print / Preview */}
                        <button
                          onClick={() => generateQuotationPdf(q, "print")}
                          className="btn btn-ghost btn-sm"
                          title="View / Print PDF"
                          style={{ padding: "4px 8px" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                            <rect x="6" y="14" width="12" height="8"></rect>
                          </svg>
                        </button>

                        {/* Email to Client */}
                        <button
                          onClick={() => handleOpenEmailModal(q)}
                          className="btn btn-ghost btn-sm"
                          title="Send Quotation to Client via Email"
                          style={{ padding: "4px 8px", color: "#0070f3" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                            <polyline points="22,6 12,13 2,6"></polyline>
                          </svg>
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => handleOpenEdit(q)}
                          className="btn btn-ghost btn-sm"
                          title="Edit Quotation"
                          style={{ padding: "4px 8px" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>

                        {/* Clone */}
                        <button
                          onClick={() => handleClone(q)}
                          className="btn btn-ghost btn-sm"
                          title="Clone Quotation"
                          style={{ padding: "4px 8px" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(q.id, q.quotationNo)}
                          className="btn btn-danger btn-sm"
                          title="Delete Quotation"
                          style={{ padding: "4px 8px" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
         QUOTATION BUILDER MODAL (ADD / EDIT)
         ───────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !saving) setShowModal(false); }}>
          <div className="modal-content" style={{ maxWidth: "880px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {editItem ? `Edit Quotation — ${editItem.quotationNo}` : "Create New Quotation"}
                </h3>
                <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Official SVIL Letterhead Quotation Generator
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm" disabled={saving}>✕</button>
            </div>

            {formError && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", fontSize: "0.825rem", marginBottom: "16px", background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* SECTION 1: HEADER & CLIENT INFO */}
              <div style={{ background: "var(--card-hover-bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0070f3" }}>1. Client & Quotation Info</h4>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "12px" }}>
                  {/* Company Name (Input with Auto-select from Master) */}
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Company Name (Client) *
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        id="quotation-form-company"
                        type="text"
                        required
                        placeholder="e.g. SBR PROBUILD PVT.LTD"
                        className="form-input"
                        value={form.companyName}
                        onChange={(e) => setForm((f: any) => ({ ...f, companyName: e.target.value }))}
                      />
                      <select
                        style={{ maxWidth: "140px", fontSize: "0.75rem" }}
                        className="form-input"
                        onChange={(e) => {
                          if (e.target.value) {
                            setForm((f: any) => ({ ...f, companyName: e.target.value }));
                          }
                        }}
                      >
                        <option value="">Masters</option>
                        {uniqueCompanies.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Freight Type */}
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Freight Type
                    </label>
                    <select
                      className="form-input"
                      value={form.freightType}
                      onChange={(e) => setForm((f: any) => ({ ...f, freightType: e.target.value }))}
                    >
                      <option value="Sea Freight">Sea Freight</option>
                      <option value="Air Freight">Air Freight</option>
                      <option value="Inland Transport">Inland Transport</option>
                      <option value="Customs Clearance">Customs Clearance</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Quotation Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.date}
                      onChange={(e) => setForm((f: any) => ({ ...f, date: e.target.value }))}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Validity Text (e.g. 6TH AUG, 7 DAYS)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 6TH AUG"
                      className="form-input"
                      value={form.validUntilText}
                      onChange={(e) => setForm((f: any) => ({ ...f, validUntilText: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Quotation Status
                    </label>
                    <select
                      className="form-input"
                      value={form.status}
                      onChange={(e) => setForm((f: any) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="SENT">SENT</option>
                      <option value="ACCEPTED">ACCEPTED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SHIPMENT DETAILS */}
              <div style={{ background: "var(--card-hover-bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0070f3" }}>2. Shipment Details</h4>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Origin Port (POL)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MUNDRA"
                      className="form-input"
                      value={form.originPort}
                      onChange={(e) => setForm((f: any) => ({ ...f, originPort: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Destination Port (POD)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. COLOMBO"
                      className="form-input"
                      value={form.destinationPort}
                      onChange={(e) => setForm((f: any) => ({ ...f, destinationPort: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Container Type
                    </label>
                    <select
                      className="form-input"
                      value={form.containerType}
                      onChange={(e) => setForm((f: any) => ({ ...f, containerType: e.target.value }))}
                    >
                      {CONTAINER_TYPES.map((ct) => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Estimated Volume & Weight
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 28 MT APX"
                      className="form-input"
                      value={form.volumeWeight}
                      onChange={(e) => setForm((f: any) => ({ ...f, volumeWeight: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* ─────────────────────────────────────────────
                 SECTION 3: CHARGES BREAKDOWN (4 COLUMNS)
                 1. CHARGE DESCRIPTION (Dropdown + Custom)
                 2. RATE (USD/INR) (Dropdown / Input)
                 3. REMARKS (Units Dropdown)
                 4. REMARKS / NOTES (Text Box 4th Column)
                 ───────────────────────────────────────────── */}
              <div style={{ background: "var(--card-hover-bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0070f3" }}>
                    3. Freight Charges (4 Columns Structure)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: "0.75rem" }}
                  >
                    + Add Charge Row
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {form.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1.1fr 1.2fr 1.3fr 32px",
                        gap: "8px",
                        alignItems: "center",
                        background: "var(--card-bg)",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                      }}
                    >
                      {/* COLUMN 1: CHARGE DESCRIPTION (Dropdown + Input) */}
                      <div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <input
                            type="text"
                            placeholder="Charge Name"
                            className="form-input"
                            style={{ fontSize: "0.8rem", padding: "6px 8px" }}
                            value={item.chargeDescription}
                            onChange={(e) => handleItemChange(idx, "chargeDescription", e.target.value)}
                            required
                          />
                          <select
                            style={{ maxWidth: "28px", padding: 0, fontSize: "0.75rem" }}
                            className="form-input"
                            title="Pick preset charge"
                            onChange={(e) => {
                              if (e.target.value) handleItemChange(idx, "chargeDescription", e.target.value);
                            }}
                          >
                            <option value="">▾</option>
                            {CHARGE_PRESETS.map((cp) => (
                              <option key={cp} value={cp}>{cp}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* COLUMN 2: RATE (USD/INR) (Currency + Dropdown / Amount) */}
                      <div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <select
                            style={{ width: "64px", fontSize: "0.75rem", padding: "6px 4px" }}
                            className="form-input"
                            value={item.rateCurrency || "USD"}
                            onChange={(e) => handleItemChange(idx, "rateCurrency", e.target.value)}
                          >
                            <option value="USD">USD</option>
                            <option value="INR">INR</option>
                            <option value="EUR">EUR</option>
                            <option value="AED">AED</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Amount"
                            className="form-input"
                            style={{ fontSize: "0.8rem", padding: "6px 8px" }}
                            value={item.rateAmount}
                            onChange={(e) => handleItemChange(idx, "rateAmount", e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      {/* COLUMN 3: REMARKS / UNITS (Dropdown: "Need dropdown in REMARKS - isko Units bolte haiiiiii") */}
                      <div>
                        <select
                          className="form-input"
                          style={{ fontSize: "0.8rem", padding: "6px 8px" }}
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                        >
                          {UNIT_PRESETS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>

                      {/* COLUMN 4: TEXT BOX FOR REMARKS ("Need Text box for Remarks - add 4th column") */}
                      <div>
                        <input
                          type="text"
                          placeholder="Optional remarks/notes..."
                          className="form-input"
                          style={{ fontSize: "0.8rem", padding: "6px 8px" }}
                          value={item.remarks ?? ""}
                          onChange={(e) => handleItemChange(idx, "remarks", e.target.value)}
                        />
                      </div>

                      {/* Delete Row */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          justifyContent: "center",
                        }}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 4: TRANSIT TIME & SCHEDULE */}
              <div style={{ background: "var(--card-hover-bg)", padding: "14px", borderRadius: "10px", border: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0070f3" }}>4. Transit Time & Schedule</h4>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Routing (e.g. MLO, Direct)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.routing}
                      onChange={(e) => setForm((f: any) => ({ ...f, routing: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Vessel / Schedule
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VESSEL 16TH AUG"
                      className="form-input"
                      value={form.vesselSchedule}
                      onChange={(e) => setForm((f: any) => ({ ...f, vesselSchedule: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Transit Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4 DAYS"
                      className="form-input"
                      value={form.transitTime}
                      onChange={(e) => setForm((f: any) => ({ ...f, transitTime: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Free Days
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 14 DAYS"
                      className="form-input"
                      value={form.freeDays}
                      onChange={(e) => setForm((f: any) => ({ ...f, freeDays: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                    Space Terms & Availability
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.spaceAvailability}
                    onChange={(e) => setForm((f: any) => ({ ...f, spaceAvailability: e.target.value }))}
                  />
                </div>
              </div>

              {/* SECTION 5: NOTES */}
              <div>
                <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                  Standard Terms & Notes
                </label>
                <textarea
                  rows={3}
                  className="form-input"
                  value={form.notes}
                  onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => generateQuotationPdf(form, "print")}
                  className="btn btn-secondary"
                  disabled={!form.companyName}
                >
                  Live Preview PDF
                </button>
                <button
                  type="submit"
                  id="btn-save-quotation"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: "#0070f3" }}
                >
                  {saving ? "Saving..." : editItem ? "Update Quotation" : "Save Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         EMAIL QUOTATION DISPATCH MODAL
         ───────────────────────────────────────────── */}
      {showEmailModal && emailForm.quotation && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !sendingEmail) setShowEmailModal(false); }}>
          <div className="modal-content" style={{ maxWidth: "560px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                  Email Quotation to Client
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#0070f3", margin: "2px 0 0 0", fontWeight: 700 }}>
                  Quotation Ref: {emailForm.quotation.quotationNo}
                </p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="btn btn-ghost btn-sm" disabled={sendingEmail}>✕</button>
            </div>

            {emailStatus && (
              <div style={{
                padding: "10px 14px",
                borderRadius: "6px",
                marginBottom: "14px",
                fontSize: "0.85rem",
                fontWeight: 600,
                background: emailStatus.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: emailStatus.type === "success" ? "#10b981" : "#ef4444",
                border: `1px solid ${emailStatus.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              }}>
                {emailStatus.msg}
              </div>
            )}

            <form onSubmit={handleSendEmail} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>
                  Recipient Email (Client) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@company.com"
                  className="form-input"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>
                  CC Email (Optional)
                </label>
                <input
                  type="text"
                  placeholder="accounts@company.com, sales@company.com"
                  className="form-input"
                  value={emailForm.cc}
                  onChange={(e) => setEmailForm({ ...emailForm, cc: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-subtle)", display: "block", marginBottom: "4px" }}>
                  Cover Note / Message
                </label>
                <textarea
                  rows={4}
                  className="form-input"
                  value={emailForm.customMessage}
                  onChange={(e) => setEmailForm({ ...emailForm, customMessage: e.target.value })}
                />
              </div>

              <div style={{ padding: "10px 14px", background: "var(--card-bg)", borderRadius: "6px", fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                <span>Official PDF on SVIL letterhead will be automatically generated and attached.</span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button type="button" onClick={() => setShowEmailModal(false)} className="btn btn-secondary btn-sm" disabled={sendingEmail}>
                  Cancel
                </button>
                <button type="submit" disabled={sendingEmail} className="btn btn-primary btn-sm" style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
                  {sendingEmail ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      Sending Email...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                      Dispatch Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
