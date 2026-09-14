import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SVIL CRM — Siddhi Vinayak International Logistics",
  description:
    "Business Management System for SVIL — freight forwarding & customs clearance. Manage inquiries, jobs, finance, and daily operations in one unified platform.",
  keywords: "SVIL, freight forwarding, customs clearance, logistics CRM, shipment tracking",
  authors: [{ name: "SVIL Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
