"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import {
  MODULES,
  ModuleKey,
  ActionType,
  PermissionsMap,
  getDefaultPermissions,
  ROLE_PRESETS,
  countAccessibleModules,
} from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

const ROLES = [
  { value: "ADMIN", label: "Admin (Full Control)" },
  { value: "MANAGER", label: "Manager" },
  { value: "SALES", label: "Sales Team (Employee)" },
  { value: "FINANCE", label: "Finance & Accounts" },
  { value: "OPERATIONS", label: "Operations & Logistics" },
];

export default function UsersPage() {
  const { can, isAdmin, isManager } = usePermissions();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "SALES",
    status: "ACTIVE",
  });

  const [permissionsMatrix, setPermissionsMatrix] = useState<PermissionsMap>(() =>
    getDefaultPermissions("SALES")
  );

  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || []);
      } else {
        const err = await res.json();
        setFormError(err.error || "Failed to load users");
      }
    } catch (e) {
      console.error("Failed to load users", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "SALES",
      status: "ACTIVE",
    });
    setPermissionsMatrix(getDefaultPermissions("SALES"));
    setFormError("");
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "", // Leave blank to keep existing password
      role: user.role || "SALES",
      status: user.status || "ACTIVE",
    });
    setPermissionsMatrix(user.permissionsMap || getDefaultPermissions(user.role));
    setFormError("");
    setShowModal(true);
  };

  // Apply Role Preset to matrix
  const applyRolePreset = (roleName: string) => {
    const preset = ROLE_PRESETS[roleName.toUpperCase()] || getDefaultPermissions(roleName);
    setPermissionsMatrix(JSON.parse(JSON.stringify(preset)));
    setFormData((f) => ({ ...f, role: roleName.toUpperCase() }));
  };

  // Toggle single permission cell
  const handleToggleCell = (moduleKey: ModuleKey, action: ActionType) => {
    setPermissionsMatrix((prev) => {
      const copy = { ...prev };
      const current = copy[moduleKey] || { view: false, add: false, edit: false, delete: false };
      const nextVal = !current[action];

      copy[moduleKey] = {
        ...current,
        [action]: nextVal,
      };

      // If granting add/edit/delete, ensure view is also true
      if (nextVal && action !== "view") {
        copy[moduleKey].view = true;
      }
      // If revoking view, revoke add/edit/delete too
      if (!nextVal && action === "view") {
        copy[moduleKey].add = false;
        copy[moduleKey].edit = false;
        copy[moduleKey].delete = false;
      }

      return copy;
    });
  };

  // Toggle entire module row (all on / all off)
  const handleToggleRow = (moduleKey: ModuleKey) => {
    setPermissionsMatrix((prev) => {
      const copy = { ...prev };
      const current = copy[moduleKey] || { view: false, add: false, edit: false, delete: false };
      const allOn = current.view && current.add && current.edit && current.delete;
      const targetVal = !allOn;

      copy[moduleKey] = {
        view: targetVal,
        add: targetVal,
        edit: targetVal,
        delete: targetVal,
      };
      return copy;
    });
  };

  // Save User (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      const payload = {
        ...formData,
        permissions: permissionsMatrix,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        notify(data.message || (editingUser ? "User updated!" : "User created!"));
        setShowModal(false);
        loadUsers();
      } else {
        setFormError(data.error || "Failed to save user");
      }
    } catch (e: any) {
      setFormError(e.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  // Delete User
  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        notify(data.message || "User deleted");
        loadUsers();
      } else {
        notify(data.error || "Failed to delete user", "error");
      }
    } catch (e: any) {
      notify(e.message || "Failed to delete user", "error");
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !search ||
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const adminCount = users.filter((u) => u.role === "ADMIN").length;
    const managerCount = users.filter((u) => u.role === "MANAGER").length;
    const salesCount = users.filter((u) => u.role === "SALES").length;
    const financeCount = users.filter((u) => u.role === "FINANCE").length;
    return {
      total: users.length,
      adminCount,
      managerCount,
      salesCount,
      financeCount,
    };
  }, [users]);

  const roleColors: Record<string, { bg: string; color: string; label: string }> = {
    ADMIN: { bg: "rgba(168, 85, 247, 0.15)", color: "#a855f7", label: "Admin (Full Control)" },
    MANAGER: { bg: "rgba(0, 112, 243, 0.15)", color: "#0070f3", label: "Manager" },
    SALES: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", label: "Sales Team" },
    FINANCE: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", label: "Finance" },
    OPERATIONS: { bg: "rgba(14, 165, 233, 0.15)", color: "#0ea5e9", label: "Operations" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            Users &amp; Roles Permission Management
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Manage user logins, assign access roles, and customize granular per-module action permissions
          </p>
        </div>

        {/* Action Button */}
        {(isAdmin || can("users", "add")) && (
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary btn-sm"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" x2="19" y1="12" y2="12" />
            </svg>
            + Create New User
          </button>
        )}
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "8px",
            fontSize: "0.85rem",
            fontWeight: 600,
            background: notification.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            color: notification.type === "success" ? "#10b981" : "#ef4444",
            border: `1px solid ${notification.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Total Users
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)" }}>
            {metrics.total} Accounts
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Registered in CRM database
          </div>
        </div>

        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Admins &amp; Managers
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#a855f7" }}>
            {metrics.adminCount + metrics.managerCount} Leaders
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            {metrics.adminCount} Admins • {metrics.managerCount} Managers
          </div>
        </div>

        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Sales Team Staff
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10b981" }}>
            {metrics.salesCount} Members
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Inquiries &amp; Quotations access
          </div>
        </div>

        <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
            Finance &amp; Accounts
          </div>
          <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#f59e0b" }}>
            {metrics.financeCount} Members
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Invoicing &amp; Payroll access
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="search"
            placeholder="Search by name, email..."
            className="form-input"
            style={{ maxWidth: "260px" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input"
            style={{ maxWidth: "180px" }}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Showing {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Access Role</th>
                <th>Permissions Summary</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th>Last Login</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading user accounts...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No users found matching your search</td></tr>
              ) : filteredUsers.map((u) => {
                const rStyle = roleColors[u.role] || roleColors.SALES;
                const perms = u.permissionsMap || getDefaultPermissions(u.role);
                const activeCount = u.role === "ADMIN" ? 10 : countAccessibleModules(perms);

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "10px",
                            background: rStyle.bg,
                            color: rStyle.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.8rem",
                          }}
                        >
                          {(u.name || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.875rem" }}>
                            {u.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className="badge"
                        style={{
                          background: rStyle.bg,
                          color: rStyle.color,
                          fontWeight: 700,
                          fontSize: "0.72rem",
                          padding: "3px 8px",
                        }}
                      >
                        {rStyle.label}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "0.725rem",
                            fontWeight: 700,
                            color: activeCount >= 8 ? "#10b981" : activeCount >= 4 ? "#0070f3" : "#f59e0b",
                            background: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {u.role === "ADMIN" ? "Full Access (All Modules)" : `${activeCount} of 10 Modules`}
                        </span>
                      </div>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: u.status === "ACTIVE" ? "#10b981" : "#ef4444",
                          background: u.status === "ACTIVE" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: u.status === "ACTIVE" ? "#10b981" : "#ef4444" }} />
                        {u.status || "ACTIVE"}
                      </span>
                    </td>

                    <td style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      {u.lastLogin ? formatDate(u.lastLogin) : "Never"}
                    </td>

                    <td style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                      {formatDate(u.createdAt)}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        {(isAdmin || can("users", "edit")) && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: "0.725rem", padding: "3px 8px", fontWeight: 600 }}
                          >
                            Edit &amp; Permissions
                          </button>
                        )}
                        {(isAdmin || can("users", "delete")) && u.role !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id, u.name)}
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#ef4444", padding: "3px 6px" }}
                            title="Delete User"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────
         ADD / EDIT USER & PERMISSIONS MATRIX MODAL
         ───────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: "860px", maxHeight: "90vh", overflowY: "auto" }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(0, 112, 243, 0.12)", color: "#0070f3", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    {editingUser ? `Edit User: ${editingUser.name}` : "Create New User Account"}
                  </h2>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                    Configure credentials, assign base role, and set granular per-module action rights
                  </p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            {formError && (
              <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.85rem", marginBottom: "14px" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Account Credentials */}
              <div className="glass-card" style={{ padding: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Full Name *</label>
                  <input
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Login Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@svil.com"
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                    {editingUser ? "New Password (Optional)" : "Password *"}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "Leave blank to keep current" : "Min 4 characters"}
                    required={!editingUser}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Base Role</label>
                  <select
                    className="form-input"
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      applyRolePreset(newRole);
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Account Status</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE (Enabled)</option>
                    <option value="INACTIVE">INACTIVE (Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Granular Permissions Matrix Section */}
              <div className="glass-card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                      Custom Per-Module Rights &amp; Action Permissions
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      Grant or restrict View, Add, Edit, and Delete access per module for this user
                    </p>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => applyRolePreset("ADMIN")}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                    >
                      Full Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset("MANAGER")}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                    >
                      Manager Default
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset("SALES")}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                    >
                      Sales Default
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset("FINANCE")}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.7rem", padding: "3px 8px" }}
                    >
                      Finance Default
                    </button>
                  </div>
                </div>

                {/* Permissions Matrix Grid */}
                <div style={{ overflowX: "auto" }}>
                  <table className="data-table" style={{ fontSize: "0.8rem" }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: "220px" }}>Module Name</th>
                        <th style={{ textAlign: "center", width: "90px" }}>View (Read)</th>
                        <th style={{ textAlign: "center", width: "90px" }}>Add (Create)</th>
                        <th style={{ textAlign: "center", width: "90px" }}>Edit (Modify)</th>
                        <th style={{ textAlign: "center", width: "90px" }}>Delete</th>
                        <th style={{ textAlign: "center", width: "80px" }}>Toggle All</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod) => {
                        const mPerms = permissionsMatrix[mod.key] || { view: false, add: false, edit: false, delete: false };
                        const isAll = mPerms.view && mPerms.add && mPerms.edit && mPerms.delete;

                        return (
                          <tr key={mod.key} style={{ background: mPerms.view ? "transparent" : "rgba(0,0,0,0.02)" }}>
                            <td>
                              <div>
                                <span style={{ fontWeight: 700, color: mPerms.view ? "var(--text-main)" : "var(--text-subtle)", fontSize: "0.85rem" }}>
                                  {mod.label}
                                </span>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                  {mod.description}
                                </div>
                              </div>
                            </td>

                            {/* View Checkbox */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={mPerms.view}
                                onChange={() => handleToggleCell(mod.key, "view")}
                                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#0070f3" }}
                              />
                            </td>

                            {/* Add Checkbox */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={mPerms.add}
                                onChange={() => handleToggleCell(mod.key, "add")}
                                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#10b981" }}
                              />
                            </td>

                            {/* Edit Checkbox */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={mPerms.edit}
                                onChange={() => handleToggleCell(mod.key, "edit")}
                                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#f59e0b" }}
                              />
                            </td>

                            {/* Delete Checkbox */}
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={mPerms.delete}
                                onChange={() => handleToggleCell(mod.key, "delete")}
                                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#ef4444" }}
                              />
                            </td>

                            {/* Toggle All Button */}
                            <td style={{ textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleToggleRow(mod.key)}
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: "0.65rem", padding: "2px 6px", color: isAll ? "#10b981" : "var(--text-muted)" }}
                              >
                                {isAll ? "All ✓" : "Toggle"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "14px" }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  {saving ? "Saving..." : editingUser ? "Update User & Permissions" : "Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
