"use client";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { StudentAttendanceTab } from "./StudentAttendanceTab";
import { EmployeeAttendanceTab } from "./EmployeeAttendanceTab";
import { GraduationCap, Users } from "lucide-react";

export function AttendanceTab() {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState("student"); // "student" or "employee"

  return (
    <div className="space-y-6">
      {/* Top Level Sub-tab Switcher Pill */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#1e222d] p-3.5 rounded-2xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#c1552c] flex items-center justify-center text-lg font-bold">
            📋
          </div>
          <div>
            <h2 className="font-bold text-sm text-gray-900 dark:text-white tracking-tight">
              {t("Attendance Management")}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {subTab === "student"
                ? t("Currently managing Student Attendance")
                : t("Currently managing Employee & Staff Attendance")}
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Switcher */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-[#151922] rounded-xl border border-gray-200/80 dark:border-[#2c3242] self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab("student")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === "student"
                ? "bg-white dark:bg-[#2c3242] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <GraduationCap className="w-4 h-4 text-[#c1552c]" />
            <span>{t("Student Attendance")}</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab("employee")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              subTab === "employee"
                ? "bg-white dark:bg-[#2c3242] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-4 h-4 text-[#128C7E]" />
            <span>{t("Employee Attendance")}</span>
          </button>
        </div>
      </div>

      {/* Render selected attendance view */}
      {subTab === "student" ? <StudentAttendanceTab /> : <EmployeeAttendanceTab />}
    </div>
  );
}
