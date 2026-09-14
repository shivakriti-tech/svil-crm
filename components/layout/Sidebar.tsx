"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { ModuleKey } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  moduleKey: ModuleKey;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Main Menu",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        moduleKey: "dashboard",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="7" height="7" x="3" y="3" rx="1.5" /><rect width="7" height="7" x="14" y="3" rx="1.5" />
            <rect width="7" height="7" x="14" y="14" rx="1.5" /><rect width="7" height="7" x="3" y="14" rx="1.5" />
          </svg>
        ),
      },
      {
        href: "/inquiries",
        label: "Inquiries",
        moduleKey: "inquiries",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        href: "/quotations",
        label: "Quotations",
        moduleKey: "quotations",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        ),
      },
      {
        href: "/jobs",
        label: "Jobs / Shipments",
        moduleKey: "jobs",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        ),
      },
      {
        href: "/daily-status",
        label: "Daily Status",
        moduleKey: "dailyStatus",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "General",
    items: [
      {
        href: "/finance",
        label: "Finance",
        moduleKey: "finance",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" x2="12" y1="1" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      },
      {
        href: "/hr",
        label: "HR & Payroll",
        moduleKey: "hr",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
      {
        href: "/reports",
        label: "Reports",
        moduleKey: "reports",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Settings & Administration",
    items: [
      {
        href: "/masters",
        label: "Masters",
        moduleKey: "masters",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        ),
      },
      {
        href: "/users",
        label: "Users & Roles",
        moduleKey: "users",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, role, isAdmin, hasModule } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const userInitials = (user?.name ?? "User").slice(0, 2).toUpperCase();

  // Filter sections based on permissions
  const visibleSections = navSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => {
        if (isAdmin) return true;
        // Sales and Finance team should never see users module
        if (item.moduleKey === "users" && (role === "SALES" || role === "FINANCE")) {
          return false;
        }
        return hasModule(item.moduleKey);
      }),
    }))
    .filter((sec) => sec.items.length > 0);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch (e) {
      console.error("Sign out error", e);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <aside
      style={{
        width: collapsed ? "70px" : "240px",
        minHeight: "100vh",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 40,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0" : "0 18px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}>
            <div
              style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                background: "#0070f3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: "0.85rem",
              }}
            >
              SV
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-main)", letterSpacing: "-0.01em" }}>
                  SVIL Logistics
                </span>
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
                Freight &amp; Customs CRM
              </div>
            </div>
          </div>
        )}
        <button
          id="btn-toggle-sidebar"
          onClick={() => setCollapsed(!collapsed)}
          className="btn btn-ghost btn-sm"
          style={{ padding: "6px" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      </div>

      {/* Navigation Sections */}
      <div style={{ flex: 1, padding: "20px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "22px" }}>
        {visibleSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed && (
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--text-subtle)",
                  padding: "0 10px 10px 10px",
                }}
              >
                {section.title}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    id={`nav-link-${item.href.replace("/", "") || "home"}`}
                    className={`sidebar-link ${active ? "active" : ""}`}
                    style={{
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "10px" : "11px 14px",
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <span>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            {!collapsed && (
              <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-subtle)", padding: "0 10px 10px 10px" }}>
                System
              </div>
            )}
            <Link
              href="/admin/migrate"
              id="nav-link-admin-migrate"
              className={`sidebar-link ${isActive("/admin/migrate") ? "active" : ""}`}
              style={{ justifyContent: collapsed ? "center" : "flex-start", padding: collapsed ? "10px" : "11px 14px" }}
              title={collapsed ? "Data Migration" : undefined}
            >
              <span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </span>
              {!collapsed && <span>Data Migration</span>}
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: "14px", borderTop: "1px solid var(--border-color)", background: "var(--bg-sidebar)" }}>
        {!collapsed ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "9999px",
                  background: "#0070f3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                {userInitials}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {user?.name ?? "User"}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>
                  {role}
                </div>
              </div>
            </div>
            <button
              id="btn-signout"
              onClick={handleSignOut}
              className="btn btn-ghost btn-sm"
              style={{ padding: "6px", color: "var(--text-muted)" }}
              title="Sign Out"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        ) : (
          <button
            id="btn-signout-collapsed"
            onClick={handleSignOut}
            className="btn btn-ghost btn-sm"
            style={{ width: "100%", justifyContent: "center", padding: "8px" }}
            title="Sign Out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        )}
      </div>
    </aside>
  );
}
