"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../component/ui/dialog";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

export function AddExtraPaymentModal({
  isOpen,
  onClose,
  instructorId,
  instructorName,
  onSuccess,
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [type, setType] = useState("ADVANCE"); // "ADVANCE" (deducted from salary) or "BONUS" (added on top)
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [note, setNote] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        throw new Error(t("Please enter a valid amount greater than 0"));
      }

      const res = await fetchApi("/record-extra-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructorId,
          month,
          amount: numAmount,
          type,
          paymentMode,
          note,
          takenAt: date,
        }),
      });

      const data = await res.json();
      if (!data.status) {
        throw new Error(data.message || "Failed to record payment");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["calculate-salary", instructorId] });
      queryClient.invalidateQueries({ queryKey: ["instructor-payments", instructorId] });
      queryClient.invalidateQueries({ queryKey: ["employee-monthly-matrix"] });

      if (type === "ADVANCE") {
        toast.success(`✓ Salary advance of ₹${amount} recorded and deducted from monthly net salary`);
      } else {
        toast.success(`✓ Extra bonus of ₹${amount} added to monthly salary`);
      }

      // Reset form
      setAmount("");
      setNote("");
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#1e222d] border-gray-200 dark:border-[#2c3242]">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#c1552c]" />
            <span>
              {t("Record Payment")} - {instructorName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1. Payment Type Selector */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1.5">
              {t("What kind of payment is this?")}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-[#151922] rounded-xl border border-gray-200 dark:border-[#2c3242]">
              <button
                type="button"
                onClick={() => setType("ADVANCE")}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  type === "ADVANCE"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>{t("Salary Advance")}</span>
              </button>

              <button
                type="button"
                onClick={() => setType("BONUS")}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  type === "BONUS"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>{t("Extra Bonus / Incentive")}</span>
              </button>
            </div>

            {/* Explanation Helper Banner */}
            <div className="mt-2 text-[11px] p-2.5 rounded-lg border flex items-start gap-2 bg-gray-50 dark:bg-[#171a22] border-gray-200 dark:border-[#2c3242]">
              <HelpCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div className="text-gray-600 dark:text-gray-300">
                {type === "ADVANCE" ? (
                  <span>
                    <strong>{t("Salary Advance:")}</strong>{" "}
                    {t(
                      "Money given to the instructor before payday. It will be automatically deducted from their end-of-month salary."
                    )}
                  </span>
                ) : (
                  <span>
                    <strong>{t("Extra Bonus:")}</strong>{" "}
                    {t(
                      "Reward for overtime, special batches, or milestone achievements. It will be added on top of their monthly salary."
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Amount & Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {t("Amount (₹) *")}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-xl focus:outline-hidden focus:border-[#c1552c] text-gray-900 dark:text-white font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {t("Payment Mode")}
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white focus:outline-hidden"
              >
                <option value="Cash">{t("Cash")}</option>
                <option value="UPI / GPay / PhonePe">{t("UPI (GPay / PhonePe)")}</option>
                <option value="Bank Transfer">{t("Bank Transfer / NEFT")}</option>
                <option value="Cheque">{t("Cheque")}</option>
              </select>
            </div>
          </div>

          {/* 3. Salary Month & Date Given */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {t("Salary Month Cycle")}
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                {t("Date Given")}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* 4. Note / Reason */}
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
              {t("Reason / Remarks")}
            </label>
            <input
              type="text"
              placeholder={
                type === "ADVANCE"
                  ? t("e.g. Festival advance, Medical emergency, Fuel loan")
                  : t("e.g. Extra Sunday batch bonus, Best instructor reward")
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-[#2c3242] bg-white dark:bg-[#1e222d] text-gray-900 dark:text-white focus:outline-hidden focus:border-[#c1552c]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100 dark:border-[#2c3242]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-[#2c3242] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            disabled={mutation.isPending || !amount || Number(amount) <= 0}
            onClick={() => mutation.mutate()}
            className={`px-5 py-2 text-xs font-semibold rounded-xl text-white shadow-xs transition-colors disabled:opacity-50 ${
              type === "ADVANCE"
                ? "bg-rose-600 hover:bg-rose-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {mutation.isPending
              ? t("Recording...")
              : type === "ADVANCE"
              ? t("Save Advance (Deduct from Salary)")
              : t("Save Extra Bonus")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
