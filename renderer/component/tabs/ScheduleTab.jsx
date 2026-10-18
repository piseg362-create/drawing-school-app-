import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { fetchApi } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays, isToday } from "date-fns";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover";
import { ChevronDown, Check, X, User, Car, Calendar as CalendarIcon } from "lucide-react";

const STATUS_STYLES = {
  Upcoming:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
  Running:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  "In Progress":
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800",
  Completed:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800",
  Cancelled:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800",
};
const DEFAULT_STATUS_STYLE =
  "bg-white text-gray-700 border-gray-200 dark:bg-[#232734] dark:text-[#cfd3da] dark:border-[#3a3d45]";
const getStatusStyle = (status) =>
  STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;

export function ScheduleTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());

  const dateKey = format(selectedDate, "yyyy-MM-dd");

  const { data: schedule = [], isLoading: loading } = useQuery({
    queryKey: ["schedules", dateKey],
    queryFn: async () => {
      const res = await fetchApi(`/get-schedules?date=${dateKey}`);
      const data = await res.json();
      if (data && data.status) {
        return data.data || [];
      }
      return [];
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ studentId, status, studentName }) => {
      const res = await fetchApi("/mark-student-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date: dateKey,
          status,
        }),
      });
      const data = await res.json();
      if (!data.status) {
        throw new Error(data.message || "Failed to mark attendance");
      }
      return { data, studentName, status };
    },
    onSuccess: ({ studentName, status }) => {
      queryClient.invalidateQueries({ queryKey: ["schedules", dateKey] });
      if (status === "PRESENT") {
        toast.success(`✓ Marked Present: ${studentName}`);
      } else if (status === "ABSENT") {
        toast.error(`✗ Marked Absent: ${studentName}`);
      } else {
        toast.info(`Attendance reset: ${studentName}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update attendance");
    },
  });

  const attendanceStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let notMarked = 0;
    schedule.forEach((s) => {
      if (s.attendanceStatus === "PRESENT") present++;
      else if (s.attendanceStatus === "ABSENT") absent++;
      else notMarked++;
    });
    return { total: schedule.length, present, absent, notMarked };
  }, [schedule]);

  const { groupedSchedules, standaloneLineIndex } = useMemo(() => {
    const groups = {};
    schedule.forEach((lesson) => {
      const key = lesson.time;
      if (!groups[key]) {
        groups[key] = {
          time: key,
          duration: lesson.duration,
          lessons: [],
        };
      }
      groups[key].lessons.push(lesson);
    });

    const sorted = Object.values(groups).sort((a, b) => {
      const parseTime = (t) => {
        const match = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return 0;
        let hours = parseInt(match[1], 10);
        if (match[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
        if (match[3].toUpperCase() === "AM" && hours === 12) hours = 0;
        return hours * 60 + parseInt(match[2], 10);
      };
      return parseTime(a.time) - parseTime(b.time);
    });

    let hasRunning = sorted.some((g) =>
      g.lessons.some((l) => l.status === "Running"),
    );
    let lineIdx = -1;

    if (!hasRunning && sorted.length > 0) {
      lineIdx = sorted.findIndex((g) =>
        g.lessons.some((l) => l.status === "Upcoming"),
      );
      if (lineIdx === -1) {
        lineIdx = sorted.length;
      }
    }

    return { groupedSchedules: sorted, standaloneLineIndex: lineIdx };
  }, [schedule]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-colors duration-300">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Navigator */}
          <div className="flex items-center justify-between w-56 bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-lg px-3 py-1.5 text-gray-900 dark:text-[#f2e9de] transition-colors shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => subDays(prev, 1))}
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded transition-colors"
              title="Previous Day"
            >
              &lt;
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="font-semibold text-sm hover:text-[#c1552c] transition-colors flex items-center gap-1.5"
              title="Click to jump to Today"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[#c1552c]" />
              <span>
                {isToday(selectedDate)
                  ? `Today, ${format(selectedDate, "MMM d")}`
                  : format(selectedDate, "EEE, MMM d")}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
              className="p-1 text-gray-400 hover:text-[#c1552c] rounded transition-colors"
              title="Next Day"
            >
              &gt;
            </button>
          </div>

          {/* Quick Attendance Stats */}
          {schedule.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {attendanceStats.present} {t("Present")}
              </span>
              {attendanceStats.absent > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  {attendanceStats.absent} {t("Absent")}
                </span>
              )}
              {attendanceStats.notMarked > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800/80 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                  {attendanceStats.notMarked} {t("Pending")}
                </span>
              )}
            </div>
          )}
        </div>

        <button className="bg-[#c1552c] hover:bg-[#a64724] text-white font-medium rounded-lg px-5 py-2 transition-colors duration-200 shadow-md shadow-[#c1552c]/20 flex items-center space-x-2">
          <span>+ Schedule Lesson</span>
        </button>
      </div>

      {/* Agenda Timeline */}
      <div className="bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden transition-colors duration-300 p-6">
        <div className="relative border-l-2 border-gray-100 dark:border-[#2c3242] ml-4 space-y-8 pb-4">
          {loading ? (
            <div className="text-gray-500 py-8 text-center w-full">
              Loading schedules...
            </div>
          ) : groupedSchedules.length === 0 ? (
            <div className="text-gray-500 py-8 text-center w-full">
              No schedules found for this date.
            </div>
          ) : (
            groupedSchedules.map((group, groupIdx) => {
              const isRunning = group.lessons.some(
                (l) => l.status === "Running",
              );
              const showStandaloneLineHere = standaloneLineIndex === groupIdx;

              return (
                <div key={groupIdx} className="relative pl-8 sm:pl-12 group">
                  {/* Standalone Current Time Line */}
                  {showStandaloneLineHere && (
                    <div className="absolute -top-6 -left-[9px] right-0 flex items-center z-10 pointer-events-none">
                      <div className="w-4 h-4 rounded-full bg-[#c1552c] shadow-md shadow-[#c1552c]/60 flex-shrink-0 animate-pulse border-2 border-white dark:border-[#1e222d]"></div>
                      <div className="h-0.5 bg-[#c1552c] w-full ml-1 opacity-60"></div>
                    </div>
                  )}

                  {/* Timeline Dot & Dynamic Line */}
                  {isRunning ? (
                    <div className="absolute top-1.5 -left-[9px] right-0 flex items-center z-10 pointer-events-none">
                      <div className="w-4 h-4 rounded-full bg-[#c1552c] shadow-md shadow-[#c1552c]/80 flex-shrink-0 animate-pulse border-2 border-white dark:border-[#1e222d]"></div>
                      <div className="h-0.5 bg-[#c1552c] w-full ml-1 opacity-70"></div>
                    </div>
                  ) : (
                    <div className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-white dark:border-[#1e222d] bg-gray-300 dark:bg-[#5a5f6e] group-hover:bg-[#c1552c] transition-colors"></div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Time Block */}
                    <div className="w-full sm:w-40 shrink-0 pt-1">
                      <div className="font-bold text-sm sm:text-base text-gray-900 dark:text-[#f2e9de] leading-snug break-words sm:whitespace-nowrap">
                        {group.time}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">
                        {group.duration}
                      </div>
                    </div>

                    {/* Batch card: all students at this time */}
                    <div className="flex-1 rounded-xl border border-gray-100 dark:border-[#2c3242] bg-gray-50/60 dark:bg-[#171a22]/40 p-3">
                      {group.lessons.length > 1 && (
                        <div className="flex items-center gap-1.5 mb-2 px-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-[#c1552c]"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          <span className="text-xs font-semibold text-gray-600 dark:text-[#cfd3da]">
                            Batch &middot; {group.lessons.length} students
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2.5">
                        {group.lessons.map((lesson) => {
                          const isPresent = lesson.attendanceStatus === "PRESENT";
                          const isAbsent = lesson.attendanceStatus === "ABSENT";

                          // Determine card border styling based on attendance
                          let borderClass = "border-l-4 border-l-[#c1552c]";
                          let cardBg = "bg-white dark:bg-[#1b1f2b]";
                          if (isPresent) {
                            borderClass = "border-l-4 border-l-emerald-500";
                            cardBg = "bg-white dark:bg-[#162024]/40";
                          } else if (isAbsent) {
                            borderClass = "border-l-4 border-l-rose-500";
                            cardBg = "bg-white dark:bg-[#25171e]/40";
                          }

                          return (
                            <div
                              key={lesson.id}
                              onClick={() => {
                                // One-click mark as Present if not already Present
                                if (!isPresent) {
                                  markAttendanceMutation.mutate({
                                    studentId: lesson.studentId,
                                    status: "PRESENT",
                                    studentName: lesson.student,
                                  });
                                } else {
                                  toast.info(`${lesson.student} is already marked Present. Use the badge dropdown to change to Absent.`);
                                }
                              }}
                              className={`w-[260px] min-h-[112px] shrink-0 p-2.5 flex flex-col justify-between rounded-lg border-t border-r border-b border-t-gray-100 border-r-gray-100 border-b-gray-100 dark:border-t-[#2c3242] dark:border-r-[#2c3242] dark:border-b-[#2c3242] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${borderClass} ${cardBg}`}
                              title={
                                isPresent
                                  ? "Marked Present (Click badge to change)"
                                  : isAbsent
                                  ? "Marked Absent (Click card to mark Present)"
                                  : "Click card to mark attendance as Present"
                              }
                            >
                              {/* Top Row: Student Name & Attendance Badge Dropdown */}
                              <div className="flex justify-between items-start gap-1">
                                <h3 className="font-semibold text-sm text-gray-900 dark:text-[#f2e9de] truncate leading-tight max-w-[145px]">
                                  {lesson.student}
                                </h3>

                                <Popover>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={(e) => e.stopPropagation()}
                                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full border transition-all shadow-xs ${
                                        isPresent
                                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
                                          : isAbsent
                                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700"
                                          : "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:border-[#c1552c]"
                                      }`}
                                      title="Change Attendance Status"
                                    >
                                      {isPresent ? (
                                        <>
                                          <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                                          <span>Present</span>
                                        </>
                                      ) : isAbsent ? (
                                        <>
                                          <X className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400 stroke-[3]" />
                                          <span>Absent</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                          <span>Unmarked</span>
                                        </>
                                      )}
                                      <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-40 p-1.5 z-50 bg-white dark:bg-[#1f2330] border border-gray-200 dark:border-[#2c3242] shadow-xl rounded-lg"
                                    align="end"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#8a8d96] border-b border-gray-100 dark:border-gray-800 mb-1">
                                      Attendance
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAttendanceMutation.mutate({
                                          studentId: lesson.studentId,
                                          status: "PRESENT",
                                          studentName: lesson.student,
                                        });
                                      }}
                                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-left rounded-md font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        <span>Present</span>
                                      </span>
                                      {isPresent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markAttendanceMutation.mutate({
                                          studentId: lesson.studentId,
                                          status: "ABSENT",
                                          studentName: lesson.student,
                                        });
                                      }}
                                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-left rounded-md font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                                    >
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        <span>Absent</span>
                                      </span>
                                      {isAbsent && <Check className="w-3.5 h-3.5 text-rose-600" />}
                                    </button>
                                    {(isPresent || isAbsent) && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          markAttendanceMutation.mutate({
                                            studentId: lesson.studentId,
                                            status: "NOT_MARKED",
                                            studentName: lesson.student,
                                          });
                                        }}
                                        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-left rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mt-1 border-t border-gray-100 dark:border-gray-800"
                                      >
                                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                        <span>Reset Unmarked</span>
                                      </button>
                                    )}
                                  </PopoverContent>
                                </Popover>
                              </div>

                              {/* Middle: Instructor & Vehicle */}
                              <div className="flex flex-col space-y-1 my-1">
                                <div className="flex items-center text-[11px] text-gray-600 dark:text-[#cfd3da] truncate">
                                  <User className="w-3 h-3 mr-1 shrink-0 text-gray-400 dark:text-[#8a8d96]" />
                                  <span className="truncate">{lesson.instructor}</span>
                                </div>
                                <div className="flex items-center text-[11px] text-gray-600 dark:text-[#cfd3da] truncate">
                                  <Car className="w-3 h-3 mr-1 shrink-0 text-gray-400 dark:text-[#8a8d96]" />
                                  <span className="truncate">{lesson.vehicle}</span>
                                </div>
                              </div>

                              {/* Bottom Row: Course Type & Lesson Status */}
                              <div className="flex items-center justify-between pt-1 border-t border-gray-100/80 dark:border-[#2c3242]/80 text-[10px]">
                                <span className="text-[#c1552c] font-medium truncate max-w-[150px]">
                                  {lesson.type}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 uppercase font-bold tracking-wider rounded-sm border shrink-0 leading-none ${getStatusStyle(lesson.status)}`}
                                >
                                  {lesson.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Render at the very end if all batches are completed */}
          {!loading &&
            groupedSchedules.length > 0 &&
            standaloneLineIndex === groupedSchedules.length && (
              <div className="relative pl-8 sm:pl-12 mt-6">
                <div className="absolute top-0 -left-[9px] right-0 flex items-center z-10 pointer-events-none">
                  <div className="w-4 h-4 rounded-full bg-[#c1552c] shadow-sm shadow-[#c1552c]/50 flex-shrink-0"></div>
                  <div className="h-0.5 bg-[#c1552c] w-full ml-1 opacity-50"></div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
