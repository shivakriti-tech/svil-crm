"use client";

import { useEffect, useState, useMemo } from "react";

type Entity =
  | "customers"
  | "liners"
  | "airlines"
  | "transporters"
  | "chas"
  | "overseasAgents"
  | "ports"
  | "employees"
  | "users";

interface TabConfig {
  key: Entity;
  label: string;
  singular: string;
  columns: { key: string; label: string }[];
}

const TABS: TabConfig[] = [
  {
    key: "customers",
    label: "Companies (Customers)",
    singular: "Company",
    columns: [
      { key: "name", label: "Company Name" },
      { key: "employee", label: "Associated Employee" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "country", label: "Country" },
      { key: "address", label: "Address" },
    ],
  },
  {
    key: "liners",
    label: "Shipping Lines",
    singular: "Shipping Line",
    columns: [
      { key: "name", label: "Shipping Line Name" },
      { key: "code", label: "Liner Code" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "country", label: "Country" },
      { key: "address", label: "Address" },
    ],
  },
  {
    key: "airlines",
    label: "Air Lines",
    singular: "Air Line",
    columns: [
      { key: "name", label: "Air Line Name" },
      { key: "code", label: "IATA / Code" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "country", label: "Country" },
      { key: "address", label: "Address" },
    ],
  },
  {
    key: "transporters",
    label: "Transporters",
    singular: "Transporter",
    columns: [
      { key: "name", label: "Transporter Name" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "country", label: "Country" },
      { key: "address", label: "Address" },
    ],
  },
  {
    key: "chas",
    label: "CHAs (Customs Brokers)",
    singular: "CHA",
    columns: [
      { key: "name", label: "CHA Name" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "country", label: "Country" },
      { key: "address", label: "Address" },
    ],
  },
  {
    key: "overseasAgents",
    label: "Overseas Agents",
    singular: "Overseas Agent",
    columns: [
      { key: "name", label: "Agent Name" },
      { key: "country", label: "Country" },
      { key: "contactPerson", label: "Contact Person" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
    ],
  },
  {
    key: "ports",
    label: "Ports",
    singular: "Port",
    columns: [
      { key: "name", label: "Port Name" },
      { key: "country", label: "Country" },
      { key: "code", label: "Port Code" },
    ],
  },
  {
    key: "employees",
    label: "Employees",
    singular: "Employee",
    columns: [
      { key: "name", label: "Employee Name" },
      { key: "displayName", label: "Display Name" },
    ],
  },
  {
    key: "users",
    label: "Users & Logins",
    singular: "User",
    columns: [
      { key: "name", label: "User Name" },
      { key: "email", label: "Login Email" },
      { key: "role", label: "Access Role" },
    ],
  },
];

const ROLES = ["ADMIN", "SALES", "OPERATIONS", "ACCOUNTS", "MANAGEMENT"];

export default function MastersPage() {
  const [activeTab, setActiveTab] = useState<Entity>("customers");
  const [masters, setMasters] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [formError, setFormError] = useState("");
  const [alertBanner, setAlertBanner] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/masters");
      const data = await res.json();
      setMasters(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentTabConfig = useMemo(() => {
    return TABS.find((t) => t.key === activeTab) || TABS[0];
  }, [activeTab]);

  // Unique sorted employees list for the Associated Employee dropdown
  const uniqueEmployees = useMemo(() => {
    const list = masters.employees || [];
    return Array.from(new Map(list.map((e: any) => [e.name.trim().toLowerCase(), e])).values()).sort(
      (a: any, b: any) => a.name.localeCompare(b.name)
    );
  }, [masters.employees]);

  const items: any[] = useMemo(() => {
    const rawItems: any[] = masters[activeTab] ?? [];
    if (!search.trim()) return rawItems;
    const q = search.toLowerCase();
    return rawItems.filter((item: any) =>
      JSON.stringify(item).toLowerCase().includes(q)
    );
  }, [masters, activeTab, search]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.name.trim()) {
      setFormError("Name is required.");
      return;
    }

    const trimmedName = form.name.trim();
    const normalizedName = trimmedName.toLowerCase();

    // Client-side instant case-insensitive duplicate check
    const existingList: any[] = masters[activeTab] || [];
    const isDup = existingList.some(
      (item: any) =>
        item.name?.trim().toLowerCase() === normalizedName &&
        item.id !== editItem?.id
    );

    if (isDup) {
      const msg = `⚠️ Alert: A ${currentTabConfig.singular} with name "${trimmedName}" already exists! Duplicate entry is not allowed regardless of uppercase/lowercase formatting.`;
      setFormError(msg);
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const url = editItem
        ? `/api/masters/${activeTab}/${editItem.id}`
        : `/api/masters/${activeTab}`;
      const method = editItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save record.");
      } else {
        setShowForm(false);
        setEditItem(null);
        setForm({});
        setAlertBanner({
          type: "success",
          message: `${currentTabConfig.singular} "${trimmedName}" ${editItem ? "updated" : "added"} successfully!`,
        });
        setTimeout(() => setAlertBanner(null), 5000);
        load();
      }
    } catch (err: any) {
      setFormError(err.message || "Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${currentTabConfig.singular} "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/masters/${activeTab}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Cannot delete record.");
      } else {
        setAlertBanner({
          type: "warning",
          message: `${currentTabConfig.singular} "${name}" deleted.`,
        });
        setTimeout(() => setAlertBanner(null), 4000);
        load();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      ...item,
      employeeId: item.employeeId || item.employee?.id || "",
    });
    setFormError("");
    setShowForm(true);
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ country: "India" });
    setFormError("");
    setShowForm(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)" }}>Master Data Management</h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Maintain standard profiles for Companies, Shipping Lines, Air Lines, Transporters, CHAs, Agents & Ports
          </p>
        </div>
        <button id="btn-new-master" onClick={openNew} className="btn btn-primary btn-sm" style={{ background: "#0070f3" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/>
          </svg>
          Add New {currentTabConfig.singular}
        </button>
      </div>

      {/* Global Alert Banner */}
      {alertBanner && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 500,
            background:
              alertBanner.type === "success"
                ? "rgba(16, 185, 129, 0.15)"
                : alertBanner.type === "warning"
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(239, 68, 68, 0.15)",
            color:
              alertBanner.type === "success"
                ? "#10b981"
                : alertBanner.type === "warning"
                ? "#f59e0b"
                : "#ef4444",
            border: `1px solid ${
              alertBanner.type === "success"
                ? "rgba(16, 185, 129, 0.3)"
                : alertBanner.type === "warning"
                ? "rgba(245, 158, 11, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{alertBanner.message}</span>
          <button onClick={() => setAlertBanner(null)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border-color)", overflowX: "auto", paddingBottom: "2px" }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = masters[tab.key]?.length ?? 0;
          return (
            <button
              key={tab.key}
              id={`master-tab-${tab.key}`}
              onClick={() => { setActiveTab(tab.key); setSearch(""); setFormError(""); }}
              style={{
                padding: "10px 16px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                borderBottom: isActive ? "2px solid #0070f3" : "2px solid transparent",
                color: isActive ? "#0070f3" : "var(--text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
              <span
                style={{
                  marginLeft: "6px",
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  background: isActive ? "rgba(0, 112, 243, 0.15)" : "var(--card-hover-bg)",
                  color: isActive ? "#0070f3" : "var(--text-subtle)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Active Info Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <input
          id="master-search"
          type="search"
          placeholder={`Search in ${currentTabConfig.label}...`}
          className="form-input"
          style={{ maxWidth: "300px" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
          Showing {items.length} of {masters[activeTab]?.length ?? 0} {currentTabConfig.label}
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                {currentTabConfig.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th style={{ width: "90px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={currentTabConfig.columns.length + 1} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    Loading {currentTabConfig.label}...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={currentTabConfig.columns.length + 1} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No {currentTabConfig.label.toLowerCase()} found matching &quot;{search}&quot;
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id}>
                    {currentTabConfig.columns.map((col) => {
                      // Custom cell renderings
                      if (col.key === "employee") {
                        const empName = item.employee?.name || item.employee?.displayName || "—";
                        return (
                          <td key={col.key}>
                            {empName !== "—" ? (
                              <span
                                style={{
                                  background: "rgba(0, 112, 243, 0.12)",
                                  color: "#0070f3",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}
                              >
                                {empName}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-subtle)" }}>—</span>
                            )}
                          </td>
                        );
                      }

                      if (col.key === "role") {
                        return (
                          <td key={col.key}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                background: "rgba(0, 112, 243, 0.15)",
                                color: "#0070f3",
                              }}
                            >
                              {item[col.key]}
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={col.key} style={{ fontSize: "0.85rem", color: col.key === "name" ? "var(--text-main)" : "inherit", fontWeight: col.key === "name" ? 600 : 400 }}>
                          {item[col.key] ?? "—"}
                        </td>
                      );
                    })}

                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          id={`edit-${activeTab}-${item.id}`}
                          onClick={() => openEdit(item)}
                          className="btn btn-ghost btn-sm"
                          title={`Edit ${item.name}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          id={`delete-${activeTab}-${item.id}`}
                          onClick={() => handleDelete(item.id, item.name)}
                          className="btn btn-danger btn-sm"
                          title={`Delete ${item.name}`}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Form Modal for Adding / Editing Master Entities */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !saving) setShowForm(false); }}>
          <div className="modal-content" style={{ maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                {editItem ? "Edit" : "Add New"} {currentTabConfig.singular}
              </h3>
              <button onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm" disabled={saving}>✕</button>
            </div>

            {/* In-Modal Alert / Error Banner */}
            {formError && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.825rem",
                  marginBottom: "16px",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#ef4444",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  lineHeight: 1.4,
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Primary Name Field */}
              <div>
                <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                  {currentTabConfig.singular} Name *
                </label>
                <input
                  id="master-form-name"
                  type="text"
                  required
                  placeholder={`Enter ${currentTabConfig.singular.toLowerCase()} name`}
                  className="form-input"
                  value={form.name ?? ""}
                  onChange={(e) => {
                    setForm((f: any) => ({ ...f, name: e.target.value }));
                    if (formError) setFormError("");
                  }}
                  autoFocus
                />
              </div>

              {/* Customer Specific: Associated Employee */}
              {activeTab === "customers" && (
                <div>
                  <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                    Associated Employee / Account Manager
                  </label>
                  <select
                    id="master-form-employee"
                    className="form-input"
                    value={form.employeeId ?? ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, employeeId: e.target.value }))}
                  >
                    <option value="">— No Associated Employee Assigned —</option>
                    {uniqueEmployees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} {emp.displayName && emp.displayName !== emp.name ? `(${emp.displayName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Code Field for Shipping Lines, Airlines, Ports */}
              {(activeTab === "liners" || activeTab === "airlines" || activeTab === "ports") && (
                <div>
                  <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                    {activeTab === "ports" ? "Port Code" : activeTab === "airlines" ? "IATA / Airline Code" : "Shipping Line Code"}
                  </label>
                  <input
                    id="master-form-code"
                    type="text"
                    placeholder="e.g. MAEU, EK, INMUN"
                    className="form-input"
                    value={form.code ?? ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value }))}
                  />
                </div>
              )}

              {/* Standard Profile Fields: Contact Person & Phone */}
              {activeTab !== "ports" && activeTab !== "employees" && activeTab !== "users" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Contact Person
                    </label>
                    <input
                      id="master-form-contactPerson"
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      className="form-input"
                      value={form.contactPerson ?? ""}
                      onChange={(e) => setForm((f: any) => ({ ...f, contactPerson: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Phone / Mobile
                    </label>
                    <input
                      id="master-form-phone"
                      type="text"
                      placeholder="+91 98765 43210"
                      className="form-input"
                      value={form.phone ?? ""}
                      onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Standard Profile Fields: Email & Country */}
              {activeTab !== "employees" && activeTab !== "users" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Email Address
                    </label>
                    <input
                      id="master-form-email"
                      type="email"
                      placeholder="info@company.com"
                      className="form-input"
                      value={form.email ?? ""}
                      onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      Country
                    </label>
                    <input
                      id="master-form-country"
                      type="text"
                      placeholder="e.g. India, UAE, China"
                      className="form-input"
                      value={form.country ?? "India"}
                      onChange={(e) => setForm((f: any) => ({ ...f, country: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Standard Profile Field: Address */}
              {activeTab !== "ports" && activeTab !== "employees" && activeTab !== "users" && (
                <div>
                  <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                    Physical / Office Address
                  </label>
                  <textarea
                    id="master-form-address"
                    rows={2}
                    placeholder="Enter complete address, city, state..."
                    className="form-input"
                    value={form.address ?? ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))}
                  />
                </div>
              )}

              {/* Employee Specific: Display Name */}
              {activeTab === "employees" && (
                <div>
                  <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                    Display Name
                  </label>
                  <input
                    id="master-form-displayName"
                    type="text"
                    className="form-input"
                    value={form.displayName ?? ""}
                    onChange={(e) => setForm((f: any) => ({ ...f, displayName: e.target.value }))}
                  />
                </div>
              )}

              {/* User Specific: Email & Role */}
              {activeTab === "users" && (
                <>
                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      User Login Email *
                    </label>
                    <input
                      id="master-user-email"
                      type="email"
                      required
                      className="form-input"
                      value={form.email ?? ""}
                      onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>
                      User Access Role
                    </label>
                    <select
                      id="master-user-role"
                      className="form-input"
                      value={form.role ?? "SALES"}
                      onChange={(e) => setForm((f: any) => ({ ...f, role: e.target.value }))}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  {!editItem && (
                    <div>
                      <label style={{ fontSize: "0.775rem", fontWeight: 600, color: "var(--text-main)", display: "block", marginBottom: "5px" }}>Password</label>
                      <input
                        id="master-user-password"
                        type="password"
                        className="form-input"
                        value={form.password ?? ""}
                        onChange={(e) => setForm((f: any) => ({ ...f, password: e.target.value }))}
                        placeholder="Default is svil@2026"
                      />
                    </div>
                  )}
                </>
              )}

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--border-color)" }}>
                <button
                  type="button"
                  id="master-cancel"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="master-save"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ background: "#0070f3" }}
                >
                  {saving ? "Saving..." : editItem ? "Update Record" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
