"use client";

import { useEffect, useState, useCallback } from "react";
import { generatePayslipPdf } from "@/lib/payslipPdf";
import { usePermissions } from "@/hooks/usePermissions";

type HrTab = "attendance" | "payroll" | "employees";
type AttendanceView = "daily" | "monthly";

export const DEPARTMENTS = [
  "Sales",
  "Operations",
  "Import",
  "Export",
  "Finance",
  "HR",
  "Marketing",
];

export const DESIGNATIONS = [
  "Director",
  "General Manager (GM)",
  "Branch Manager",
  "Sales Manager",
  "Senior Sales Executive",
  "Business Development Executive",
  "Operations Manager",
  "Documentation Executive",
  "Pricing & Procurement Executive",
  "Customs Clearance Specialist (CHA)",
  "Customer Service Executive",
  "Finance & Accounts Manager",
  "Accountant",
  "HR Executive",
  "Digital Marketing Specialist",
];

export default function HrPage() {
  const { isAdmin, isManager, user } = usePermissions();
  const isScoped = !isAdmin && !isManager;

  const [activeTab, setActiveTab] = useState<HrTab>("attendance");
  const [attendanceView, setAttendanceView] = useState<AttendanceView>("daily");

  // Filter States
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Attendance Data
  const [dailyAttendance, setDailyAttendance] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any>({
    totalEmployees: 0,
    presentCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    onLeaveCount: 0,
    unmarkedCount: 0,
  });
  const [monthlyMatrix, setMonthlyMatrix] = useState<any[]>([]);
  const [daysInMonth, setDaysInMonth] = useState<number>(31);

  // Payroll Data
  const [payrollItems, setPayrollItems] = useState<any[]>([]);
  const [payrollSummary, setPayrollSummary] = useState<any>({
    totalEmployees: 0,
    totalGross: 0,
    totalNet: 0,
    totalPaid: 0,
    totalPending: 0,
    paidCount: 0,
    pendingCount: 0,
  });

  // Employee Directory Data
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Self Attendance Marking Note / State
  const [selfRemarks, setSelfRemarks] = useState("");

  // Employee Edit / Add Modal
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState<any>({
    employeeId: "",
    name: "",
    employeeCode: "",
    designation: "Operations Manager",
    department: "Operations",
    dateOfJoining: "",
    phone: "",
    email: "",
    panNo: "",
    bankName: "",
    bankAccountNo: "",
    ifscCode: "",
    basicSalary: 30000,
    pfEnabled: true,
    pfDeduction: 3600, // 12% of 30,000
    taxDeduction: 0,
    status: "ACTIVE",
  });

  // Quick Alert Helper
  const notify = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Load Daily Attendance
  const loadDailyAttendance = useCallback(async () => {
    try {
      const res = await fetch(`/api/hr/attendance?date=${selectedDate}`);
      const data = await res.json();
      setDailyAttendance(data.items || []);
      if (data.summary) setDailySummary(data.summary);
    } catch (e) {
      console.error("Failed to load daily attendance", e);
    }
  }, [selectedDate]);

  // 2. Load Monthly Attendance Matrix
  const loadMonthlyAttendance = useCallback(async () => {
    try {
      const res = await fetch(`/api/hr/attendance?month=${selectedMonth}`);
      const data = await res.json();
      setMonthlyMatrix(data.matrix || []);
      setDaysInMonth(data.daysInMonth || 30);
    } catch (e) {
      console.error("Failed to load monthly attendance", e);
    }
  }, [selectedMonth]);

  // 3. Load Payroll
  const loadPayroll = useCallback(async () => {
    try {
      const res = await fetch(`/api/hr/payroll?month=${selectedMonth}`);
      const data = await res.json();
      setPayrollItems(data.items || []);
      if (data.summary) setPayrollSummary(data.summary);
    } catch (e) {
      console.error("Failed to load payroll", e);
    }
  }, [selectedMonth]);

  // 4. Load Employees Directory
  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/hr/employees");
      const data = await res.json();
      setEmployees(data.items || []);
    } catch (e) {
      console.error("Failed to load employees", e);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      loadDailyAttendance(),
      loadMonthlyAttendance(),
      loadPayroll(),
      loadEmployees(),
    ]);
    setLoading(false);
  }, [loadDailyAttendance, loadMonthlyAttendance, loadPayroll, loadEmployees]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Self Attendance Marking Action (For Employees / Any logged-in user)
  const handleMarkSelfAttendance = async (statusToMark: string) => {
    const targetEmployeeId = employees[0]?.id || dailyAttendance[0]?.employeeId;
    if (!targetEmployeeId) {
      notify("No employee profile found. Please ask Admin to set up your staff profile in Employee Directory.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: targetEmployeeId,
          date: selectedDate,
          status: statusToMark,
          checkIn: statusToMark === "PRESENT" ? "09:30 AM" : statusToMark === "HALF_DAY" ? "01:30 PM" : "",
          checkOut: statusToMark === "PRESENT" || statusToMark === "HALF_DAY" ? "06:30 PM" : "",
          remarks: selfRemarks,
        }),
      });
      if (res.ok) {
        notify(`✓ Your attendance for ${selectedDate} has been recorded as "${statusToMark}"!`);
        loadDailyAttendance();
        loadMonthlyAttendance();
        loadPayroll();
      } else {
        const err = await res.json();
        notify(err.error || "Failed to mark attendance", "error");
      }
    } catch (e: any) {
      notify(e.message || "Failed to mark attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  // Attendance Actions (Admin Only)
  const handleMarkAllPresent = async () => {
    if (isScoped) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "MARK_ALL_PRESENT", date: selectedDate }),
      });
      if (res.ok) {
        notify(`All employees marked PRESENT for ${selectedDate}`);
        loadDailyAttendance();
        loadMonthlyAttendance();
        loadPayroll();
      }
    } catch (e: any) {
      notify(e.message || "Failed to mark attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateDailyStatus = async (employeeId: string, status: string, checkIn?: string, checkOut?: string, remarks?: string) => {
    try {
      const res = await fetch("/api/hr/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          date: selectedDate,
          status,
          checkIn: checkIn || (status === "PRESENT" ? "09:30 AM" : status === "HALF_DAY" ? "01:30 PM" : null),
          checkOut: checkOut || (status === "PRESENT" || status === "HALF_DAY" ? "06:30 PM" : null),
          remarks,
        }),
      });
      if (res.ok) {
        loadDailyAttendance();
        loadMonthlyAttendance();
        loadPayroll();
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  // Payroll Actions (Admin Only)
  const handleComputeAndSavePayroll = async () => {
    if (isScoped) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_ALL",
          month: selectedMonth,
          payrolls: payrollItems,
        }),
      });
      if (res.ok) {
        notify(`Monthly payroll synced & verified for ${selectedMonth}!`);
        loadPayroll();
      }
    } catch (e: any) {
      notify(e.message || "Failed to save payroll", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePaymentStatus = async (employeeId: string, currentStatus: string) => {
    if (isScoped) return;
    const nextStatus = currentStatus === "PAID" ? "PENDING" : "PAID";
    try {
      const res = await fetch("/api/hr/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          month: selectedMonth,
          paymentStatus: nextStatus,
        }),
      });
      if (res.ok) {
        notify(`Payment status changed to ${nextStatus}`);
        loadPayroll();
      }
    } catch (e) {
      console.error("Failed to update payment status", e);
    }
  };

  const handleDownloadPayslip = (p: any) => {
    const monthFormatted = new Date(`${selectedMonth}-01`).toLocaleString("en-US", { month: "long", year: "numeric" });
    generatePayslipPdf({
      employeeCode: p.employeeCode,
      employeeName: p.employeeName,
      designation: p.designation,
      department: p.department,
      month: monthFormatted,
      panNo: p.panNo,
      bankName: p.bankName,
      bankAccountNo: p.bankAccountNo,
      ifscCode: p.ifscCode,
      workingDays: p.workingDays,
      presentDays: p.presentDays,
      absentDays: p.absentDays,
      halfDays: p.halfDays,
      paidDays: p.paidDays,
      basicSalary: p.basicSalary,
      hra: 0,
      allowances: 0,
      bonusIncentive: p.bonusIncentive,
      grossSalary: p.grossSalary,
      absentDeduction: p.absentDeduction,
      pfDeduction: p.pfDeduction,
      taxDeduction: p.taxDeduction,
      otherDeduction: p.otherDeduction,
      totalDeductions: p.totalDeductions,
      netSalary: p.netSalary,
      paymentStatus: p.paymentStatus,
      paymentMode: p.paymentMode,
      transactionRef: p.transactionRef,
      remarks: p.remarks,
    }, "download");
  };

  // Employee Form Save (Admin Only)
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isScoped) return;
    setSaving(true);
    try {
      const res = await fetch("/api/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeForm),
      });
      if (res.ok) {
        notify("Employee profile & salary setup saved successfully!");
        setShowEmployeeModal(false);
        refreshAll();
      } else {
        const err = await res.json();
        notify(err.error || "Failed to save employee", "error");
      }
    } catch (e: any) {
      notify(e.message || "Failed to save employee", "error");
    } finally {
      setSaving(false);
    }
  };

  // Excel Exports
  const handleExportAttendanceExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = monthlyMatrix.map((m) => {
      const row: any = {
        "Employee Name": m.employeeName,
        "Designation": m.designation,
        "Department": m.department,
        "Present Days": m.present,
        "Absent Days": m.absent,
        "Half Days": m.halfDay,
        "Paid Leaves": m.leave,
        "Payable Days": m.payableDays,
        "Attendance %": m.attendanceRate,
      };
      for (let d = 1; d <= daysInMonth; d++) {
        row[`Day ${d}`] = m.days[d] || "—";
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `SVIL_Attendance_${selectedMonth}.xlsx`);
  };

  const handleExportPayrollExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = payrollItems.map((p) => ({
      "Employee Code": p.employeeCode,
      "Employee Name": p.employeeName,
      "Designation": p.designation,
      "Department": p.department,
      "Month": selectedMonth,
      "Working Days": p.workingDays,
      "Present Days": p.presentDays,
      "Absent Days": p.absentDays,
      "Paid Days": p.paidDays,
      "Basic Salary (INR)": p.basicSalary,
      "Absent Deduction (INR)": p.absentDeduction,
      "PF (12% Statutory) (INR)": p.pfDeduction,
      "TDS / Tax (INR)": p.taxDeduction,
      "Net Salary (INR)": p.netSalary,
      "Payment Status": p.paymentStatus,
      "Bank Account": p.bankAccountNo,
      "IFSC": p.ifscCode,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");
    XLSX.writeFile(wb, `SVIL_Payroll_${selectedMonth}.xlsx`);
  };

  const fmt = (n: number) => `₹${(n ?? 0).toLocaleString("en-IN")}`;

  const statusBadgeStyle: Record<string, { bg: string; color: string; label: string }> = {
    PRESENT: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981", label: "Present" },
    ABSENT: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444", label: "Absent" },
    HALF_DAY: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", label: "Half Day" },
    ON_LEAVE: { bg: "rgba(0, 112, 243, 0.15)", color: "#0070f3", label: "Leave" },
    UNMARKED: { bg: "var(--border-color)", color: "var(--text-muted)", label: "Unmarked" },
  };

  const myPayrollItem = payrollItems[0];
  const myEmployee = employees[0];
  const myTodayStatus = dailyAttendance[0]?.status || "UNMARKED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            {isScoped ? `My HR, Attendance & Payslips` : "HR, Attendance & Payroll Management"}
          </h1>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {isScoped
              ? "Self-mark daily attendance, view monthly work activity calendar, and download salary payslips."
              : "Staff directory, absentees/presentees verification, GitHub-style attendance matrix, and monthly payroll"}
          </p>
        </div>

        {/* Global Actions */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {activeTab === "attendance" && (
            <button onClick={handleExportAttendanceExcel} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Export Attendance
            </button>
          )}
          {activeTab === "payroll" && (
            <button onClick={handleExportPayrollExcel} className="btn btn-secondary btn-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Export Payroll
            </button>
          )}
          {!isScoped && (
            <button
              onClick={() => {
                setEmployeeForm({
                  employeeId: "",
                  name: "",
                  employeeCode: `SV-EMP-${String(employees.length + 1).padStart(3, "0")}`,
                  designation: "Operations Manager",
                  department: "Operations",
                  dateOfJoining: new Date().toISOString().slice(0, 10),
                  phone: "",
                  email: "",
                  panNo: "",
                  bankName: "",
                  bankAccountNo: "",
                  ifscCode: "",
                  basicSalary: 30000,
                  pfEnabled: true,
                  pfDeduction: 3600,
                  taxDeduction: 0,
                  status: "ACTIVE",
                });
                setShowEmployeeModal(true);
              }}
              className="btn btn-primary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              + Add Staff Member
            </button>
          )}
        </div>
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

      {/* ─────────────────────────────────────────────
         SELF-SERVICE DAILY ATTENDANCE MARKER WIDGET
         (Allows Employee or Admin to self-mark today's status in 1 click)
         ───────────────────────────────────────────── */}
      <div
        className="glass-card"
        style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(0, 112, 243, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)",
          border: "1px solid rgba(0, 112, 243, 0.2)",
          borderRadius: "12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#0070f3", letterSpacing: "0.05em" }}>
              Daily Self Check-In
            </span>
            <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "6px", background: "var(--card-bg)", color: "var(--text-main)", fontWeight: 700 }}>
              Date: {selectedDate}
            </span>
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)", marginTop: "4px" }}>
            Mark Your Attendance For Today
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Current Status: <strong style={{ color: myTodayStatus === "PRESENT" ? "#10b981" : myTodayStatus === "ABSENT" ? "#ef4444" : "#f59e0b" }}>{myTodayStatus}</strong>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleMarkSelfAttendance("PRESENT")}
            className="btn btn-sm"
            style={{
              background: myTodayStatus === "PRESENT" ? "#10b981" : "rgba(16, 185, 129, 0.15)",
              color: myTodayStatus === "PRESENT" ? "#ffffff" : "#10b981",
              border: "1px solid #10b981",
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            Present (P)
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleMarkSelfAttendance("HALF_DAY")}
            className="btn btn-sm"
            style={{
              background: myTodayStatus === "HALF_DAY" ? "#f59e0b" : "rgba(245, 158, 11, 0.15)",
              color: myTodayStatus === "HALF_DAY" ? "#ffffff" : "#f59e0b",
              border: "1px solid #f59e0b",
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            Half Day (HD)
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleMarkSelfAttendance("ON_LEAVE")}
            className="btn btn-sm"
            style={{
              background: myTodayStatus === "ON_LEAVE" ? "#0070f3" : "rgba(0, 112, 243, 0.15)",
              color: myTodayStatus === "ON_LEAVE" ? "#ffffff" : "#0070f3",
              border: "1px solid #0070f3",
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            Leave (L)
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleMarkSelfAttendance("ABSENT")}
            className="btn btn-sm"
            style={{
              background: myTodayStatus === "ABSENT" ? "#ef4444" : "rgba(239, 68, 68, 0.15)",
              color: myTodayStatus === "ABSENT" ? "#ffffff" : "#ef4444",
              border: "1px solid #ef4444",
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: "8px",
            }}
          >
            Absent (A)
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "14px" }}>
        {isScoped ? (
          <>
            {/* Card 1: My Profile */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                My Staff Profile
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
                {user?.name || myEmployee?.name || "Team Member"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {myEmployee?.profile?.designation || "Executive"} · {myEmployee?.profile?.department || "Operations"}
              </div>
            </div>

            {/* Card 2: My Attendance */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Today's Recorded Status ({selectedDate})
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: myTodayStatus === "PRESENT" ? "#10b981" : myTodayStatus === "ABSENT" ? "#ef4444" : "#f59e0b" }}>
                {myTodayStatus === "PRESENT" ? "✓ Present Today" : myTodayStatus === "HALF_DAY" ? "Half Day" : myTodayStatus === "ON_LEAVE" ? "On Leave" : myTodayStatus === "ABSENT" ? "Absent" : "Unmarked"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Check-in: {dailyAttendance[0]?.checkIn || "09:30 AM"} · Check-out: {dailyAttendance[0]?.checkOut || "06:30 PM"}
              </div>
            </div>

            {/* Card 3: My Monthly Net Salary */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                My Net Take-Home Pay ({selectedMonth})
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0070f3" }}>
                {fmt(myPayrollItem?.netSalary || myEmployee?.profile?.netSalary || 0)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Basic: {fmt(myPayrollItem?.basicSalary ?? myEmployee?.profile?.basicSalary ?? 0)} | PF Ded: {fmt(myPayrollItem?.pfDeduction ?? myEmployee?.profile?.pfDeduction ?? 0)}
              </div>
            </div>

            {/* Card 4: Payment Status */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Salary Payment Status
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: myPayrollItem?.paymentStatus === "PAID" ? "#10b981" : "#f59e0b" }}>
                {myPayrollItem?.paymentStatus === "PAID" ? "Disbursed / Paid ✓" : "Pending Processing"}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {myPayrollItem?.paidDays || 30} payable days credited
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Card 1: Active Staff */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Total Staff Directory
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-main)" }}>
                {employees.length} Employees
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Active logistics &amp; ops staff
              </div>
            </div>

            {/* Card 2: Today's Attendance */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase" }}>Attendance Today ({selectedDate})</span>
                <span style={{ fontSize: "0.7rem", color: "#10b981", background: "rgba(16, 185, 129, 0.15)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                  {dailySummary.totalEmployees > 0 ? `${Math.round((dailySummary.presentCount / dailySummary.totalEmployees) * 100)}%` : "0%"}
                </span>
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                <span style={{ color: "#10b981" }}>{dailySummary.presentCount} Present</span>
                <span style={{ color: "var(--text-subtle)", margin: "0 6px" }}>•</span>
                <span style={{ color: "#ef4444" }}>{dailySummary.absentCount} Absent</span>
                <span style={{ color: "var(--text-subtle)", margin: "0 6px" }}>•</span>
                <span style={{ color: "#f59e0b" }}>{dailySummary.halfDayCount} Half-Day</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {dailySummary.unmarkedCount > 0 ? `${dailySummary.unmarkedCount} unmarked today` : "All records updated"}
              </div>
            </div>

            {/* Card 3: Monthly Net Payout */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Monthly Net Salary Payout ({selectedMonth})
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0070f3" }}>
                {fmt(payrollSummary.totalNet)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Total Basic: {fmt(payrollSummary.totalGross)}
              </div>
            </div>

            {/* Card 4: Payout Status */}
            <div className="card" style={{ padding: "16px", background: "var(--card-bg)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                Salary Disbursed vs Pending
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>
                <span style={{ color: "#10b981" }}>{fmt(payrollSummary.totalPaid)} Paid</span>
                <span style={{ color: "var(--text-subtle)", margin: "0 6px" }}>/</span>
                <span style={{ color: "#f59e0b" }}>{fmt(payrollSummary.totalPending)} Pending</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
                {payrollSummary.paidCount} of {payrollSummary.totalEmployees} staff paid
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
        {[
          { id: "attendance", label: isScoped ? "My Attendance" : "Attendance (Absentees & Presentees)" },
          { id: "payroll", label: isScoped ? "My Salary & Payslips" : "Salary & Monthly Payroll" },
          { id: "employees", label: isScoped ? "My Profile & Compensation" : "Employee Directory & Salary Setup", count: isScoped ? undefined : employees.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as HrTab)}
            className="btn btn-sm"
            style={{
              background: activeTab === tab.id ? "#0070f3" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "var(--text-muted)",
              fontWeight: activeTab === tab.id ? 700 : 500,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  background: activeTab === tab.id ? "rgba(255,255,255,0.25)" : "var(--border-color)",
                  color: activeTab === tab.id ? "#ffffff" : "var(--text-main)",
                  fontSize: "0.68rem",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────
         TAB 1: ATTENDANCE (DAILY SHEET & GITHUB-STYLE DOT MATRIX)
         ───────────────────────────────────────────── */}
      {activeTab === "attendance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Controls Bar */}
          <div className="glass-card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            {/* View Switch */}
            <div style={{ display: "flex", background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "8px", overflow: "hidden" }}>
              <button
                onClick={() => setAttendanceView("daily")}
                className="btn btn-sm"
                style={{ borderRadius: 0, background: attendanceView === "daily" ? "#0070f3" : "transparent", color: attendanceView === "daily" ? "#fff" : "var(--text-muted)", fontWeight: 700 }}
              >
                Daily Sheet
              </button>
              <button
                onClick={() => setAttendanceView("monthly")}
                className="btn btn-sm"
                style={{ borderRadius: 0, background: attendanceView === "monthly" ? "#0070f3" : "transparent", color: attendanceView === "monthly" ? "#fff" : "var(--text-muted)", fontWeight: 700 }}
              >
                Monthly Activity Matrix
              </button>
            </div>

            {/* Date Pickers & Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {attendanceView === "daily" ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Date:</label>
                    <input
                      type="date"
                      className="form-input"
                      style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  {!isScoped && (
                    <button
                      onClick={handleMarkAllPresent}
                      disabled={saving}
                      className="btn btn-secondary btn-sm"
                      style={{ color: "#10b981", borderColor: "#10b981", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      Mark All Present
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Month:</label>
                  <input
                    type="month"
                    className="form-input"
                    style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* View 1: Daily Attendance Table */}
          {attendanceView === "daily" && (
            <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Designation</th>
                      <th>Department</th>
                      <th>Attendance Status</th>
                      <th>Check-In</th>
                      <th>Check-Out</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyAttendance.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No staff records found</td></tr>
                    ) : dailyAttendance.map((emp) => {
                      const badge = statusBadgeStyle[emp.status] || statusBadgeStyle.UNMARKED;
                      return (
                        <tr key={emp.employeeId}>
                          <td style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.875rem" }}>
                            {emp.employeeName}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{emp.designation}</td>
                          <td>
                            <span className="badge" style={{ background: "rgba(0, 112, 243, 0.1)", color: "#0070f3", fontSize: "0.7rem" }}>
                              {emp.department}
                            </span>
                          </td>
                          <td>
                            {isScoped ? (
                              <span
                                className="badge"
                                style={{
                                  background: badge.bg,
                                  color: badge.color,
                                  fontWeight: 700,
                                  padding: "4px 10px",
                                }}
                              >
                                {badge.label}
                              </span>
                            ) : (
                              <div style={{ display: "flex", gap: "4px" }}>
                                {[
                                  { id: "PRESENT", label: "P (Present)", color: "#10b981" },
                                  { id: "ABSENT", label: "A (Absent)", color: "#ef4444" },
                                  { id: "HALF_DAY", label: "HD (Half)", color: "#f59e0b" },
                                  { id: "ON_LEAVE", label: "L (Leave)", color: "#0070f3" },
                                ].map((st) => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => handleUpdateDailyStatus(emp.employeeId, st.id, emp.checkIn, emp.checkOut, emp.remarks)}
                                    className="btn btn-sm"
                                    style={{
                                      fontSize: "0.7rem",
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                      fontWeight: emp.status === st.id ? 800 : 500,
                                      background: emp.status === st.id ? st.color : "transparent",
                                      color: emp.status === st.id ? "#ffffff" : "var(--text-muted)",
                                      border: `1px solid ${emp.status === st.id ? st.color : "var(--border-color)"}`,
                                    }}
                                  >
                                    {st.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            {isScoped ? (
                              <span style={{ fontSize: "0.8rem", color: "var(--text-main)" }}>{emp.checkIn || "09:30 AM"}</span>
                            ) : (
                              <input
                                type="text"
                                className="form-input"
                                style={{ width: "90px", padding: "3px 6px", fontSize: "0.75rem" }}
                                placeholder="09:30 AM"
                                defaultValue={emp.checkIn}
                                onBlur={(e) => handleUpdateDailyStatus(emp.employeeId, emp.status === "UNMARKED" ? "PRESENT" : emp.status, e.target.value, emp.checkOut, emp.remarks)}
                              />
                            )}
                          </td>
                          <td>
                            {isScoped ? (
                              <span style={{ fontSize: "0.8rem", color: "var(--text-main)" }}>{emp.checkOut || "06:30 PM"}</span>
                            ) : (
                              <input
                                type="text"
                                className="form-input"
                                style={{ width: "90px", padding: "3px 6px", fontSize: "0.75rem" }}
                                placeholder="06:30 PM"
                                defaultValue={emp.checkOut}
                                onBlur={(e) => handleUpdateDailyStatus(emp.employeeId, emp.status === "UNMARKED" ? "PRESENT" : emp.status, emp.checkIn, e.target.value, emp.remarks)}
                              />
                            )}
                          </td>
                          <td>
                            {isScoped ? (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{emp.remarks || "—"}</span>
                            ) : (
                              <input
                                type="text"
                                className="form-input"
                                style={{ width: "160px", padding: "3px 6px", fontSize: "0.75rem" }}
                                placeholder="Optional remarks..."
                                defaultValue={emp.remarks}
                                onBlur={(e) => handleUpdateDailyStatus(emp.employeeId, emp.status === "UNMARKED" ? "PRESENT" : emp.status, emp.checkIn, emp.checkOut, e.target.value)}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View 2: GITHUB-STYLE HEAT & DOT MATRIX TABLE */}
          {attendanceView === "monthly" && (
            <div className="glass-card" style={{ padding: "16px", overflow: "hidden" }}>
              {/* Header with Title & Legend */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                    Monthly Attendance Activity Matrix ({selectedMonth})
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                    GitHub-style daily check-in activity overview. Hover over dots to view day status.
                  </p>
                </div>

                {/* Matrix Legend */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "0.75rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#10b981", display: "inline-block" }} />
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Present</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#ef4444", display: "inline-block" }} />
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Absent</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#f59e0b", display: "inline-block" }} />
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Half Day</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#0070f3", display: "inline-block" }} />
                    <span style={{ fontWeight: 600, color: "var(--text-main)" }}>Leave</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--border-color)", border: "1px solid rgba(255,255,255,0.1)", display: "inline-block" }} />
                    <span>Unmarked</span>
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table" style={{ fontSize: "0.75rem", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth: "160px", textAlign: "left" }}>Staff Member</th>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                        <th key={d} style={{ textAlign: "center", padding: "4px 2px", minWidth: "22px", fontSize: "0.7rem" }}>
                          {d}
                        </th>
                      ))}
                      <th style={{ textAlign: "center", color: "#10b981", minWidth: "36px" }}>P</th>
                      <th style={{ textAlign: "center", color: "#ef4444", minWidth: "36px" }}>A</th>
                      <th style={{ textAlign: "center", color: "#f59e0b", minWidth: "36px" }}>HD</th>
                      <th style={{ textAlign: "center", color: "#0070f3", minWidth: "50px" }}>Payable</th>
                      <th style={{ textAlign: "center", minWidth: "50px" }}>% Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyMatrix.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonth + 6} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                          No matrix data recorded for {selectedMonth}
                        </td>
                      </tr>
                    ) : (
                      monthlyMatrix.map((m) => (
                        <tr key={m.employeeId}>
                          <td style={{ fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap" }}>
                            {m.employeeName}
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 500 }}>
                              {m.designation} · {m.department}
                            </div>
                          </td>
                          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                            const st = m.days[d] || "UNMARKED";
                            let bg = "var(--border-color)";
                            let border = "1px solid rgba(255,255,255,0.08)";
                            let statusTitle = `Day ${d}: Unmarked`;

                            if (st === "PRESENT") {
                              bg = "#10b981";
                              border = "1px solid #059669";
                              statusTitle = `Day ${d}: Present`;
                            } else if (st === "ABSENT") {
                              bg = "#ef4444";
                              border = "1px solid #dc2626";
                              statusTitle = `Day ${d}: Absent`;
                            } else if (st === "HALF_DAY") {
                              bg = "#f59e0b";
                              border = "1px solid #d97706";
                              statusTitle = `Day ${d}: Half Day`;
                            } else if (st === "ON_LEAVE") {
                              bg = "#0070f3";
                              border = "1px solid #0284c7";
                              statusTitle = `Day ${d}: On Leave`;
                            }

                            return (
                              <td key={d} style={{ textAlign: "center", padding: "4px 2px" }}>
                                <span
                                  title={statusTitle}
                                  style={{
                                    display: "inline-block",
                                    width: "16px",
                                    height: "16px",
                                    borderRadius: "4px",
                                    background: bg,
                                    border,
                                    cursor: "pointer",
                                    transition: "transform 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.3)")}
                                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                                />
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "center", fontWeight: 800, color: "#10b981" }}>{m.present}</td>
                          <td style={{ textAlign: "center", fontWeight: 800, color: "#ef4444" }}>{m.absent}</td>
                          <td style={{ textAlign: "center", fontWeight: 800, color: "#f59e0b" }}>{m.halfDay}</td>
                          <td style={{ textAlign: "center", fontWeight: 800, color: "#0070f3" }}>{m.payableDays}</td>
                          <td style={{ textAlign: "center", fontWeight: 700 }}>{m.attendanceRate}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 2: SALARY & MONTHLY PAYROLL MANAGEMENT
         ───────────────────────────────────────────── */}
      {activeTab === "payroll" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Controls Bar */}
          <div className="glass-card" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Payroll Month:</label>
              <input
                type="month"
                className="form-input"
                style={{ fontSize: "0.8rem", padding: "4px 8px" }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>

            {!isScoped && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleComputeAndSavePayroll}
                  disabled={saving}
                  className="btn btn-primary btn-sm"
                  style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                  {saving ? "Calculating..." : "Sync & Calculate Monthly Payroll"}
                </button>
              </div>
            )}
          </div>

          {/* Payroll Table */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Employee Name</th>
                    <th>Designation &amp; Dept</th>
                    <th style={{ textAlign: "center" }}>Paid / Total Days</th>
                    <th style={{ textAlign: "right" }}>Basic Salary (₹)</th>
                    <th style={{ textAlign: "right", color: "#ef4444" }}>Absent Ded. (₹)</th>
                    <th style={{ textAlign: "right", color: "#f59e0b" }}>PF Ded. (₹)</th>
                    <th style={{ textAlign: "right", color: "#0070f3" }}>Net Take-Home (₹)</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollItems.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No payroll records found for {selectedMonth}</td></tr>
                  ) : payrollItems.map((p) => (
                    <tr key={p.employeeId}>
                      <td style={{ fontWeight: 700, color: "#0070f3", fontSize: "0.75rem", fontFamily: "monospace" }}>
                        {p.employeeCode}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.875rem" }}>
                        {p.employeeName}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {p.designation} <span style={{ opacity: 0.6 }}>({p.department})</span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>
                        <span style={{ color: "#10b981" }}>{p.paidDays}</span> / {p.workingDays}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(p.basicSalary)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: p.absentDeduction > 0 ? "#ef4444" : "var(--text-muted)" }}>
                        {p.absentDeduction > 0 ? `-₹${p.absentDeduction.toLocaleString("en-IN")}` : "₹0"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: p.pfDeduction > 0 ? "#f59e0b" : "var(--text-muted)" }}>
                        {p.pfDeduction > 0 ? `-₹${p.pfDeduction.toLocaleString("en-IN")}` : "₹0"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#0070f3", fontSize: "0.9rem" }}>
                        {fmt(p.netSalary)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isScoped ? (
                          <span
                            className="badge"
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background: p.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: p.paymentStatus === "PAID" ? "#10b981" : "#f59e0b",
                              border: `1px solid ${p.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                            }}
                          >
                            {p.paymentStatus === "PAID" ? "PAID ✓" : "PENDING"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTogglePaymentStatus(p.employeeId, p.paymentStatus)}
                            className="btn btn-sm"
                            style={{
                              padding: "2px 8px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              background: p.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: p.paymentStatus === "PAID" ? "#10b981" : "#f59e0b",
                              border: `1px solid ${p.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                            }}
                            title="Click to toggle Paid / Pending"
                          >
                            {p.paymentStatus === "PAID" ? "PAID ✓" : "PENDING"}
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDownloadPayslip(p)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "0.725rem", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, color: "#10b981", borderColor: "#10b981" }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                          Download Payslip PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         TAB 3: EMPLOYEE DIRECTORY & COMPENSATION SETUP
         ───────────────────────────────────────────── */}
      {activeTab === "employees" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Emp Code</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th style={{ textAlign: "right" }}>Basic Salary (₹)</th>
                    <th style={{ textAlign: "right", color: "#f59e0b" }}>PF Ded. (₹)</th>
                    <th style={{ textAlign: "right", color: "#10b981" }}>Net Monthly (₹)</th>
                    <th>Bank Details</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                    {!isScoped && <th style={{ textAlign: "right" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No staff profiles found</td></tr>
                  ) : employees.map((emp) => {
                    const prof = emp.profile;
                    const basic = Number(prof?.basicSalary !== undefined && prof?.basicSalary !== null ? prof.basicSalary : 30000);
                    const pf = prof?.pfDeduction !== undefined && prof?.pfDeduction !== null ? Number(prof.pfDeduction) : 0;
                    const tax = Number(prof?.taxDeduction || 0);
                    const net = Math.max(0, basic - pf - tax);
                    return (
                      <tr key={emp.id}>
                        <td style={{ fontWeight: 700, color: "#0070f3", fontSize: "0.75rem", fontFamily: "monospace" }}>
                          {prof?.employeeCode || `SV-EMP`}
                        </td>
                        <td style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "0.875rem" }}>
                          {emp.name}
                        </td>
                        <td>
                          <span className="badge" style={{ background: "rgba(0, 112, 243, 0.1)", color: "#0070f3", fontSize: "0.7rem", fontWeight: 700 }}>
                            {prof?.department || "Operations"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontWeight: 600 }}>{prof?.designation || "Staff"}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(basic)}</td>
                        <td style={{ textAlign: "right", color: "#f59e0b", fontWeight: 600 }}>-₹{pf.toLocaleString("en-IN")}</td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#10b981" }}>{fmt(net)}</td>
                        <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {prof?.bankName ? `${prof.bankName} - ${prof.bankAccountNo ? `...${prof.bankAccountNo.slice(-4)}` : ""}` : "Not Added"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", fontSize: "0.7rem" }}>
                            {prof?.status || "ACTIVE"}
                          </span>
                        </td>
                        {!isScoped && (
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEmployeeForm({
                                  employeeId: emp.id,
                                  name: emp.name,
                                  employeeCode: prof?.employeeCode || `SV-EMP`,
                                  designation: prof?.designation || "Operations Manager",
                                  department: prof?.department || "Operations",
                                  dateOfJoining: prof?.dateOfJoining ? new Date(prof.dateOfJoining).toISOString().slice(0, 10) : "",
                                  phone: prof?.phone || "",
                                  email: prof?.email || "",
                                  panNo: prof?.panNo || "",
                                  bankName: prof?.bankName || "",
                                  bankAccountNo: prof?.bankAccountNo || "",
                                  ifscCode: prof?.ifscCode || "",
                                  basicSalary: basic,
                                  pfEnabled: pf > 0,
                                  pfDeduction: pf,
                                  taxDeduction: tax,
                                  status: prof?.status || "ACTIVE",
                                });
                                setShowEmployeeModal(true);
                              }}
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            >
                              Edit Setup
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────
         EMPLOYEE SETUP & SALARY MODAL (Admin Only)
         ───────────────────────────────────────────── */}
      {!isScoped && showEmployeeModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowEmployeeModal(false)}>
          <div className="modal-content" style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--text-main)", margin: 0 }}>
                {employeeForm.employeeId ? "Edit Staff & Compensation Profile" : "Add New Staff Member"}
              </h2>
              <button onClick={() => setShowEmployeeModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Personal & Employment Details */}
              <div className="glass-card" style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Employee Name *</label>
                  <input
                    className="form-input"
                    value={employeeForm.name}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Employee Code</label>
                  <input
                    className="form-input"
                    value={employeeForm.employeeCode}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })}
                    placeholder="e.g. SV-EMP-001"
                  />
                </div>

                {/* Department Dropdown */}
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Department *</label>
                  <select
                    className="form-input"
                    value={employeeForm.department}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                    required
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Designation Dropdown */}
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Designation *</label>
                  <select
                    className="form-input"
                    value={employeeForm.designation}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                    required
                  >
                    {DESIGNATIONS.map((desig) => (
                      <option key={desig} value={desig}>{desig}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Phone Number</label>
                  <input
                    className="form-input"
                    value={employeeForm.phone}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>PAN Number</label>
                  <input
                    className="form-input"
                    value={employeeForm.panNo}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, panNo: e.target.value })}
                    placeholder="ABCDE1234F"
                  />
                </div>
              </div>

              {/* Bank Transfer Details */}
              <div className="glass-card" style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Bank Name</label>
                  <input
                    className="form-input"
                    value={employeeForm.bankName}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Account Number</label>
                  <input
                    className="form-input"
                    value={employeeForm.bankAccountNo}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, bankAccountNo: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>IFSC Code</label>
                  <input
                    className="form-input"
                    value={employeeForm.ifscCode}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, ifscCode: e.target.value })}
                    placeholder="HDFC0001234"
                  />
                </div>
              </div>

              {/* Monthly Salary & Statutory PF Structure */}
              <div className="glass-card" style={{ padding: "14px" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)", marginBottom: "10px", textTransform: "uppercase" }}>
                  Monthly Salary &amp; Statutory PF Setup (INR ₹)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Basic Salary (₹) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={employeeForm.basicSalary}
                      onChange={(e) => {
                        const newBase = Number(e.target.value);
                        setEmployeeForm({
                          ...employeeForm,
                          basicSalary: newBase,
                          pfDeduction: employeeForm.pfEnabled ? Math.round(newBase * 0.12) : 0,
                        });
                      }}
                      required
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase" }}>PF Deduction (₹)</label>
                      <label style={{ fontSize: "0.7rem", color: "#0070f3", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                          type="checkbox"
                          checked={employeeForm.pfEnabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setEmployeeForm({
                              ...employeeForm,
                              pfEnabled: enabled,
                              pfDeduction: enabled ? Math.round(Number(employeeForm.basicSalary) * 0.12) : 0,
                            });
                          }}
                        />
                        12% Statutory PF
                      </label>
                    </div>
                    <input
                      type="number"
                      className="form-input"
                      value={employeeForm.pfDeduction}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setEmployeeForm({
                          ...employeeForm,
                          pfDeduction: val,
                          pfEnabled: val > 0,
                        });
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-subtle)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>TDS / Professional Tax (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={employeeForm.taxDeduction}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, taxDeduction: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "12px", padding: "10px 14px", background: "var(--card-bg)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Net Monthly Take-Home:</span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#10b981" }}>
                    ₹{Math.max(0, Number(employeeForm.basicSalary) - Number(employeeForm.pfDeduction) - Number(employeeForm.taxDeduction)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setShowEmployeeModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm" style={{ fontWeight: 700 }}>
                  {saving ? "Saving..." : "Save Profile & Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
