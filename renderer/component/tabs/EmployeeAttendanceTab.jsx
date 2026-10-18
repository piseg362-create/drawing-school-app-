"use client";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  subDays,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../component/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../component/ui/dialog";
import {
  Check,
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  Car,
  Search,
  History,
  CheckCheck,
  RotateCcw,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  Briefcase,
  Phone,
  FileSpreadsheet,
  CalendarDays,
  MessageSquare,
  Sun,
  Coffee,
  Calculator,
  DollarSign,
} from "lucide-react";
import { PayrollCalculatorModal } from "./PayrollCalculatorModal";
import { AddExtraPaymentModal } from "./AddExtraPaymentModal";

export function EmployeeAttendanceTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Mode: "daily" or "monthly"
  const [viewMode, setViewMode] = useState("daily");

  // Selected date for daily view
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Selected month for monthly matrix view (Date object initialized to current month)
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL"); // ALL, INSTRUCTOR, RECEPTION
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PRESENT, ABSENT, HALF_DAY, LEAVE, NOT_TAKEN

  // Modals state
  const [historyEmployee, setHistoryEmployee] = useState(null); // Employee object for history modal
  const [historyMonth, setHistoryMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedPayrollEmployee, setSelectedPayrollEmployee] = useState(null);
  const [extraPaymentEmployee, setExtraPaymentEmployee] = useState(null);

  const [noteModal, setNoteModal] = useState({
    open: false,
    instructorId: null,
    employeeName: "",
    note: "",
    status: "PRESENT",
  });

  const dateKey = format(selectedDate, "yyyy-MM-dd");
  const monthKey = format(selectedMonth, "yyyy-MM");

  // 1. Fetch Daily Employee Attendance
  const {
    data: dailyData = { data: [], stats: {} },
    isLoading: isDailyLoading,
  } = useQuery({
    queryKey: ["employee-attendance", dateKey, roleFilter],
    queryFn: async () => {
      let url = `/employee-attendance?date=${dateKey}`;
      if (roleFilter !== "ALL") {
        url += `&jobType=${roleFilter}`;
      }
      const res = await fetchApi(url);
      const json = await res.json();
      if (json && json.status) {
        return json;
      }
      return { data: [], stats: {} };
    },
    enabled: viewMode === "daily",
  });

  // 2. Fetch Monthly Matrix Attendance
  const {
    data: monthlyData = { data: { instructors: [], matrix: {}, statsByInstructor: {}, daysInMonth: 31 } },
    isLoading: isMonthlyLoading,
  } = useQuery({
    queryKey: ["employee-monthly-matrix", monthKey],
    queryFn: async () => {
      const res = await fetchApi(`/employee-monthly-attendance-matrix?month=${monthKey}`);
      const json = await res.json();
      if (json && json.status) {
        return json;
      }
      return { data: { instructors: [], matrix: {}, statsByInstructor: {}, daysInMonth: 31 } };
    },
    enabled: viewMode === "monthly",
  });

  // 3. Fetch Single Employee History (Modal)
  const { data: employeeSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["employee-attendance-summary", historyEmployee?.id, historyMonth],
    queryFn: async () => {
      if (!historyEmployee?.id) return null;
      let url = `/employee-attendance-summary?instructorId=${historyEmployee.id}`;
      if (historyMonth) {
        url += `&month=${historyMonth}`;
      }
      const res = await fetchApi(url);
      const json = await res.json();
      return json && json.status ? json.data : null;
    },
    enabled: !!historyEmployee?.id,
  });

  // 4. Mark Single Employee Attendance Mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ instructorId, status, employeeName, note }) => {
      const res = await fetchApi("/mark-employee-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorId,
          date: dateKey,
          status,
          note,
        }),
      });
      const data = await res.json();
      if (!data.status) throw new Error(data.message || "Failed to mark attendance");
      return { data, employeeName, status };
    },
    onSuccess: ({ employeeName, status }) => {
      queryClient.invalidateQueries({ queryKey: ["employee-attendance", dateKey] });
      queryClient.invalidateQueries({ queryKey: ["employee-monthly-matrix", monthKey] });
      if (historyEmployee) {
        queryClient.invalidateQueries({
          queryKey: ["employee-attendance-summary", historyEmployee.id],
        });
      }

      if (status === "PRESENT") {
        toast.success(`✓ Marked Present: ${employeeName}`);
      } else if (status === "ABSENT") {
        toast.error(`✗ Marked Absent: ${employeeName}`);
      } else if (status === "HALF_DAY") {
        toast.warning(`⏳ Marked Half Day: ${employeeName}`);
      } else if (status === "LEAVE") {
        toast.info(`🏖️ Marked Leave: ${employeeName}`);
      } else {
        toast.info(`Attendance reset for ${employeeName}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update employee attendance");
    },
  });

  // 5. Mark All Present Mutation
  const markAllMutation = useMutation({
    mutationFn: async (instructorIds) => {
      const res = await fetchApi("/mark-all-employees-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorIds,
          date: dateKey,
          status: "PRESENT",
        }),
      });
      const data = await res.json();
      if (!data.status) throw new Error(data.message || "Failed to mark all staff present");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employee-attendance", dateKey] });
      queryClient.invalidateQueries({ queryKey: ["employee-monthly-matrix", monthKey] });
      toast.success(data.message || "All staff marked Present!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to mark all staff present");
    },
  });

  // Filtered employees for daily list
  const dailyEmployees = dailyData.data || [];
  const stats = dailyData.stats || {
    total: 0,
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    notTaken: 0,
    rate: 0,
  };

  const filteredEmployees = useMemo(() => {
    return dailyEmployees.filter((emp) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        emp.name?.toLowerCase().includes(search) ||
        emp.mobile?.includes(search) ||
        emp.car?.toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PRESENT" && emp.status === "PRESENT") ||
        (statusFilter === "ABSENT" && emp.status === "ABSENT") ||
        (statusFilter === "HALF_DAY" && emp.status === "HALF_DAY") ||
        (statusFilter === "LEAVE" && emp.status === "LEAVE") ||
        (statusFilter === "NOT_TAKEN" && (emp.status === "NOT_TAKEN" || !emp.status));

      return matchesSearch && matchesStatus;
    });
  }, [dailyEmployees, searchTerm, statusFilter]);

  // Dynamic Avatar Colors
  const getAvatarColor = (name = "") => {
    const colors = [
      "bg-orange-500",
      "bg-blue-500",
      "bg-emerald-500",
      "bg-purple-500",
      "bg-rose-500",
      "bg-amber-500",
      "bg-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Status Badge UI helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t("Present")}
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400">
            <XCircle className="w-3.5 h-3.5" />
            {t("Absent")}
          </span>
        );
      case "HALF_DAY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            {t("Half Day")}
          </span>
        );
      case "LEAVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
            <Coffee className="w-3.5 h-3.5" />
            {t("On Leave")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <AlertCircle className="w-3.5 h-3.5" />
            {t("Not Marked")}
          </span>
        );
    }
  };

  // Export Daily Report to PDF
  const exportDailyPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Daily Employee Attendance Report", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Date: ${format(selectedDate, "EEEE, MMMM d, yyyy")}`, 14, 28);
      doc.text(
        `Total Staff: ${stats.total} | Present: ${stats.present} | Absent: ${stats.absent} | Half Day: ${stats.halfDay} | Leave: ${stats.leave} | Rate: ${stats.rate}%`,
        14,
        34
      );

      const tableColumn = ["Staff Name", "Mobile", "Role", "Vehicle", "Status", "Note"];
      const tableRows = filteredEmployees.map((emp) => [
        emp.name,
        emp.mobile || "-",
        emp.jobType,
        emp.car || "None",
        emp.status || "NOT_TAKEN",
        emp.note || "-",
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 42,
        theme: "grid",
        headStyles: { fillColor: [193, 85, 44] }, // School desk theme color
      });

      doc.save(`Employee_Attendance_${dateKey}.pdf`);
      toast.success("Daily attendance PDF exported successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    }
  };

  // Export Daily to CSV (Excel compatible)
  const exportDailyCSV = () => {
    try {
      const headers = ["Employee Name,Mobile,Role,Vehicle,Status,Note"];
      const rows = filteredEmployees.map((emp) => {
        const safeName = `"${(emp.name || "").replace(/"/g, '""')}"`;
        const safeMobile = `"${(emp.mobile || "").replace(/"/g, '""')}"`;
        const safeRole = `"${(emp.jobType || "").replace(/"/g, '""')}"`;
        const safeCar = `"${(emp.car || "None").replace(/"/g, '""')}"`;
        const safeStatus = `"${(emp.status || "NOT_TAKEN").replace(/"/g, '""')}"`;
        const safeNote = `"${(emp.note || "").replace(/"/g, '""')}"`;
        return `${safeName},${safeMobile},${safeRole},${safeCar},${safeStatus},${safeNote}`;
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Employee_Attendance_${dateKey}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("CSV file downloaded successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export CSV");
    }
  };

  // Export Monthly Register to PDF
  const exportMonthlyPDF = () => {
    try {
      const { instructors = [], matrix = {}, statsByInstructor = {}, daysInMonth = 31 } =
        monthlyData.data || {};

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`Monthly Employee Attendance Register - ${format(selectedMonth, "MMMM yyyy")}`, 14, 18);

      const daysHeaders = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      const headers = [["Employee", "Role", ...daysHeaders, "P", "A", "H", "L", "Rate%", "Earned Pay"]];

      const rows = instructors.map((inst) => {
        const instMatrix = matrix[inst.id] || {};
        const s = statsByInstructor[inst.id] || { present: 0, absent: 0, halfDay: 0, leave: 0, rate: 0 };

        const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const status = instMatrix[dayNum]?.status;
          if (status === "PRESENT") return "P";
          if (status === "ABSENT") return "A";
          if (status === "HALF_DAY") return "H";
          if (status === "LEAVE") return "L";
          return "-";
        });

        const effDays = s.present + s.halfDay * 0.5;
        const baseSal = Number(inst.payment) || 0;
        const dRate = daysInMonth > 0 ? baseSal / daysInMonth : 0;
        const earnedSal = Math.round(effDays * dRate);

        return [
          inst.name,
          inst.jobType === "INSTRUCTOR" ? "Inst" : "Recep",
          ...dayCells,
          s.present,
          s.absent,
          s.halfDay,
          s.leave,
          `${s.rate}%`,
          `Rs. ${earnedSal}`,
        ];
      });

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 25,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 1, halign: "center" },
        headStyles: { fillColor: [193, 85, 44], textColor: 255 },
        columnStyles: {
          0: { halign: "left", cellWidth: 28 },
          1: { halign: "center", cellWidth: 14 },
        },
      });

      doc.save(`Monthly_Attendance_${monthKey}.pdf`);
      toast.success("Monthly attendance register exported!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export monthly PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with View Mode Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1e222d] p-5 rounded-2xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-colors duration-300">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] flex items-center gap-2">
            <span>👔</span>
            <span>{t("Employee & Staff Attendance")}</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">
            {t("Track daily attendance, leaves, half-days, and monthly attendance sheets")}
          </p>
        </div>

        {/* View Mode Switcher Pill */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-[#151922] rounded-xl border border-gray-200/80 dark:border-[#2c3242]">
            <button
              type="button"
              onClick={() => setViewMode("daily")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "daily"
                  ? "bg-white dark:bg-[#2c3242] text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5 text-[#c1552c]" />
              <span>{t("Daily Attendance")}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("monthly")}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "monthly"
                  ? "bg-white dark:bg-[#2c3242] text-gray-900 dark:text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#128C7E]" />
              <span>{t("Monthly Register")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mode-Specific Date Navigator & Actions Bar */}
      {viewMode === "daily" ? (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
          {/* Day Date Navigator */}
          <div className="flex items-center bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-xl px-3 py-1.5 text-gray-900 dark:text-[#f2e9de] transition-colors shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded-md transition-colors font-bold text-sm"
              title="Previous Day"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="font-semibold text-sm hover:text-[#c1552c] transition-colors flex items-center gap-2 px-3"
              title="Click to jump to Today"
            >
              <CalendarIcon className="w-4 h-4 text-[#c1552c]" />
              <span>
                {isToday(selectedDate)
                  ? `Today, ${format(selectedDate, "MMM d, yyyy")}`
                  : format(selectedDate, "EEE, MMM d, yyyy")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded-md transition-colors font-bold text-sm"
              title="Next Day"
            >
              &gt;
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={dailyEmployees.length === 0 || markAllMutation.isPending}
              onClick={() => {
                const ids = dailyEmployees.map((e) => e.id);
                markAllMutation.mutate(ids);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{t("Mark All Present")}</span>
            </button>

            <button
              type="button"
              onClick={exportDailyPDF}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t("PDF Report")}</span>
            </button>

            <button
              type="button"
              onClick={exportDailyCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#2c3242] dark:hover:bg-[#353c4f] text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>{t("CSV / Excel")}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Monthly Register Header Bar */
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
          {/* Month Navigator */}
          <div className="flex items-center bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-xl px-3 py-1.5 text-gray-900 dark:text-[#f2e9de] transition-colors shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedMonth((prev) => subMonths(prev, 1))}
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded-md transition-colors font-bold text-sm"
              title="Previous Month"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth(new Date())}
              className="font-semibold text-sm hover:text-[#c1552c] transition-colors flex items-center gap-2 px-3"
              title="Click to jump to Current Month"
            >
              <CalendarDays className="w-4 h-4 text-[#c1552c]" />
              <span>{format(selectedMonth, "MMMM yyyy")}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded-md transition-colors font-bold text-sm"
              title="Next Month"
            >
              &gt;
            </button>
          </div>

          {/* Export Monthly */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportMonthlyPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t("Export Monthly Register (PDF)")}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Daily Stats Cards Bar */}
      {viewMode === "daily" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Staff */}
          <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-xs">
            <p className="text-[11px] font-bold text-gray-500 dark:text-[#8a8d96] uppercase tracking-wider">
              {t("Total Staff")}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {stats.total}
              </span>
              <span className="text-xs text-gray-400 font-semibold">{t("Employees")}</span>
            </div>
          </div>

          {/* Present */}
          <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-xs">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              {t("Present")}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.present}
              </span>
              <span className="text-xs text-emerald-500/80 font-semibold">
                {stats.total > 0 ? `${Math.round((stats.present / stats.total) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Absent */}
          <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-xs">
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <X className="w-3.5 h-3.5" />
              {t("Absent")}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {stats.absent}
              </span>
              <span className="text-xs text-rose-500/80 font-semibold">
                {stats.total > 0 ? `${Math.round((stats.absent / stats.total) * 100)}%` : "0%"}
              </span>
            </div>
          </div>

          {/* Half Day */}
          <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 shadow-xs">
            <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {t("Half Day")}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {stats.halfDay}
              </span>
              <span className="text-xs text-amber-500/80 font-semibold">{t("Staff")}</span>
            </div>
          </div>

          {/* Leave */}
          <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 shadow-xs">
            <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
              <Coffee className="w-3.5 h-3.5" />
              {t("On Leave")}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {stats.leave}
              </span>
              <span className="text-xs text-purple-500/80 font-semibold">{t("Approved")}</span>
            </div>
          </div>

          {/* Rate */}
          <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-xs">
            <p className="text-[11px] font-bold text-gray-500 dark:text-[#8a8d96] uppercase tracking-wider">
              {t("Attendance Rate")}
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-[#c1552c]">{stats.rate}%</span>
              <span className="text-xs text-gray-400 font-semibold">
                {stats.notTaken} {t("unmarked")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Daily Table View */}
      {viewMode === "daily" && (
        <div className="bg-white dark:bg-[#1e222d] rounded-2xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden">
          {/* Search & Filter Header inside card */}
          <div className="p-4 border-b border-gray-100 dark:border-[#2c3242] flex flex-col sm:flex-row gap-3 justify-between items-center bg-gray-50/50 dark:bg-[#171a22]/50">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t("Search employee by name, mobile...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-xl focus:outline-hidden focus:border-[#c1552c]"
              />
            </div>

            {/* Role and Status Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="text-xs bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 focus:outline-hidden"
              >
                <option value="ALL">{t("All Roles")}</option>
                <option value="INSTRUCTOR">{t("Instructors")}</option>
                <option value="RECEPTION">{t("Reception")}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] text-gray-700 dark:text-gray-300 rounded-xl px-3 py-2 focus:outline-hidden"
              >
                <option value="ALL">{t("All Statuses")}</option>
                <option value="PRESENT">{t("Present")}</option>
                <option value="ABSENT">{t("Absent")}</option>
                <option value="HALF_DAY">{t("Half Day")}</option>
                <option value="LEAVE">{t("On Leave")}</option>
                <option value="NOT_TAKEN">{t("Not Marked")}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-200 dark:border-[#2c3242] bg-gray-50 dark:bg-[#1a1d26]">
                  <TableHead className="w-[30%]">{t("Employee & Role")}</TableHead>
                  <TableHead className="w-[18%]">{t("Assigned Vehicle")}</TableHead>
                  <TableHead className="w-[15%] text-center">{t("Day Status")}</TableHead>
                  <TableHead className="w-[15%]">{t("Notes / Reason")}</TableHead>
                  <TableHead className="w-[22%] text-right">{t("Quick Attendance Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDailyLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-sm text-gray-500">
                      {t("Loading employee attendance...")}
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center text-gray-400">
                        <Briefcase className="w-10 h-10 mb-2 opacity-50" />
                        <p className="font-semibold">{t("No employees found")}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("Ensure employees are added in the Instructors section.")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className="border-gray-100 dark:border-[#2c3242]/50 hover:bg-gray-50/60 dark:hover:bg-[#252a38]/50 transition-colors"
                    >
                      {/* Employee Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full ${getAvatarColor(
                              emp.name
                            )} text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs`}
                          >
                            {emp.name?.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-[#f2e9de] text-sm capitalize">
                                {emp.name}
                              </span>
                              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                {emp.jobType === "INSTRUCTOR" ? "Instructor" : "Reception"}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {emp.mobile || "N/A"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Vehicle Assigned */}
                      <TableCell>
                        {emp.car ? (
                          <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            <Car className="w-3.5 h-3.5 text-orange-500" />
                            <span>{emp.car}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">None assigned</span>
                        )}
                      </TableCell>

                      {/* Day Status */}
                      <TableCell className="text-center">{renderStatusBadge(emp.status)}</TableCell>

                      {/* Note */}
                      <TableCell>
                        {emp.note ? (
                          <div
                            className="text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/80 px-2 py-1 rounded-md cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 max-w-[150px] truncate"
                            title={emp.note}
                            onClick={() =>
                              setNoteModal({
                                open: true,
                                instructorId: emp.id,
                                employeeName: emp.name,
                                note: emp.note || "",
                                status: emp.status || "PRESENT",
                              })
                            }
                          >
                            💬 {emp.note}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setNoteModal({
                                open: true,
                                instructorId: emp.id,
                                employeeName: emp.name,
                                note: "",
                                status: emp.status || "PRESENT",
                              })
                            }
                            className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-1"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{t("+ Note")}</span>
                          </button>
                        )}
                      </TableCell>

                      {/* Quick Attendance Action Buttons */}
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-[#171a22] p-1 rounded-xl border border-gray-200 dark:border-[#2c3242]">
                          {/* Present */}
                          <button
                            type="button"
                            title="Mark Present"
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                instructorId: emp.id,
                                status: "PRESENT",
                                employeeName: emp.name,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              emp.status === "PRESENT"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>P</span>
                          </button>

                          {/* Absent */}
                          <button
                            type="button"
                            title="Mark Absent"
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                instructorId: emp.id,
                                status: "ABSENT",
                                employeeName: emp.name,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              emp.status === "ABSENT"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>A</span>
                          </button>

                          {/* Half Day */}
                          <button
                            type="button"
                            title="Mark Half Day"
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                instructorId: emp.id,
                                status: "HALF_DAY",
                                employeeName: emp.name,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              emp.status === "HALF_DAY"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600"
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>H</span>
                          </button>

                          {/* Leave */}
                          <button
                            type="button"
                            title="Mark Leave"
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                instructorId: emp.id,
                                status: "LEAVE",
                                employeeName: emp.name,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              emp.status === "LEAVE"
                                ? "bg-purple-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600"
                            }`}
                          >
                            <Coffee className="w-3.5 h-3.5" />
                            <span>L</span>
                          </button>

                          {/* Reset */}
                          <button
                            type="button"
                            title="Reset / Clear Attendance"
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                instructorId: emp.id,
                                status: "NOT_TAKEN",
                                employeeName: emp.name,
                              })
                            }
                            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* History */}
                          <button
                            type="button"
                            title="View Staff Attendance History"
                            onClick={() => {
                              setHistoryEmployee(emp);
                              setHistoryMonth(format(selectedDate, "yyyy-MM"));
                            }}
                            className="p-1 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors ml-1"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Salary Calculator */}
                          <button
                            type="button"
                            title="Calculate Monthly Salary"
                            onClick={() => setSelectedPayrollEmployee(emp)}
                            className="p-1 rounded-lg text-[#c1552c] hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
                          >
                            <Calculator className="w-3.5 h-3.5" />
                          </button>

                          {/* Extra Payment / Advance */}
                          <button
                            type="button"
                            title="Record Advance or Extra Bonus"
                            onClick={() => setExtraPaymentEmployee(emp)}
                            className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 5. Monthly Matrix View */}
      {viewMode === "monthly" && (
        <div className="bg-white dark:bg-[#1e222d] rounded-2xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden p-5">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>📅</span>
                <span>
                  {t("Monthly Attendance Sheet")} - {format(selectedMonth, "MMMM yyyy")}
                </span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">
                {t("Legend")}:{" "}
                <span className="font-bold text-emerald-600">P = Present</span> |{" "}
                <span className="font-bold text-rose-600">A = Absent</span> |{" "}
                <span className="font-bold text-amber-600">H = Half Day</span> |{" "}
                <span className="font-bold text-purple-600">L = On Leave</span> |{" "}
                <span className="font-bold text-gray-400">- = Not Marked</span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-100 dark:border-[#2c3242] rounded-xl">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-[#171a22] text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-[#2c3242]">
                  <th className="p-2.5 text-left font-bold min-w-[140px] sticky left-0 bg-gray-100 dark:bg-[#171a22] z-10 border-r border-gray-200 dark:border-[#2c3242]">
                    {t("Staff Member")}
                  </th>
                  <th className="p-2 font-semibold min-w-[65px] border-r border-gray-200 dark:border-[#2c3242]">
                    {t("Role")}
                  </th>
                  {Array.from(
                    { length: monthlyData.data?.daysInMonth || 31 },
                    (_, i) => (
                      <th
                        key={i + 1}
                        className="p-1.5 font-bold min-w-[28px] border-r border-gray-200/60 dark:border-[#2c3242]/60"
                      >
                        {i + 1}
                      </th>
                    )
                  )}
                  <th className="p-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-l border-gray-200 dark:border-[#2c3242] min-w-[36px]">
                    P
                  </th>
                  <th className="p-2 font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/20 min-w-[36px]">
                    A
                  </th>
                  <th className="p-2 font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 min-w-[36px]">
                    H
                  </th>
                  <th className="p-2 font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/20 min-w-[36px]">
                    L
                  </th>
                  <th className="p-2 font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-[#1a1e28] min-w-[50px]">
                    Rate
                  </th>
                  <th className="p-2 font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 min-w-[100px]">
                    {t("Earned Pay")}
                  </th>
                  <th className="p-2 font-semibold text-gray-700 dark:text-gray-300 min-w-[80px]">
                    {t("Action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isMonthlyLoading ? (
                  <tr>
                    <td colSpan={40} className="py-12 text-center text-sm text-gray-500">
                      {t("Loading monthly sheet...")}
                    </td>
                  </tr>
                ) : monthlyData.data?.instructors?.length === 0 ? (
                  <tr>
                    <td colSpan={40} className="py-12 text-center text-sm text-gray-500">
                      {t("No active staff found for this month.")}
                    </td>
                  </tr>
                ) : (
                  monthlyData.data?.instructors?.map((inst) => {
                    const instMatrix = monthlyData.data?.matrix?.[inst.id] || {};
                    const instStats =
                      monthlyData.data?.statsByInstructor?.[inst.id] || {
                        present: 0,
                        absent: 0,
                        halfDay: 0,
                        leave: 0,
                        rate: 0,
                      };

                    return (
                      <tr
                        key={inst.id}
                        className="border-b border-gray-100 dark:border-[#2c3242]/50 hover:bg-gray-50/70 dark:hover:bg-[#252a38]/40 transition-colors"
                      >
                        {/* Employee Name */}
                        <td className="p-2.5 text-left font-bold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-[#1e222d] z-10 border-r border-gray-200 dark:border-[#2c3242]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-5 h-5 rounded-full ${getAvatarColor(
                                inst.name
                              )} text-white flex items-center justify-center text-[10px] uppercase font-bold`}
                            >
                              {inst.name.charAt(0)}
                            </span>
                            <span className="truncate max-w-[110px] capitalize">{inst.name}</span>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="p-2 text-[10px] text-gray-500 uppercase font-semibold border-r border-gray-200 dark:border-[#2c3242]">
                          {inst.jobType === "INSTRUCTOR" ? "Inst" : "Recep"}
                        </td>

                        {/* Day cells 1..daysInMonth */}
                        {Array.from(
                          { length: monthlyData.data?.daysInMonth || 31 },
                          (_, i) => {
                            const dayNum = i + 1;
                            const dayData = instMatrix[dayNum];
                            const status = dayData?.status;

                            let bg = "";
                            let text = "-";
                            let cellTitle = `Day ${dayNum}: Not Marked`;

                            if (status === "PRESENT") {
                              bg = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold";
                              text = "P";
                              cellTitle = `Day ${dayNum}: Present${dayData.note ? ` (${dayData.note})` : ""}`;
                            } else if (status === "ABSENT") {
                              bg = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold";
                              text = "A";
                              cellTitle = `Day ${dayNum}: Absent${dayData.note ? ` (${dayData.note})` : ""}`;
                            } else if (status === "HALF_DAY") {
                              bg = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold";
                              text = "H";
                              cellTitle = `Day ${dayNum}: Half Day${dayData.note ? ` (${dayData.note})` : ""}`;
                            } else if (status === "LEAVE") {
                              bg = "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-bold";
                              text = "L";
                              cellTitle = `Day ${dayNum}: On Leave${dayData.note ? ` (${dayData.note})` : ""}`;
                            }

                            return (
                              <td
                                key={dayNum}
                                title={cellTitle}
                                className={`p-1 border-r border-gray-100 dark:border-[#2c3242]/40 text-[11px] ${bg}`}
                              >
                                {text}
                              </td>
                            );
                          }
                        )}

                        {/* Total Counts */}
                        <td className="p-2 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/10 border-l border-gray-200 dark:border-[#2c3242]">
                          {instStats.present}
                        </td>
                        <td className="p-2 font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-950/10">
                          {instStats.absent}
                        </td>
                        <td className="p-2 font-bold text-amber-600 bg-amber-50/50 dark:bg-amber-950/10">
                          {instStats.halfDay}
                        </td>
                        <td className="p-2 font-bold text-purple-600 bg-purple-50/50 dark:bg-purple-950/10">
                          {instStats.leave}
                        </td>
                        <td className="p-2 font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-[#1a1e28]">
                          {instStats.rate}%
                        </td>

                        {/* Earned Salary based on days present */}
                        {(() => {
                          const effDays = instStats.present + instStats.halfDay * 0.5;
                          const baseSal = Number(inst.payment) || 0;
                          const dInMonth = monthlyData.data?.daysInMonth || 31;
                          const dRate = dInMonth > 0 ? baseSal / dInMonth : 0;
                          const earnedSal = Math.round(effDays * dRate);

                          return (
                            <>
                              <td className="p-2 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/10 text-xs">
                                <div>₹{earnedSal}</div>
                                <div className="text-[10px] text-gray-400 font-normal">/ ₹{baseSal}</div>
                              </td>
                              <td className="p-2">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPayrollEmployee(inst)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-900/50 text-[#c1552c] text-[11px] font-bold transition-colors shadow-2xs"
                                    title="Calculate & View Salary Slip"
                                  >
                                    <Calculator className="w-3 h-3" />
                                    <span>{t("Salary")}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExtraPaymentEmployee(inst)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold transition-colors shadow-2xs"
                                    title="Record Advance or Extra Bonus"
                                  >
                                    <DollarSign className="w-3 h-3" />
                                    <span>{t("+ Advance")}</span>
                                  </button>
                                </div>
                              </td>
                            </>
                          );
                        })()}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Note Modal Dialog */}
      <Dialog
        open={noteModal.open}
        onOpenChange={(open) => setNoteModal((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1e222d] border-gray-200 dark:border-[#2c3242]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#c1552c]" />
              <span>{t("Attendance Note / Reason")}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t("Staff Member")}</p>
              <p className="font-bold text-sm text-gray-900 dark:text-white">
                {noteModal.employeeName}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {t("Status for this note")}
              </label>
              <select
                value={noteModal.status}
                onChange={(e) =>
                  setNoteModal((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#151922] text-gray-900 dark:text-white focus:outline-hidden"
              >
                <option value="PRESENT">{t("Present")}</option>
                <option value="ABSENT">{t("Absent")}</option>
                <option value="HALF_DAY">{t("Half Day")}</option>
                <option value="LEAVE">{t("On Leave")}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {t("Note / Reason (e.g., Doctor appointment, Emergency leave, Late entry)")}
              </label>
              <textarea
                rows={3}
                value={noteModal.note}
                onChange={(e) =>
                  setNoteModal((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder={t("Enter attendance note or leave reason...")}
                className="w-full text-xs p-3 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#151922] text-gray-900 dark:text-white focus:outline-hidden focus:border-[#c1552c]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setNoteModal((prev) => ({ ...prev, open: false }))}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-[#2c3242] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                markAttendanceMutation.mutate({
                  instructorId: noteModal.instructorId,
                  status: noteModal.status,
                  employeeName: noteModal.employeeName,
                  note: noteModal.note,
                });
                setNoteModal((prev) => ({ ...prev, open: false }));
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#c1552c] hover:bg-[#a84723] text-white transition-colors"
            >
              {t("Save Note")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Employee Attendance History Modal */}
      <Dialog
        open={!!historyEmployee}
        onOpenChange={(open) => !open && setHistoryEmployee(null)}
      >
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#1e222d] border-gray-200 dark:border-[#2c3242] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center pr-6">
              <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-500" />
                <span>
                  {historyEmployee?.name} - {t("Attendance History")}
                </span>
              </DialogTitle>
            </div>
          </DialogHeader>

          {isSummaryLoading ? (
            <div className="py-12 text-center text-sm text-gray-500">
              {t("Loading attendance history...")}
            </div>
          ) : employeeSummary ? (
            <div className="space-y-4">
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <p className="text-[10px] uppercase font-bold text-emerald-600">{t("Present")}</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    {employeeSummary.stats?.present || 0}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] uppercase font-bold text-rose-600">{t("Absent")}</p>
                  <p className="text-xl font-black text-rose-700 dark:text-rose-400">
                    {employeeSummary.stats?.absent || 0}
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <p className="text-[10px] uppercase font-bold text-amber-600">{t("Half Day")}</p>
                  <p className="text-xl font-black text-amber-700 dark:text-amber-400">
                    {employeeSummary.stats?.halfDay || 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                  <p className="text-[10px] uppercase font-bold text-purple-600">{t("Leave")}</p>
                  <p className="text-xl font-black text-purple-700 dark:text-purple-400">
                    {employeeSummary.stats?.leave || 0}
                  </p>
                </div>
              </div>

              {/* Month selector for individual employee */}
              <div className="flex justify-between items-center bg-gray-50 dark:bg-[#151922] p-2.5 rounded-xl border border-gray-200 dark:border-[#2c3242]">
                <span className="text-xs text-gray-500 font-medium">{t("Filter Month:")}</span>
                <input
                  type="month"
                  value={historyMonth}
                  onChange={(e) => setHistoryMonth(e.target.value)}
                  className="text-xs bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-lg px-2.5 py-1 text-gray-800 dark:text-gray-200 focus:outline-hidden"
                />
              </div>

              {/* Log History List */}
              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {employeeSummary.history?.length === 0 ? (
                  <p className="text-center py-8 text-xs text-gray-400">
                    {t("No attendance records found for this period.")}
                  </p>
                ) : (
                  employeeSummary.history.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-[#2c3242] bg-gray-50/50 dark:bg-[#181c26]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {format(new Date(record.date), "EEE, MMM d, yyyy")}
                        </div>
                        {record.note && (
                          <span className="text-[11px] text-gray-500 italic max-w-[200px] truncate">
                            &ldquo;{record.note}&rdquo;
                          </span>
                        )}
                      </div>
                      <div>{renderStatusBadge(record.status)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* 8. Interactive Payroll & Salary Calculator Modal */}
      <PayrollCalculatorModal
        isOpen={!!selectedPayrollEmployee}
        onClose={() => setSelectedPayrollEmployee(null)}
        instructorId={selectedPayrollEmployee?.id}
        instructorName={selectedPayrollEmployee?.name}
        initialMonth={monthKey}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["employee-monthly-matrix", monthKey] });
        }}
      />

      {/* 9. Record Advance / Extra Payment Modal */}
      <AddExtraPaymentModal
        isOpen={!!extraPaymentEmployee}
        onClose={() => setExtraPaymentEmployee(null)}
        instructorId={extraPaymentEmployee?.id}
        instructorName={extraPaymentEmployee?.name}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["employee-monthly-matrix", monthKey] });
        }}
      />
    </div>
  );
}
