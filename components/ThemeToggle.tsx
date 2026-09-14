"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="btn-theme-toggle"
      onClick={toggleTheme}
      className="btn btn-ghost btn-sm"
      style={{
        padding: "6px 12px",
        borderRadius: "10px",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        color: "var(--text-muted)",
        border: "1px solid var(--border-color)",
        background: "var(--card-bg)",
        transition: "all 0.2s ease",
      }}
      title={`Switch to ${theme === "dark" ? "Light" : "Dark"} mode`}
    >
      {theme === "dark" ? (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
          <span style={{ fontSize: "0.775rem", fontWeight: 600 }}>Light</span>
        </>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span style={{ fontSize: "0.775rem", fontWeight: 600 }}>Dark</span>
        </>
      )}
    </button>
  );
}
