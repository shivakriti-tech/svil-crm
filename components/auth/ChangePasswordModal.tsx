"use client";

import { useState } from "react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(data.error || "Failed to update password");
      } else {
        setSuccess("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setSuccess("");
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setLoading(false);
      setError("An unexpected error occurred");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>
              Change Account Password
            </h2>
            <p style={{ fontSize: "0.8rem", color: "#a1a1aa", marginTop: "2px" }}>
              Update your account access credentials
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: "4px 8px" }}>
            ✕
          </button>
        </div>

        {error && (
          <div className="chip chip-danger" style={{ width: "100%", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", justifyContent: "flex-start" }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="chip chip-success" style={{ width: "100%", borderRadius: "10px", padding: "10px 14px", marginBottom: "16px", justifyContent: "flex-start" }}>
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}>
              Current Password
            </label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}>
              New Password
            </label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#a1a1aa", marginBottom: "6px" }}>
              Confirm New Password
            </label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "12px" }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
