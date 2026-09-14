import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-page)", padding: "32px", color: "var(--text-main)" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", gap: "12px" }}>
          <a href="/dashboard" style={{ color: "#0070f3", textDecoration: "none", fontSize: "0.875rem", fontWeight: 600 }}>
            ← Back to Dashboard
          </a>
          <span style={{ color: "var(--border-color)" }}>|</span>
          <span style={{ fontSize: "0.75rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.12)", padding: "2px 8px", borderRadius: "4px", border: "1px solid rgba(239, 68, 68, 0.3)", fontWeight: 700 }}>
            ADMIN ONLY
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
