import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Providers from "@/components/Providers";
import TopBar from "@/components/layout/TopBar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Providers>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-page)", width: "100%" }}>
        <Sidebar />
        <div
          id="main-content"
          style={{
            flex: 1,
            marginLeft: "240px",
            minWidth: 0,
            width: "calc(100% - 240px)",
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            background: "var(--bg-page)",
          }}
        >
          <TopBar />
          <main style={{ flex: 1, padding: "24px", overflowX: "auto" }}>
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
