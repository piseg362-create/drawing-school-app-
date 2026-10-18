import React, { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, User, Phone, Briefcase, CreditCard, Car, Calendar, DollarSign, Wallet, 
  FileText, CheckCircle, Users, CheckCircle2, XCircle, Clock, Coffee, Download, 
  CalendarDays, Plus, Check, X, ChevronLeft, ChevronRight, LayoutGrid, ListFilter, MessageSquare 
} from "lucide-react";
import { 
  format, addMonths, subMonths, startOfMonth, getDaysInMonth, getDay, isToday, isSameMonth 
} from "date-fns";
import { fetchApi } from "../../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PayrollCalculatorModal } from "./PayrollCalculatorModal";
import { AddExtraPaymentModal } from "./AddExtraPaymentModal";

export function InstructorProfile({ instructor, onBack }) {
  const [loading, setLoading] = useState(true);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date());
  const [attendanceViewMode, setAttendanceViewMode] = useState("grid"); // "grid" or "list"
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isExtraPaymentModalOpen, setIsExtraPaymentModalOpen] = useState(false);

  useEffect(() => {
    // Fetch assigned students for this instructor
    const fetchStudents = async () => {
      try {
        const res = await fetchApi("/get-student-data?limit=1000");
        const data = await res.json();
        if (data && data.status) {
          const allStudents = data.data || [];
          setAssignedStudents(allStudents.filter(s => s.Assigned_Instructor === instructor.id));
        }
      } catch (error) {
        console.error("Failed to fetch students:", error);
      }
    };

    // Fetch real payment lifecycle
    const fetchPayments = async () => {
      try {
        const res = await fetchApi(`/get-instructor-payments/${instructor.id}`);
        const data = await res.json();
        if (data && data.status) {
          setPayments(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch payments:", error);
      }
    };

    Promise.all([fetchStudents(), fetchPayments()]).finally(() => {
      setLoading(false);
    });
  }, [instructor.id]);

  // Fetch employee attendance summary for selected month
  useEffect(() => {
    let isMounted = true;
    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const monthStr = format(attendanceMonth, "yyyy-MM");
        const res = await fetchApi(`/employee-attendance-summary?instructorId=${instructor.id}&month=${monthStr}`);
        const data = await res.json();
        if (data && data.status && isMounted) {
          setAttendanceData(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        if (isMounted) setAttendanceLoading(false);
      }
    };

    fetchAttendance();
    return () => { isMounted = false; };
  }, [instructor.id, attendanceMonth]);

  const exportPDF = () => {
    const doc = new jsPDF();

    // Add Title and Header Info
    doc.setFontSize(18);
    doc.text("Instructor Payment Lifecycle", 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Instructor Name: ${instructor.name}`, 14, 30);
    doc.text(`Mobile: ${instructor.mobile}`, 14, 36);
    doc.text(`Base Salary: Rs. ${instructor.payment || 0}`, 14, 42);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, 14, 48);

    // Map real payment cycles
    const tableColumn = ["Month", "Advances", "Bonuses", "Net Paid", "Status"];
    const tableRows = payments.length > 0 ? payments.map(p => {
      const monthStr = new Date(p.month).toLocaleString('default', { month: 'short', year: 'numeric' });
      return [
        monthStr,
        `-Rs. ${p.amountTaken}`,
        `+Rs. ${p.bonus}`,
        `Rs. ${p.netAmount}`,
        p.status
      ];
    }) : [["No payroll history found", "", "", "", ""]];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] } // Indigo 600
    });

    doc.save(`${instructor.name.replace(/\s+/g, '_')}_Payroll_History.pdf`);
  };

  const handlePrevMonth = () => setAttendanceMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setAttendanceMonth((prev) => addMonths(prev, 1));
  const handleCurrentMonth = () => setAttendanceMonth(new Date());

  const daysInCurrentMonth = useMemo(() => getDaysInMonth(attendanceMonth), [attendanceMonth]);
  const monthStartOffset = useMemo(() => {
    const start = startOfMonth(attendanceMonth);
    // getDay: 0 (Sun) to 6 (Sat). We want Monday = 0, ..., Sunday = 6
    return (getDay(start) + 6) % 7;
  }, [attendanceMonth]);

  const dayRecordsMap = useMemo(() => {
    const map = {};
    if (!attendanceData?.history) return map;
    attendanceData.history.forEach((record) => {
      if (!record.date) return;
      let dayNum;
      if (typeof record.date === "string" && record.date.includes("-")) {
        const datePart = record.date.split("T")[0];
        const parts = datePart.split("-");
        if (parts.length === 3) {
          dayNum = parseInt(parts[2], 10);
        }
      }
      if (!dayNum || isNaN(dayNum)) {
        dayNum = new Date(record.date).getDate();
      }
      map[dayNum] = record;
    });
    return map;
  }, [attendanceData]);

  const baseSalary = Number(instructor.payment) || 0;
  const effDays = (attendanceData?.stats?.present || 0) + (attendanceData?.stats?.halfDay || 0) * 0.5;
  const earnedSalary = daysInCurrentMonth > 0 ? Math.round(effDays * (baseSalary / daysInCurrentMonth)) : 0;

  const exportAttendancePDF = () => {
    const doc = new jsPDF();
    const monthLabel = format(attendanceMonth, "MMMM yyyy");
    doc.setFontSize(18);
    doc.text(`Instructor Attendance Record - ${monthLabel}`, 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Employee Name: ${instructor.name}`, 14, 30);
    doc.text(`Role: ${instructor.jobType}`, 14, 36);
    doc.text(`Mobile: ${instructor.mobile}`, 14, 42);
    const s = attendanceData?.stats || { present: 0, absent: 0, halfDay: 0, leave: 0, rate: 0 };
    doc.text(`Month Summary: Present: ${s.present} | Absent: ${s.absent} | Half Day: ${s.halfDay} | Leave: ${s.leave} | Rate: ${s.rate}% | Est. Earned: Rs. ${earnedSalary}`, 14, 48);

    const history = attendanceData?.history || [];
    const tableColumn = ["Date", "Status", "Note / Reason"];
    const tableRows = history.length > 0 ? history.map(h => [
      new Date(h.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      h.status,
      h.note || "-"
    ]) : [["No attendance records logged for this month", "", ""]];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      headStyles: { fillColor: [193, 85, 44] }
    });

    doc.save(`${instructor.name.replace(/\s+/g, '_')}_Attendance_${format(attendanceMonth, "yyyy_MM")}.pdf`);
  };

  const joinDate = instructor.joiningDate ? new Date(instructor.joiningDate).toLocaleDateString() : "N/A";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center space-x-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2c3242] rounded-full text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-lg font-bold capitalize">
              {instructor.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] capitalize">{instructor.name}</h2>
              <p className="text-sm text-gray-500 flex items-center"><Phone className="w-3.5 h-3.5 mr-1" /> {instructor.mobile}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              instructor.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {instructor.isActive ? "Active" : "Inactive"}
            </span>
            <div className="hidden sm:flex items-center space-x-2 border-l border-gray-200 dark:border-[#3c445a] pl-3 ml-1">
              <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExtraPaymentModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-900/50 text-[#c1552c] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Advance / Bonus</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPayrollModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Issue Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-[#8a8d96] mb-1 font-medium">Base Salary</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-[#f2e9de]">₹{instructor.payment || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-[#8a8d96] mb-1 font-medium">Pay Date</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-[#f2e9de]">Day {instructor.paymentDate || "N/A"}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-[#8a8d96] mb-1 font-medium">Active Students</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-[#f2e9de]">
              {loading ? "..." : assignedStudents.filter(s => s.Enrollment_status === 'Active' || s.Enrollment_status === 'CHOSEN').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 dark:text-[#8a8d96] mb-1 font-medium">Vehicle Assigned</p>
            <p className="text-lg font-bold text-gray-900 dark:text-[#f2e9de] truncate max-w-[100px]">{instructor.car?.name || "None"}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Lifecycle */}
        <div className="space-y-6 lg:col-span-1">
          {/* Job Details */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] mb-4 flex items-center uppercase tracking-wider text-xs">
              <Briefcase className="w-4 h-4 mr-2 text-indigo-500" /> Employee Info
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase text-gray-500 dark:text-[#8a8d96] mb-0.5">Role</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de] capitalize">{instructor.jobType?.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-500 dark:text-[#8a8d96] mb-0.5">License Number</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de]">{instructor.licenseNumber || "Not Provided"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-gray-500 dark:text-[#8a8d96] mb-0.5">Joining Date</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de]">{joinDate}</p>
              </div>
            </div>
          </div>

          {/* Payroll Lifecycle Action */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet className="w-24 h-24" />
            </div>
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 relative z-10">Manage Payroll Cycle</h3>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70 mb-4 relative z-10">
              Track advances, calculate deductions, and add extra bonuses for this month.
            </p>
            <button
              type="button"
              onClick={() => setIsPayrollModalOpen(true)}
              className="w-full relative z-10 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Open Payroll Calculator
            </button>
          </div>
        </div>

        {/* Right Column: Payments History & Students */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Payment History / Lifecycle */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] flex items-center uppercase tracking-wider text-xs">
                <FileText className="w-4 h-4 mr-2 text-indigo-500" /> Recent Payment History
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExtraPaymentModalOpen(true)}
                  className="flex items-center text-xs font-semibold text-white bg-[#c1552c] hover:bg-[#a84723] px-3 py-1.5 rounded transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Advance / Bonus
                </button>
                <button onClick={exportPDF} className="flex items-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors shadow-sm">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Export PDF
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2c3242] text-xs uppercase text-gray-500">
                    <th className="pb-3 font-medium">Month</th>
                    <th className="pb-3 font-medium text-center">Advances</th>
                    <th className="pb-3 font-medium text-center">Bonuses</th>
                    <th className="pb-3 font-medium text-right">Net Paid</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-sm text-gray-500">Loading history...</td>
                    </tr>
                  ) : payments.length > 0 ? (
                    payments.map((p) => (
                      <tr key={p.id} className="border-b border-gray-50 dark:border-[#2c3242]/50 last:border-0">
                        <td className="py-3 font-medium text-gray-900 dark:text-white">
                          {new Date(p.month).toLocaleString('default', { month: 'short', year: 'numeric' })}
                        </td>
                        <td className={`py-3 text-center ${p.amountTaken > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {p.amountTaken > 0 ? `-₹${p.amountTaken}` : '₹0'}
                        </td>
                        <td className={`py-3 text-center ${p.bonus > 0 ? 'text-emerald-500' : 'text-gray-400'}`}>
                          {p.bonus > 0 ? `+₹${p.bonus}` : '₹0'}
                        </td>
                        <td className="py-3 text-right font-bold text-gray-900 dark:text-white">₹{p.netAmount}</td>
                        <td className="py-3 text-right">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                            p.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            p.status === 'PARTIALLY_PAID' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-6 text-center text-sm text-gray-500 border border-dashed border-gray-200 dark:border-[#3c445a] rounded-lg mt-2 block w-full">
                        No payroll history generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Assigned Students */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] flex items-center uppercase tracking-wider text-xs">
                <Users className="w-4 h-4 mr-2 text-indigo-500" /> Current Students
              </h3>
            </div>
            
            {loading ? (
              <p className="text-sm text-gray-500">Loading students...</p>
            ) : assignedStudents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assignedStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-[#2c3242] rounded-lg bg-gray-50 dark:bg-[#252a38]">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm capitalize">{s.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase">{s.package_name || "Custom"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 dark:border-[#3c445a] rounded-lg">
                <p className="text-sm text-gray-500">No active students assigned.</p>
              </div>
            )}
          </div>

          {/* Attendance Record & History */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-[#2c3242]">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center space-x-1.5">
                  <CalendarDays className="w-4 h-4 text-[#c1552c]" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] uppercase tracking-wider text-xs">
                    Attendance Record
                  </h3>
                </div>

                {/* Month Navigator */}
                <div className="flex items-center bg-gray-100 dark:bg-[#252a38] rounded-lg p-0.5 border border-gray-200 dark:border-[#2c3242]">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 hover:bg-white dark:hover:bg-[#1e222d] rounded text-gray-600 dark:text-gray-300 transition-colors"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 text-xs font-bold text-gray-900 dark:text-gray-100 min-w-[110px] text-center select-none">
                    {format(attendanceMonth, "MMMM yyyy")}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 hover:bg-white dark:hover:bg-[#1e222d] rounded text-gray-600 dark:text-gray-300 transition-colors"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {!isSameMonth(attendanceMonth, new Date()) && (
                  <button
                    type="button"
                    onClick={handleCurrentMonth}
                    className="text-[11px] font-semibold text-[#c1552c] hover:underline"
                  >
                    This Month
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {/* View Mode Toggle: Day Boxes vs List */}
                <div className="inline-flex rounded-lg bg-gray-100 dark:bg-[#252a38] p-0.5 border border-gray-200 dark:border-[#2c3242]">
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode("grid")}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      attendanceViewMode === "grid"
                        ? "bg-white dark:bg-[#1e222d] text-[#c1552c] shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                    title="Day Boxes Grid View"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Day Boxes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceViewMode("list")}
                    className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      attendanceViewMode === "list"
                        ? "bg-white dark:bg-[#1e222d] text-[#c1552c] shadow-xs"
                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    }`}
                    title="Detailed List View"
                  >
                    <ListFilter className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">List</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={exportAttendancePDF}
                  className="flex items-center text-xs font-semibold text-white bg-[#c1552c] hover:bg-[#a84723] px-3 py-1.5 rounded transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>

            {/* Attendance Monthly Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-center">
                <p className="text-[10px] uppercase font-bold text-emerald-600">Present</p>
                <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">
                  {attendanceData?.stats?.present || 0}
                </p>
              </div>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 text-center">
                <p className="text-[10px] uppercase font-bold text-rose-600">Absent</p>
                <p className="text-lg font-black text-rose-700 dark:text-rose-400">
                  {attendanceData?.stats?.absent || 0}
                </p>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 text-center">
                <p className="text-[10px] uppercase font-bold text-amber-600">Half Day</p>
                <p className="text-lg font-black text-amber-700 dark:text-amber-400">
                  {attendanceData?.stats?.halfDay || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100 dark:border-purple-900/30 text-center">
                <p className="text-[10px] uppercase font-bold text-purple-600">Leave</p>
                <p className="text-lg font-black text-purple-700 dark:text-purple-400">
                  {attendanceData?.stats?.leave || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30 text-center">
                <p className="text-[10px] uppercase font-bold text-[#c1552c]">Rate</p>
                <p className="text-lg font-black text-[#c1552c]">
                  {attendanceData?.stats?.rate || 0}%
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-center">
                <p className="text-[10px] uppercase font-bold text-blue-600">Earned Est.</p>
                <p className="text-lg font-black text-blue-700 dark:text-blue-400">
                  ₹{earnedSalary}
                </p>
                <p className="text-[9px] text-gray-400">/ ₹{baseSalary}</p>
              </div>
            </div>

            {/* Attendance Content: Calendar Day Boxes Grid OR Detailed List */}
            {attendanceViewMode === "grid" ? (
              <div className="space-y-4">
                {attendanceLoading ? (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Loading {format(attendanceMonth, "MMMM yyyy")} attendance...
                  </div>
                ) : (
                  <>
                    {/* Day of Week Headers */}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
                        <div
                          key={dayName}
                          className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                        >
                          {dayName}
                        </div>
                      ))}

                      {/* Month Start Empty Offset Slots */}
                      {Array.from({ length: monthStartOffset }).map((_, idx) => (
                        <div
                          key={`offset-${idx}`}
                          className="min-h-[70px] sm:min-h-[76px] rounded-xl border border-dashed border-gray-100 dark:border-[#2c3242]/40 bg-gray-50/20 dark:bg-[#1a1e28]/10 opacity-30"
                        />
                      ))}

                      {/* Day Boxes (1 .. daysInMonth) */}
                      {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const boxDate = new Date(
                          attendanceMonth.getFullYear(),
                          attendanceMonth.getMonth(),
                          dayNum
                        );
                        const isCurrentDay = isToday(boxDate);
                        const record = dayRecordsMap[dayNum];
                        const status = record?.status;
                        const hasNote = Boolean(record?.note && record.note.trim());

                        // Status Styling, Icons & Badges
                        let boxBg = "bg-gray-50/60 hover:bg-gray-100/60 dark:bg-[#1a1e28]/40 dark:hover:bg-[#1a1e28]/70 border-gray-200 dark:border-[#2c3242]";
                        let iconElement = <span className="text-xs font-semibold text-gray-300 dark:text-gray-600">-</span>;
                        let statusLabel = <span className="text-[10px] text-gray-400 dark:text-gray-500">-</span>;

                        if (status === "PRESENT") {
                          boxBg = "bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 shadow-2xs";
                          iconElement = (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          );
                          statusLabel = (
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tight">
                              Present
                            </span>
                          );
                        } else if (status === "ABSENT") {
                          boxBg = "bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 border-rose-300 dark:border-rose-800 shadow-2xs";
                          iconElement = (
                            <div className="w-7 h-7 rounded-full bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-xs">
                              <X className="w-4 h-4 stroke-[3]" />
                            </div>
                          );
                          statusLabel = (
                            <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-tight">
                              Absent
                            </span>
                          );
                        } else if (status === "HALF_DAY") {
                          boxBg = "bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 border-amber-300 dark:border-amber-800 shadow-2xs";
                          iconElement = (
                            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 font-black text-xs shadow-xs">
                              ½
                            </div>
                          );
                          statusLabel = (
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-tight">
                              Half Day
                            </span>
                          );
                        } else if (status === "LEAVE") {
                          boxBg = "bg-purple-50 hover:bg-purple-100/80 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-purple-300 dark:border-purple-800 shadow-2xs";
                          iconElement = (
                            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-xs shadow-xs">
                              L
                            </div>
                          );
                          statusLabel = (
                            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-tight">
                              Leave
                            </span>
                          );
                        }

                        return (
                          <div
                            key={dayNum}
                            title={`Day ${dayNum} (${format(boxDate, "EEE, MMM d")}): ${
                              status || "Not Marked"
                            }${hasNote ? ` • Note: ${record.note}` : ""}`}
                            className={`relative min-h-[70px] sm:min-h-[76px] p-2 rounded-xl border flex flex-col justify-between transition-all duration-150 ${boxBg} ${
                              isCurrentDay
                                ? "ring-2 ring-[#c1552c] ring-offset-1 dark:ring-offset-[#1e222d] shadow-sm"
                                : ""
                            }`}
                          >
                            {/* Header inside Day Box: Day number + Today / Note Tag */}
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`text-xs font-black ${
                                  isCurrentDay
                                    ? "text-[#c1552c]"
                                    : "text-gray-800 dark:text-gray-200"
                                }`}
                              >
                                {dayNum}
                              </span>
                              <div className="flex items-center space-x-1">
                                {isCurrentDay && (
                                  <span className="px-1 py-0.2 bg-[#c1552c] text-white text-[8px] font-bold rounded uppercase">
                                    Today
                                  </span>
                                )}
                                {hasNote && (
                                  <span
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-[#1e222d]"
                                    title={record.note}
                                  />
                                )}
                              </div>
                            </div>

                            {/* Center Right/Wrong or Status Icon */}
                            <div className="flex items-center justify-center my-0.5">
                              {iconElement}
                            </div>

                            {/* Bottom Label */}
                            <div className="text-center truncate w-full">
                              {statusLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    <div className="pt-3 border-t border-gray-100 dark:border-[#2c3242] flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-[11px] font-medium">Present (✓)</span>
                        </span>
                        <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
                          <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <X className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                          <span className="text-[11px] font-medium">Absent (✕)</span>
                        </span>
                        <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
                          <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-[10px]">
                            ½
                          </span>
                          <span className="text-[11px] font-medium">Half Day</span>
                        </span>
                        <span className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
                          <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[10px]">
                            L
                          </span>
                          <span className="text-[11px] font-medium">Leave</span>
                        </span>
                        <span className="flex items-center space-x-1 text-gray-400">
                          <span className="w-4 h-4 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center text-[10px]">
                            -
                          </span>
                          <span className="text-[11px]">Not Marked</span>
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-400">
                        * Day boxes show records for {format(attendanceMonth, "MMMM yyyy")}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              /* Detailed List View */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-[#2c3242] text-xs uppercase text-gray-500">
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium text-center">Status</th>
                      <th className="pb-3 font-medium text-right">Note / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700 dark:text-gray-300">
                    {attendanceLoading ? (
                      <tr>
                        <td colSpan="3" className="py-4 text-center text-sm text-gray-500">
                          Loading attendance records...
                        </td>
                      </tr>
                    ) : attendanceData?.history?.length > 0 ? (
                      attendanceData.history.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-gray-50 dark:border-[#2c3242]/50 last:border-0 hover:bg-gray-50/50 dark:hover:bg-[#252a38]/50 transition-colors"
                        >
                          <td className="py-2.5 font-medium text-gray-900 dark:text-white text-xs">
                            {new Date(record.date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                record.status === "PRESENT"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : record.status === "ABSENT"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                                  : record.status === "HALF_DAY"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                                  : record.status === "LEAVE"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {record.status === "PRESENT" && <Check className="w-3 h-3 stroke-[3] mr-0.5" />}
                              {record.status === "ABSENT" && <X className="w-3 h-3 stroke-[3] mr-0.5" />}
                              <span>{record.status}</span>
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-xs text-gray-500 italic max-w-[200px] truncate">
                            {record.note || "-"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="3"
                          className="py-6 text-center text-sm text-gray-500 border border-dashed border-gray-200 dark:border-[#3c445a] rounded-lg mt-2 block w-full"
                        >
                          No employee attendance records logged for {format(attendanceMonth, "MMMM yyyy")}.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Interactive Payroll & Salary Calculator Modal */}
      <PayrollCalculatorModal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        instructorId={instructor.id}
        instructorName={instructor.name}
        onSaved={async () => {
          // Re-fetch payments
          try {
            const res = await fetchApi(`/get-instructor-payments/${instructor.id}`);
            const data = await res.json();
            if (data && data.status) {
              setPayments(data.data || []);
            }
          } catch (e) {
            console.error(e);
          }
        }}
      />

      {/* Record Advance / Extra Payment Modal */}
      <AddExtraPaymentModal
        isOpen={isExtraPaymentModalOpen}
        onClose={() => setIsExtraPaymentModalOpen(false)}
        instructorId={instructor.id}
        instructorName={instructor.name}
        onSuccess={async () => {
          // Re-fetch payments
          try {
            const res = await fetchApi(`/get-instructor-payments/${instructor.id}`);
            const data = await res.json();
            if (data && data.status) {
              setPayments(data.data || []);
            }
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}
