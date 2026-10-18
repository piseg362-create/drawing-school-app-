"use client";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../component/ui/dialog";
import {
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Coffee,
  Wallet,
  Download,
  AlertCircle,
  Plus,
  Save,
  Calculator,
} from "lucide-react";

export function PayrollCalculatorModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  initialMonth,
  onSaved,
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth || format(new Date(), "yyyy-MM")
  );
  const [calculationBasis, setCalculationBasis] = useState("calendar"); // calendar, 30_days, 26_days
  const [includeLeavesAsPaid, setIncludeLeavesAsPaid] = useState(false);

  // Editable adjustments
  const [bonusInput, setBonusInput] = useState(0);
  const [customDeductionInput, setCustomDeductionInput] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  const [paymentNote, setPaymentNote] = useState("");

  // Record Advance sub-section state
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNote, setAdvanceNote] = useState("");

  // Fetch salary breakdown from backend
  const {
    data: salaryResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "calculate-salary",
      instructorId,
      selectedMonth,
      calculationBasis,
      includeLeavesAsPaid,
    ],
    queryFn: async () => {
      if (!instructorId) return null;
      const res = await fetchApi(
        `/calculate-employee-salary?instructorId=${instructorId}&month=${selectedMonth}&calculationBasis=${calculationBasis}&includeLeavesAsPaid=${includeLeavesAsPaid}`
      );
      const json = await res.json();
      return json && json.status ? json.data : null;
    },
    enabled: isOpen && !!instructorId,
  });

  const salaryData = salaryResponse?.salaryBreakdown;
  const attendance = salaryResponse?.attendance;
  const existingCycle = salaryResponse?.existingCycle;

  // Sync inputs with existing cycle if present
  useEffect(() => {
    if (existingCycle) {
      setBonusInput(existingCycle.bonus || 0);
      setCustomDeductionInput(
        existingCycle.deductions > (salaryData?.lossOfPayDeduction || 0)
          ? existingCycle.deductions - (salaryData?.lossOfPayDeduction || 0)
          : 0
      );
      setPaymentStatus(existingCycle.status || "PENDING");
      setPaymentNote(existingCycle.note || "");
    } else {
      setBonusInput(0);
      setCustomDeductionInput(0);
      setPaymentStatus("PENDING");
      setPaymentNote("");
    }
  }, [existingCycle, salaryData?.lossOfPayDeduction]);

  // Derived calculations
  const baseSalary = salaryData?.baseSalary || 0;
  const earnedSalary = salaryData?.earnedSalary || 0;
  const lossOfPay = salaryData?.lossOfPayDeduction || 0;
  const totalAdvances = salaryData?.totalAdvances || 0;
  const bonus = Number(bonusInput) || 0;
  const otherDeduction = Number(customDeductionInput) || 0;

  const totalDeductions = lossOfPay + otherDeduction;
  const finalNetPayable = Math.max(0, earnedSalary - totalAdvances - otherDeduction + bonus);

  // Save Payroll Cycle mutation
  const saveCycleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetchApi("/save-payroll-cycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorId,
          month: selectedMonth,
          baseAmount: baseSalary,
          deductions: totalDeductions,
          bonus,
          amountTaken: totalAdvances,
          netAmount: finalNetPayable,
          status: paymentStatus,
          note:
            paymentNote ||
            `Salary for ${selectedMonth} (${attendance?.effectivePresentDays || 0} days attended)`,
        }),
      });
      const data = await res.json();
      if (!data.status) throw new Error(data.message || "Failed to save payroll cycle");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calculate-salary", instructorId] });
      queryClient.invalidateQueries({ queryKey: ["instructor-payments", instructorId] });
      toast.success(data.message || "Payroll cycle saved successfully!");
      if (onSaved) onSaved();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Error saving payroll cycle");
    },
  });

  // Record Advance mutation
  const recordAdvanceMutation = useMutation({
    mutationFn: async () => {
      if (!advanceAmount || Number(advanceAmount) <= 0) {
        throw new Error("Enter a valid advance amount");
      }
      const res = await fetchApi("/record-advance-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorId,
          month: selectedMonth,
          amount: Number(advanceAmount),
          note: advanceNote || "Advance taken",
        }),
      });
      const data = await res.json();
      if (!data.status) throw new Error(data.message || "Failed to record advance");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Advance payment recorded!");
      setAdvanceAmount("");
      setAdvanceNote("");
      setShowAdvanceForm(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["instructor-payments", instructorId] });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record advance");
    },
  });

  // Export Payslip PDF
  const exportPayslipPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.setTextColor(193, 85, 44);
      doc.text("SALARY PAYSLIP", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Salary Period: ${selectedMonth}`, 14, 30);
      doc.text(`Employee Name: ${salaryResponse?.instructor?.name || instructorName}`, 14, 36);
      doc.text(`Role: ${salaryResponse?.instructor?.jobType || "Staff"}`, 14, 42);
      doc.text(`Mobile: ${salaryResponse?.instructor?.mobile || "N/A"}`, 14, 48);

      // Attendance summary box
      doc.setFontSize(11);
      doc.setTextColor(40);
      doc.text("Attendance Summary", 14, 58);

      const attRows = [
        ["Total Days in Month", String(salaryResponse?.daysInMonth || 30)],
        ["Days Present", String(attendance?.presentDays || 0)],
        ["Half Days (0.5x)", String(attendance?.halfDays || 0)],
        ["Leaves Taken", String(attendance?.leaveDays || 0)],
        ["Absent Days", String(attendance?.absentDays || 0)],
        ["Effective Payable Days", String(attendance?.effectivePresentDays || 0)],
      ];

      autoTable(doc, {
        head: [["Attendance Metric", "Value"]],
        body: attRows,
        startY: 62,
        theme: "grid",
        headStyles: { fillColor: [193, 85, 44] },
      });

      // Salary details box
      const salaryRows = [
        ["Base Monthly Salary", `Rs. ${baseSalary}`],
        ["Calculated Daily Rate", `Rs. ${salaryData?.dailyRate || 0}`],
        ["Earned Salary (Effective Days x Rate)", `Rs. ${earnedSalary}`],
        ["Loss of Pay (Absent Days)", `-Rs. ${lossOfPay}`],
        ["Advances Deducted", `-Rs. ${totalAdvances}`],
        ["Other Deductions", `-Rs. ${otherDeduction}`],
        ["Bonus / Incentives", `+Rs. ${bonus}`],
        ["FINAL NET PAYABLE", `Rs. ${finalNetPayable}`],
      ];

      autoTable(doc, {
        head: [["Earnings & Deductions Item", "Amount"]],
        body: salaryRows,
        startY: doc.lastAutoTable.finalY + 10,
        theme: "grid",
        headStyles: { fillColor: [79, 70, 229] },
      });

      // Payment Status
      doc.setFontSize(11);
      doc.setTextColor(60);
      doc.text(`Payment Status: ${paymentStatus}`, 14, doc.lastAutoTable.finalY + 12);
      if (paymentNote) {
        doc.text(`Note: ${paymentNote}`, 14, doc.lastAutoTable.finalY + 18);
      }

      doc.save(`Payslip_${(instructorName || "Staff").replace(/\s+/g, "_")}_${selectedMonth}.pdf`);
      toast.success("Payslip PDF generated successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate payslip PDF");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#1e222d] border-gray-200 dark:border-[#2c3242] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#c1552c]" />
              <span>
                {t("Salary & Payroll Calculator")} - {instructorName}
              </span>
            </DialogTitle>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-500">
            {t("Calculating salary based on attendance...")}
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* 1. Month & Calculation Basis Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-50 dark:bg-[#151922] p-3.5 rounded-xl border border-gray-200 dark:border-[#2c3242]">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                  {t("Month")}
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">
                  {t("Daily Rate Basis")}
                </label>
                <select
                  value={calculationBasis}
                  onChange={(e) => setCalculationBasis(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-lg px-2.5 py-1.5 text-gray-900 dark:text-white focus:outline-hidden"
                >
                  <option value="calendar">
                    {t("Calendar Days")} ({salaryResponse?.daysInMonth || 31} {t("days")})
                  </option>
                  <option value="30_days">{t("Fixed 30 Days")}</option>
                  <option value="26_days">{t("26 Working Days (No Sun)")}</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300 py-1.5">
                  <input
                    type="checkbox"
                    checked={includeLeavesAsPaid}
                    onChange={(e) => setIncludeLeavesAsPaid(e.target.checked)}
                    className="rounded text-[#c1552c] focus:ring-[#c1552c]"
                  />
                  <span>{t("Paid Leaves")}</span>
                </label>
              </div>
            </div>

            {/* 2. Attendance Summary Grid */}
            <div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                {t("Attendance Logged This Month")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">
                    {t("Present")}
                  </span>
                  <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                    {attendance?.presentDays || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">
                    {t("Half Day (0.5)")}
                  </span>
                  <p className="text-lg font-black text-amber-700 dark:text-amber-400">
                    {attendance?.halfDays || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <span className="text-[10px] font-bold text-rose-600 uppercase">
                    {t("Absent")}
                  </span>
                  <p className="text-lg font-black text-rose-700 dark:text-rose-400">
                    {attendance?.absentDays || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                  <span className="text-[10px] font-bold text-purple-600 uppercase">
                    {t("Leaves")}
                  </span>
                  <p className="text-lg font-black text-purple-700 dark:text-purple-400">
                    {attendance?.leaveDays || 0}
                  </p>
                </div>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">
                    {t("Payable Days")}
                  </span>
                  <p className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                    {attendance?.effectivePresentDays || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Salary Calculation Breakdown Cards */}
            <div className="bg-white dark:bg-[#171a22] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-[#2c3242]">
                <span className="text-gray-500 font-medium">{t("Base Monthly Salary")}</span>
                <span className="font-bold text-gray-900 dark:text-white">₹{baseSalary}</span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-[#2c3242]">
                <span className="text-gray-500 font-medium">
                  {t("Daily Wage Rate")} (₹{baseSalary} ÷ {salaryResponse?.divisor || 30})
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  ₹{salaryData?.dailyRate || 0} / {t("day")}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-[#2c3242]">
                <span className="text-emerald-600 font-semibold">
                  {t("Earned Salary")} ({attendance?.effectivePresentDays || 0} {t("days")} × ₹
                  {salaryData?.dailyRate || 0})
                </span>
                <span className="font-black text-emerald-600 text-sm">₹{earnedSalary}</span>
              </div>

              {lossOfPay > 0 && (
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-[#2c3242]">
                  <span className="text-rose-500 font-medium">
                    {t("Loss of Pay (Absent Days Deduction)")}
                  </span>
                  <span className="font-bold text-rose-500">-₹{lossOfPay}</span>
                </div>
              )}

              {totalAdvances > 0 && (
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-100 dark:border-[#2c3242]">
                  <span className="text-rose-500 font-medium">{t("Salary Advances Taken")}</span>
                  <span className="font-bold text-rose-500">-₹{totalAdvances}</span>
                </div>
              )}

              {/* Adjustments: Bonus & Extra Deductions */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    {t("+ Bonus / Incentives (₹)")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={bonusInput}
                    onChange={(e) => setBonusInput(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">
                    {t("- Other Deductions (₹)")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customDeductionInput}
                    onChange={(e) => setCustomDeductionInput(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Final Net Pay Highlight */}
              <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-xl border border-orange-200 dark:border-orange-900/40 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">
                    {t("Net Payable Salary")}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {t("Calculated per days present")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#c1552c]">₹{finalNetPayable}</p>
                </div>
              </div>
            </div>

            {/* 4. Payment Status & Note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  {t("Payroll Status")}
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#151922] text-gray-900 dark:text-white focus:outline-hidden"
                >
                  <option value="PENDING">{t("Pending Approval")}</option>
                  <option value="PAID">{t("Paid (Completed)")}</option>
                  <option value="PARTIALLY_PAID">{t("Partially Paid")}</option>
                  <option value="CANCELLED">{t("Cancelled")}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  {t("Payroll Remarks / Note")}
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  placeholder={t("Remarks (e.g., Paid via UPI/Cash)")}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#151922] text-gray-900 dark:text-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* 5. Advance Recording Section (Collapsible) */}
            <div className="border border-dashed border-gray-200 dark:border-[#2c3242] rounded-xl p-3">
              {!showAdvanceForm ? (
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {t("Current advances this month:")}{" "}
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{totalAdvances}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanceForm(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#c1552c] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("Record Salary Advance")}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {t("Record New Advance Payment")}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAdvanceForm(false)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      {t("Cancel")}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder={t("Amount (₹)")}
                      value={advanceAmount}
                      onChange={(e) => setAdvanceAmount(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white"
                    />
                    <input
                      type="text"
                      placeholder={t("Reason / Note")}
                      value={advanceNote}
                      onChange={(e) => setAdvanceNote(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={recordAdvanceMutation.isPending}
                    onClick={() => recordAdvanceMutation.mutate()}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    {recordAdvanceMutation.isPending
                      ? t("Recording...")
                      : t("Save Advance Payment")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-gray-100 dark:border-[#2c3242]">
          <button
            type="button"
            onClick={exportPayslipPDF}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-[#2c3242] hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t("Download Payslip (PDF)")}</span>
          </button>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-[#2c3242] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {t("Cancel")}
            </button>
            <button
              type="button"
              disabled={saveCycleMutation.isPending}
              onClick={() => saveCycleMutation.mutate()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#c1552c] hover:bg-[#a84723] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saveCycleMutation.isPending ? t("Saving...") : t("Save to Payroll Record")}
              </span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
