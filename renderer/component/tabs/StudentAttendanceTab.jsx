"use client";
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays, isToday } from "date-fns";
import { toast } from "sonner";
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
  BookOpen,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

export function StudentAttendanceTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PRESENT, ABSENT, NOT_MARKED
  const [timeFilter, setTimeFilter] = useState("ALL");
  const [historyStudent, setHistoryStudent] = useState(null); // student object for history modal

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  // Fetch schedules with attendance data for selected date
  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ["attendance-schedules", dateKey],
    queryFn: async () => {
      const res = await fetchApi(`/get-schedules?date=${dateKey}`);
      const data = await res.json();
      if (data && data.status) {
        return data.data || [];
      }
      return [];
    },
  });

  // Fetch individual student attendance history when modal opens
  const { data: studentSummary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ["student-attendance-summary", historyStudent?.studentId],
    queryFn: async () => {
      if (!historyStudent?.studentId) return null;
      const res = await fetchApi(
        `/student-attendance-summary?studentId=${historyStudent.studentId}`,
      );
      const data = await res.json();
      return data.status ? data.data : null;
    },
    enabled: !!historyStudent?.studentId,
  });

  // Mark single student attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, status, studentName, note }) => {
      const res = await fetchApi("/mark-student-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date: dateKey,
          status,
          note,
        }),
      });
      const data = await res.json();
      if (!data.status) throw new Error(data.message || "Failed to mark attendance");
      return { data, studentName, status };
    },
    onSuccess: ({ studentName, status }) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-schedules", dateKey] });
      queryClient.invalidateQueries({ queryKey: ["schedules", dateKey] });
      if (historyStudent) {
        queryClient.invalidateQueries({
          queryKey: ["student-attendance-summary", historyStudent.studentId],
        });
      }
      if (status === "PRESENT") {
        toast.success(`✓ Marked Present: ${studentName}`);
      } else if (status === "ABSENT") {
        toast.error(`✗ Marked Absent: ${studentName}`);
      } else {
        toast.info(`Attendance reset for ${studentName}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update attendance");
    },
  });

  // Mark all students present mutation
  const markAllMutation = useMutation({
    mutationFn: async (studentIds) => {
      const res = await fetchApi("/mark-all-students-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          date: dateKey,
          status: "PRESENT",
        }),
      });
      const data = await res.json();
      if (!data.status) throw new Error(data.message || "Failed to mark all present");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-schedules", dateKey] });
      queryClient.invalidateQueries({ queryKey: ["schedules", dateKey] });
      toast.success(data.message || "All students marked Present!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to mark all present");
    },
  });

  // Compute metrics
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let notMarked = 0;
    schedule.forEach((s) => {
      if (s.attendanceStatus === "PRESENT") present++;
      else if (s.attendanceStatus === "ABSENT") absent++;
      else notMarked++;
    });
    return {
      total: schedule.length,
      present,
      absent,
      notMarked,
      rate: schedule.length > 0 ? Math.round((present / schedule.length) * 100) : 0,
    };
  }, [schedule]);

  // Unique time slots for filter
  const timeSlots = useMemo(() => {
    const slots = new Set();
    schedule.forEach((s) => {
      if (s.time) slots.add(s.time);
    });
    return Array.from(slots);
  }, [schedule]);

  // Filtered schedule list
  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        item.student?.toLowerCase().includes(search) ||
        item.studentMobile?.includes(search) ||
        item.instructor?.toLowerCase().includes(search) ||
        item.vehicle?.toLowerCase().includes(search);

      // Status
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PRESENT" && item.attendanceStatus === "PRESENT") ||
        (statusFilter === "ABSENT" && item.attendanceStatus === "ABSENT") ||
        (statusFilter === "NOT_MARKED" && item.attendanceStatus === "NOT_MARKED");

      // Time
      const matchesTime = timeFilter === "ALL" || item.time === timeFilter;

      return matchesSearch && matchesStatus && matchesTime;
    });
  }, [schedule, searchTerm, statusFilter, timeFilter]);

  // Dynamic avatar color generator
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

  return (
    <div className="space-y-6">
      {/* 1. Header & Date Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#1e222d] p-5 rounded-2xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-colors duration-300">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] flex items-center gap-2">
            <span>📋</span>
            <span>{t("Student Attendance")}</span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">
            {t("Record, monitor, and manage daily driving session attendances")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Navigator */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-xl px-3 py-1.5 text-gray-900 dark:text-[#f2e9de] transition-colors shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded-md transition-colors"
              title="Previous Day"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="font-semibold text-sm hover:text-[#c1552c] transition-colors flex items-center gap-2 px-2"
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
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded-md transition-colors"
              title="Next Day"
            >
              &gt;
            </button>
          </div>

          {/* Mark All Present Quick Action */}
          {schedule.length > 0 && stats.notMarked > 0 && (
            <button
              type="button"
              disabled={markAllMutation.isPending}
              onClick={() => {
                const unmarkIds = schedule
                  .filter((s) => s.attendanceStatus !== "PRESENT")
                  .map((s) => s.studentId);
                markAllMutation.mutate(unmarkIds);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              <span>{t("Mark All Present")}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Metric Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Scheduled */}
        <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-[#f2e9de]">
              {stats.total}
            </div>
            <div className="text-xs text-gray-500 dark:text-[#8a8d96]">
              {t("Scheduled Today")}
            </div>
          </div>
        </div>

        {/* Present */}
        <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>{stats.present}</span>
              {stats.total > 0 && (
                <span className="text-xs font-normal text-emerald-600/80">
                  ({stats.rate}%)
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-[#8a8d96]">
              {t("Present Today")}
            </div>
          </div>
        </div>

        {/* Absent */}
        <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {stats.absent}
            </div>
            <div className="text-xs text-gray-500 dark:text-[#8a8d96]">
              {t("Absent Today")}
            </div>
          </div>
        </div>

        {/* Pending / Unmarked */}
        <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.notMarked}
            </div>
            <div className="text-xs text-gray-500 dark:text-[#8a8d96]">
              {t("Unmarked")}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 transition-colors">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("Search by student, mobile, instructor, vehicle...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#171a22] border border-gray-200 dark:border-[#3a3d45] rounded-lg text-sm text-gray-900 dark:text-[#f2e9de] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#c1552c]/50 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="inline-flex p-1 bg-gray-100 dark:bg-[#171a22] rounded-lg border border-gray-200 dark:border-[#3a3d45] text-xs">
            {[
              { id: "ALL", label: "All" },
              { id: "PRESENT", label: "Present" },
              { id: "ABSENT", label: "Absent" },
              { id: "NOT_MARKED", label: "Unmarked" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                  statusFilter === tab.id
                    ? "bg-white dark:bg-[#2c3242] text-gray-900 dark:text-[#f2e9de] shadow-xs"
                    : "text-gray-500 dark:text-[#8a8d96] hover:text-gray-900 dark:hover:text-[#f2e9de]"
                }`}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>

          {/* Time Filter Dropdown */}
          {timeSlots.length > 0 && (
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="text-xs bg-gray-50 dark:bg-[#171a22] border border-gray-200 dark:border-[#3a3d45] text-gray-700 dark:text-[#cfd3da] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#c1552c]"
            >
              <option value="ALL">{t("All Batches")}</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 4. Student Attendance Table */}
      <div className="bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden transition-colors">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/70 dark:bg-[#171a22]/70 hover:bg-gray-50/70 dark:hover:bg-[#171a22]/70">
              <TableHead>{t("Student")}</TableHead>
              <TableHead>{t("Batch Time")}</TableHead>
              <TableHead>{t("Instructor & Vehicle")}</TableHead>
              <TableHead>{t("Package / Course")}</TableHead>
              <TableHead className="text-center">{t("Status")}</TableHead>
              <TableHead className="text-right">{t("Quick Attendance Action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  {t("Loading attendance schedules...")}
                </TableCell>
              </TableRow>
            ) : filteredSchedule.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CalendarIcon className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    <span>{t("No student schedules found for this date.")}</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredSchedule.map((item) => {
                const isPresent = item.attendanceStatus === "PRESENT";
                const isAbsent = item.attendanceStatus === "ABSENT";
                const isPending = item.attendanceStatus === "NOT_MARKED";

                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-[#252a38]/40 transition-colors"
                  >
                    {/* Student Name & Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full ${getAvatarColor(
                            item.student,
                          )} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs`}
                        >
                          {item.student?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <button
                            type="button"
                            onClick={() => setHistoryStudent(item)}
                            className="font-semibold text-sm text-gray-900 dark:text-[#f2e9de] hover:text-[#c1552c] dark:hover:text-[#c1552c] transition-colors truncate text-left"
                            title="Click to view full attendance history"
                          >
                            {item.student}
                          </button>
                          <span className="text-xs text-gray-400 dark:text-[#8a8d96] font-mono">
                            {item.studentMobile || "-"}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Batch Time & Duration */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-xs text-gray-900 dark:text-[#f2e9de] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#c1552c]" />
                          {item.time}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-[#8a8d96]">
                          {item.duration || "1h lesson"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Instructor & Vehicle */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-gray-700 dark:text-[#cfd3da] flex items-center gap-1 truncate">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {item.instructor}
                        </span>
                        <span className="text-gray-500 dark:text-[#8a8d96] flex items-center gap-1 truncate">
                          <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {item.vehicle}
                        </span>
                      </div>
                    </TableCell>

                    {/* Package */}
                    <TableCell>
                      <span className="text-xs font-medium text-[#c1552c] bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900/40">
                        {item.type}
                      </span>
                    </TableCell>

                    {/* Status Pill */}
                    <TableCell className="text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border shadow-2xs ${
                          isPresent
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                            : isAbsent
                            ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                            : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                        }`}
                      >
                        {isPresent ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                            <span>{t("PRESENT")}</span>
                          </>
                        ) : isAbsent ? (
                          <>
                            <X className="w-3 h-3 text-rose-600 dark:text-rose-400 stroke-[3]" />
                            <span>{t("ABSENT")}</span>
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            <span>{t("NOT MARKED")}</span>
                          </>
                        )}
                      </span>
                    </TableCell>

                    {/* Quick Action Buttons */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Present Button */}
                        <button
                          type="button"
                          onClick={() =>
                            markAttendanceMutation.mutate({
                              studentId: item.studentId,
                              status: "PRESENT",
                              studentName: item.student,
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            isPresent
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800"
                          }`}
                          title="Mark Present"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Present</span>
                        </button>

                        {/* Absent Button */}
                        <button
                          type="button"
                          onClick={() =>
                            markAttendanceMutation.mutate({
                              studentId: item.studentId,
                              status: "ABSENT",
                              studentName: item.student,
                            })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                            isAbsent
                              ? "bg-rose-600 text-white shadow-xs"
                              : "bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800"
                          }`}
                          title="Mark Absent"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Absent</span>
                        </button>

                        {/* Reset Button (only if already marked) */}
                        {!isPending && (
                          <button
                            type="button"
                            onClick={() =>
                              markAttendanceMutation.mutate({
                                studentId: item.studentId,
                                status: "NOT_MARKED",
                                studentName: item.student,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Reset to Unmarked"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* History Button */}
                        <button
                          type="button"
                          onClick={() => setHistoryStudent(item)}
                          className="p-1.5 text-[#c1552c] hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg transition-colors ml-1"
                          title="View Attendance History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 5. Student Attendance History Dialog Modal */}
      <Dialog
        open={!!historyStudent}
        onOpenChange={(open) => !open && setHistoryStudent(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-[#c1552c]" />
              <span>{historyStudent?.student} - Attendance Record</span>
            </DialogTitle>
          </DialogHeader>

          {isSummaryLoading ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Loading attendance history...
            </div>
          ) : studentSummary ? (
            <div className="space-y-5 pt-2">
              {/* Progress & Quick Stats Card */}
              <div className="bg-gray-50 dark:bg-[#171a22] p-4 rounded-xl border border-gray-200 dark:border-[#3a3d45]">
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div>
                    <div className="text-xl font-bold text-emerald-600">
                      {studentSummary.totalPresent}
                    </div>
                    <div className="text-xs text-gray-500">Sessions Attended</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-rose-600">
                      {studentSummary.totalAbsent}
                    </div>
                    <div className="text-xs text-gray-500">Days Absent</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900 dark:text-[#f2e9de]">
                      {studentSummary.totalMarked}
                    </div>
                    <div className="text-xs text-gray-500">Total Recorded</div>
                  </div>
                </div>

                {/* Course Details Info */}
                <div className="text-xs text-gray-600 dark:text-[#cfd3da] space-y-1 pt-2 border-t border-gray-200 dark:border-[#2c3242]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Course / Package:</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {studentSummary.student?.package_name || "General Driving Course"}
                    </span>
                  </div>
                  {studentSummary.student?.Course_Start_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start Date:</span>
                      <span>
                        {format(
                          new Date(studentSummary.student.Course_Start_date),
                          "dd MMM yyyy",
                        )}
                      </span>
                    </div>
                  )}
                  {studentSummary.student?.instructor && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Instructor:</span>
                      <span>{studentSummary.student.instructor.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Attendance Log History List */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-[#8a8d96]">
                  Past Session Logs ({studentSummary.history?.length || 0})
                </h4>

                {studentSummary.history?.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 bg-gray-50 dark:bg-[#171a22] rounded-lg">
                    No attendance records logged yet for this student.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {studentSummary.history.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#171a22] border border-gray-100 dark:border-[#2c3242] text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              record.status === "PRESENT"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          ></span>
                          <span className="font-medium text-gray-900 dark:text-[#f2e9de]">
                            {format(new Date(record.date), "EEE, dd MMM yyyy")}
                          </span>
                        </div>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            record.status === "PRESENT"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
