"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import ChangePasswordModal from "@/components/auth/ChangePasswordModal";
import ThemeToggle from "@/components/ThemeToggle";
import { getStatusLabel, getStatusColor } from "@/lib/utils";

export default function TopBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [followUpCount, setFollowUpCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{ jobs: any[]; inquiries: any[]; customers: any[] }>({
    jobs: [],
    inquiries: [],
    customers: [],
  });
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/inquiries/followups-today")
      .then((r) => r.json())
      .then((d) => setFollowUpCount(d.count || 0))
      .catch(() => {});
  }, [pathname]);

  // Debounced search effect
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults({ jobs: [], inquiries: [], customers: [] });
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
        .then((r) => r.json())
        .then((d) => {
          setSearchResults(d);
          setShowSearchDropdown(true);
          setSearchLoading(false);
        })
        .catch(() => setSearchLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults =
    searchResults.jobs.length > 0 ||
    searchResults.inquiries.length > 0 ||
    searchResults.customers.length > 0;

  const userInitials = (session?.user?.name ?? "U").slice(0, 2).toUpperCase();

  return (
    <>
      <header
        style={{
          height: "64px",
          background: "var(--bg-header)",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Search Input Bar (Reactive with Auto-Suggest Dropdown) */}
        <div ref={searchContainerRef} style={{ position: "relative", width: "360px" }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", zIndex: 2 }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            id="global-search-input"
            type="text"
            placeholder="Search jobs, inquiries, customers..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim().length >= 2 && hasResults) setShowSearchDropdown(true);
            }}
            style={{
              paddingLeft: "40px",
              paddingRight: searchLoading ? "36px" : "14px",
              height: "38px",
              background: "var(--input-bg)",
              border: "1px solid var(--input-border)",
              borderRadius: "10px",
              fontSize: "0.85rem",
            }}
          />

          {searchLoading && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0070f3"
              strokeWidth="2"
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                animation: "spin 1s linear infinite",
              }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          )}

          {/* Search Results Dropdown Panel */}
          {showSearchDropdown && (
            <div
              style={{
                position: "absolute",
                top: "46px",
                left: 0,
                right: 0,
                background: "#161618",
                border: "1px solid #27272a",
                borderRadius: "14px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.8)",
                maxHeight: "420px",
                overflowY: "auto",
                zIndex: 50,
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {!hasResults && !searchLoading && (
                <div style={{ textAlign: "center", padding: "16px", color: "#71717a", fontSize: "0.8rem" }}>
                  No matching jobs, inquiries, or customers found.
                </div>
              )}

              {/* Jobs Category */}
              {searchResults.jobs.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0070f3", marginBottom: "6px" }}>
                    Jobs & Shipments ({searchResults.jobs.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {searchResults.jobs.map((job) => (
                      <div
                        key={job.id}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                          router.push(`/jobs/${job.id}`);
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#1e1e22",
                          border: "1px solid #27272a",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#27272a"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#1e1e22"; }}
                      >
                        <div>
                          <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "#60a5fa" }}>
                            {job.jobId} {job.legacyJobId ? `(${job.legacyJobId})` : ""}
                          </div>
                          <div style={{ fontSize: "0.725rem", color: "#a1a1aa", marginTop: "2px" }}>
                            {job.partyName} · {job.pol} → {job.pod}
                          </div>
                        </div>
                        <span className={`chip ${getStatusColor(job.currentStatus)}`} style={{ fontSize: "0.625rem", padding: "1px 6px" }}>
                          {getStatusLabel(job.currentStatus)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inquiries Category */}
              {searchResults.inquiries.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#10b981", marginBottom: "6px" }}>
                    Inquiries ({searchResults.inquiries.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {searchResults.inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                          router.push(`/inquiries?search=${inq.inquiryNo}`);
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#1e1e22",
                          border: "1px solid #27272a",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#27272a"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#1e1e22"; }}
                      >
                        <div>
                          <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "#34d399" }}>
                            Inquiry #{inq.inquiryNo}
                          </div>
                          <div style={{ fontSize: "0.725rem", color: "#a1a1aa", marginTop: "2px" }}>
                            {inq.customer?.name} · {inq.pol} → {inq.pod}
                          </div>
                        </div>
                        <span className={`chip ${getStatusColor(inq.status)}`} style={{ fontSize: "0.625rem", padding: "1px 6px" }}>
                          {getStatusLabel(inq.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers Category */}
              {searchResults.customers.length > 0 && (
                <div>
                  <div style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a855f7", marginBottom: "6px" }}>
                    Customers ({searchResults.customers.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {searchResults.customers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setShowSearchDropdown(false);
                          setSearchQuery("");
                          router.push(`/jobs?search=${encodeURIComponent(cust.name)}`);
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "#1e1e22",
                          border: "1px solid #27272a",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#27272a"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#1e1e22"; }}
                      >
                        <div>
                          <div style={{ fontSize: "0.825rem", fontWeight: 700, color: "#c084fc" }}>
                            {cust.name}
                          </div>
                          {cust.contactPerson && (
                            <div style={{ fontSize: "0.725rem", color: "#a1a1aa", marginTop: "2px" }}>
                              Contact: {cust.contactPerson ?? "—"} {cust.email ? `(${cust.email})` : ""}
                            </div>
                          )}
                        </div>
                        <span className="chip chip-purple" style={{ fontSize: "0.625rem", padding: "1px 6px" }}>
                          Customer
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Top Bar Utilities */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Theme Switcher Toggle */}
          <ThemeToggle />

          {/* Follow-up Notification Bell Badge */}
          {followUpCount > 0 && (
            <Link
              href="/inquiries?filter=followup"
              id="followup-bell"
              className="chip chip-warning"
              style={{ textDecoration: "none", cursor: "pointer", padding: "6px 14px", height: "34px" }}
              title={`${followUpCount} follow-up(s) due today`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span>{followUpCount} Due Today</span>
            </Link>
          )}

          {/* Change Password Button */}
          <button
            id="btn-open-password-modal"
            onClick={() => setShowPasswordModal(true)}
            className="btn btn-ghost btn-sm"
            style={{ color: "#a1a1aa", gap: "6px" }}
            title="Change Password"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Password
          </button>

          {/* User Profile Circle Avatar */}
          {session?.user && (
            <div
              id="btn-user-avatar"
              onClick={() => setShowPasswordModal(true)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "9999px",
                background: "linear-gradient(135deg, #0070f3 0%, #0051c7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.8rem",
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: "0 0 12px rgba(0, 112, 243, 0.4)",
                cursor: "pointer",
              }}
              title={`${session.user.name} (${(session.user as any).role}) - Click to Change Password`}
            >
              {userInitials}
            </div>
          )}
        </div>
      </header>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
