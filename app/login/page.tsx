"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#090d16", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", position: "relative" }}>
      {/* Glow effect */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 30%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)",
        }}
      />

      <div style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}>
        {/* Logo & Brand */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 10px 30px rgba(59, 130, 246, 0.35)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "1.25rem",
            }}
          >
            SV
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f8fafc", letterSpacing: "-0.02em" }}>
            SVIL CRM
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "4px" }}>
            Siddhi Vinayak International Logistics
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card" style={{ padding: "36px" }}>
          <div style={{ marginBottom: "28px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc" }}>
              Welcome back
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
              Sign in to manage freight inquiries & shipments
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "12px",
                color: "#f87171",
                fontSize: "0.875rem",
                marginBottom: "20px",
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label htmlFor="email" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>
                Work Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@svil.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ padding: "12px 16px" }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ padding: "12px 16px" }}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", marginTop: "10px", padding: "12px 16px", fontSize: "0.95rem" }}
            >
              {loading ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #1e293b", textAlign: "center" }}>
            <p style={{ fontSize: "0.775rem", color: "#64748b" }}>
              System Login: <code style={{ color: "#60a5fa" }}>admin@svil.com</code> / <code style={{ color: "#60a5fa" }}>svil@2026</code>
            </p>
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: "28px", fontSize: "0.75rem", color: "#475569" }}>
          &copy; {new Date().getFullYear()} Siddhi Vinayak International Logistics. All rights reserved.
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
