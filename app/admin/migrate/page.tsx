"use client";

import { useState, useRef } from "react";

interface FileUploadState {
  file: File | null;
  name: string;
  key: "enquiry" | "shipment" | "dsr";
  label: string;
  description: string;
}

const FILES: Omit<FileUploadState, "file">[] = [
  {
    key: "enquiry",
    name: "enquiry tracking.xlsx",
    label: "Enquiry Tracking Workbook",
    description: "Multiple monthly tabs (April 26 – Jan 27). Contains all inquiry records.",
  },
  {
    key: "shipment",
    name: "shipment data sheet.xlsx",
    label: "Shipment Data Sheet",
    description: "Single sheet with ~999 rows. Real data rows have POL/POD filled. Skeleton rows are auto-skipped.",
  },
  {
    key: "dsr",
    name: "DSR 2026.xlsx",
    label: "DSR 2026",
    description: "3 tabs: Sheet1 (active jobs), completed (closed jobs), sheet4 (vessel sailing subset).",
  },
];

export default function MigratePage() {
  const [files, setFiles] = useState<Record<string, File | null>>({ enquiry: null, shipment: null, dsr: null });
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const refs = { enquiry: useRef<HTMLInputElement>(null), shipment: useRef<HTMLInputElement>(null), dsr: useRef<HTMLInputElement>(null) };

  const handleFile = (key: string, file: File | null) => {
    setFiles((f) => ({ ...f, [key]: file }));
    setResults(null);
    setError("");
  };

  const handleDrop = (key: string, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".xlsx")) handleFile(key, file);
  };

  const handleRun = async () => {
    const uploadedCount = Object.values(files).filter(Boolean).length;
    if (uploadedCount === 0) {
      setError("Please upload at least one Excel file to migrate.");
      return;
    }

    if (!confirm(`Run migration with ${uploadedCount} file(s)? This will import data into the database. Existing records with the same ID will be skipped.`)) return;

    setRunning(true);
    setError("");
    setResults(null);

    try {
      const formData = new FormData();
      if (files.enquiry) formData.append("enquiry", files.enquiry);
      if (files.shipment) formData.append("shipment", files.shipment);
      if (files.dsr) formData.append("dsr", files.dsr);

      const res = await fetch("/api/admin/migrate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Migration failed");
      } else {
        setResults(data);
      }
    } catch (e: any) {
      setError(e.message ?? "Migration failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px" }}>
      <div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-main)" }}>Data Migration</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginTop: "6px" }}>
          Upload your 3 Excel source files to import historical data into SVIL CRM.
          Existing records (matching by Inquiry No or Job ID) will be skipped to prevent duplicates.
        </p>
      </div>

      {/* Warning Banner */}
      <div style={{
        padding: "14px 16px",
        background: "rgba(245, 158, 11, 0.1)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
        borderRadius: "8px",
        fontSize: "0.85rem",
        color: "#d97706",
        fontWeight: 500,
      }}>
        <strong>Important:</strong> Run migration only once per file. Upload all 3 files together for best cross-linking results.
        Always run on a fresh database or after clearing existing records.
      </div>

      {/* File Upload Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {FILES.map((fileInfo) => {
          const file = files[fileInfo.key];
          return (
            <div
              key={fileInfo.key}
              className="card"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => handleDrop(fileInfo.key, e)}
              style={{ border: file ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-color)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={file ? "#10b981" : "var(--text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10 9 9 9 8 9"/>
                    </svg>
                    <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)" }}>
                      {fileInfo.label}
                    </h3>
                    {file && (
                      <span style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderRadius: "9999px", border: "1px solid rgba(16, 185, 129, 0.3)", fontWeight: 700 }}>
                        Ready
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>
                    {fileInfo.description}
                  </p>
                  {file && (
                    <p style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                  <button
                    id={`upload-${fileInfo.key}`}
                    onClick={() => refs[fileInfo.key].current?.click()}
                    className="btn btn-secondary btn-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 16 12 12 8 16"/><line x1="12" x2="12" y1="12" y2="21"/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                    {file ? "Change File" : "Upload File"}
                  </button>
                  {file && (
                    <button onClick={() => handleFile(fileInfo.key, null)} className="btn btn-ghost btn-sm">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={refs[fileInfo.key]}
                type="file"
                accept=".xlsx"
                style={{ display: "none" }}
                onChange={(e) => handleFile(fileInfo.key, e.target.files?.[0] ?? null)}
              />
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Run Button */}
      <button
        id="btn-run-migration"
        onClick={handleRun}
        disabled={running || Object.values(files).every((f) => !f)}
        className="btn btn-primary"
        style={{ alignSelf: "flex-start", padding: "12px 24px" }}
      >
        {running ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Running Migration...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Run Migration
          </>
        )}
      </button>

      {/* Results */}
      {results && (
        <div className="glass-card" style={{ padding: "24px" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "20px" }}>
            Migration Complete
          </h2>

          {/* Summary Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
            <SummaryCard label="Inquiries Created" value={results.inquiriesCreated || 0} color="#3b82f6" />
            <SummaryCard label="Inquiries Updated" value={results.inquiriesUpdated || 0} color="#06b6d4" />
            <SummaryCard label="Jobs Created" value={results.jobsCreated || 0} color="#22c55e" />
            <SummaryCard label="Jobs Updated" value={results.jobsUpdated || 0} color="#a855f7" />
          </div>

          {/* Files Processed */}
          {results.files?.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                Files Processed
              </h3>
              {results.files.map((f: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--card-hover-bg)", borderRadius: "6px", marginBottom: "6px", fontSize: "0.8rem", border: "1px solid var(--border-color)" }}>
                  <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{f.name || f}</span>
                  {f.rowsProcessed && <span style={{ color: "var(--text-muted)" }}>{f.rowsProcessed} rows processed</span>}
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {results.warnings?.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 600, color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Warnings ({results.warnings.length})
              </h3>
              <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                {results.warnings.map((w: string, i: number) => (
                  <div key={i} style={{ fontSize: "0.75rem", color: "#d97706", padding: "4px 10px", background: "rgba(245, 158, 11, 0.1)", borderRadius: "4px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {results.errors?.length > 0 && (
            <div>
              <h3 style={{ fontSize: "0.8rem", fontWeight: 600, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Errors ({results.errors.length})
              </h3>
              <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                {results.errors.map((e: string, i: number) => (
                  <div key={i} style={{ fontSize: "0.75rem", color: "#ef4444", padding: "4px 10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "4px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.errors?.length === 0 && results.warnings?.length === 0 && (
            <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", color: "#10b981", fontSize: "0.875rem", fontWeight: 600 }}>
              Migration completed with no errors.
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ padding: "16px", background: "var(--card-hover-bg)", borderRadius: "8px", border: `1px solid ${color}33`, textAlign: "center" }}>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
