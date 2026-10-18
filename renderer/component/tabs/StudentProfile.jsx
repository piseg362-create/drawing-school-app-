import React, { useState, useEffect } from "react";
import { ArrowLeft, User, Phone, Calendar, CreditCard, Car, UserCheck, Clock, MapPin, Receipt, CheckCircle, CircleDashed, Send } from "lucide-react";
import { fetchApi } from "../../lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { SendLicenseTestModal } from "./SendLicenseTestModal";

export function StudentProfile({ student: initialStudent, onBack, onUpdate }) {
  const [student, setStudent] = useState(initialStudent);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  // Sync state if initialStudent changes (e.g. parent refreshes)
  useEffect(() => {
    setStudent(initialStudent);
  }, [initialStudent]);

  useEffect(() => {
    // We can fetch the schedules associated with this student
    const fetchSchedules = async () => {
      try {
        const res = await fetchApi("/get-schedules"); // fetch all and filter, or add a specific route
        const data = await res.json();
        if (data && data.status) {
          const allSchedules = data.data || [];
          setSchedules(allSchedules.filter(s => s.student_id === student.id));
        }
      } catch (error) {
        console.error("Failed to fetch schedules:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [student.id]);

  const percentage = 100 - (student.Remaining_percentage || 0);
  
  // Calculate Course Progress for Pie Chart
  const calculateCourseProgress = () => {
    if (!student.Course_Start_date || !student.Course_End_Date) return 0;
    const start = new Date(student.Course_Start_date).getTime();
    const end = new Date(student.Course_End_Date).getTime();
    const now = new Date().getTime();

    if (now < start) return 0;
    if (now > end) return 100;
    
    return Math.round(((now - start) / (end - start)) * 100);
  };
  
  const courseProgress = calculateCourseProgress();
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (courseProgress / 100) * circumference;

  const markDueCompleted = async () => {
    try {
      setIsMarkingPaid(true);
      const res = await fetchApi(`/mark-payment-complete/${student.id}`, {
        method: "PUT"
      });
      const data = await res.json();
      if (data && data.status) {
        toast.success("Payment marked as fully completed!");
        setStudent(data.data); // Update local state
        if (onUpdate) onUpdate(data.data); // Notify parent to update its list
      } else {
        toast.error(data.message || "Failed to mark payment completed");
      }
    } catch (error) {
      toast.error("Failed to connect to server");
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const printReceipt = () => {
    const doc = new jsPDF();
    
    // --- Header Section ---
    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(0, 0, 0);
    doc.text("INVOICE", 14, 25);
    
    // Invoice Number (Mocked using student ID or random)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const invoiceNum = student.id ? student.id.substring(0, 8).toUpperCase() : "INV-1001";
    doc.text(invoiceNum, 14, 32);

    // Logo Box Placeholder
    doc.setFillColor(248, 249, 250); // Very light gray
    doc.rect(130, 15, 65, 20, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("ADD YOUR LOGO", 162.5, 26, { align: "center" });

    // Top Horizontal Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    // --- Bill To / Bill From Section ---
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    
    // Column 1: Bill From
    doc.text("BILL FROM:", 14, 50);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Driving School", 14, 56);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("123 Main Street", 14, 61);
    doc.text("City, State, Zip Code", 14, 66);
    doc.text("Phone Number", 14, 71);

    // Column 2: Bill To
    doc.text("BILL TO:", 75, 50);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(student.name.toUpperCase(), 75, 56);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Mobile: ${student.mobile}`, 75, 61);
    doc.text("Course Enrolled", 75, 66);

    // Column 3: Dates
    doc.text("ISSUE DATE:", 140, 50);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(new Date().toLocaleDateString(), 140, 56);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("DUE DATE:", 140, 66);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Upon Receipt", 140, 71);

    // Vertical Dividers
    doc.setDrawColor(200, 200, 200);
    doc.line(70, 42, 70, 78);
    doc.line(135, 42, 135, 78);

    // Bottom Horizontal Line
    doc.line(14, 78, 196, 78);

    // --- Table Section ---
    const tableColumn = ["Date", "Description", "Price", "QTY", "Total"];
    const tableRows = [
      [
        new Date().toLocaleDateString(), 
        `Driving Course: ${student.package_name || "Custom Plan"}`, 
        `Rs. ${student.Total_amount}`, 
        "1", 
        `Rs. ${student.Total_amount}`
      ]
    ];

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 85,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      bodyStyles: { textColor: [50, 50, 50] },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 70 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' }
      },
      didDrawRow: function(data) {
        // Draw bottom border for each row just like the template
        doc.setDrawColor(220, 220, 220);
        doc.line(data.row.x, data.row.y + data.row.height, data.row.x + data.table.width, data.row.y + data.row.height);
      }
    });

    const finalY = doc.lastAutoTable.finalY + 15;

    // --- Totals Section (Right Aligned) ---
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    
    // Subtotal
    doc.text("Subtotal", 135, finalY);
    doc.text(`Rs. ${student.Total_amount}`, 196, finalY, { align: "right" });
    doc.setDrawColor(220, 220, 220);
    doc.line(135, finalY + 4, 196, finalY + 4);

    // Amount Paid (Using "Tax" spot for payments made)
    doc.text("Amount Paid", 135, finalY + 12);
    doc.text(`- Rs. ${student.Amount_paid}`, 196, finalY + 12, { align: "right" });
    doc.line(135, finalY + 16, 196, finalY + 16);

    // Total Due
    doc.setFont("helvetica", "bold");
    doc.text("Total Due", 135, finalY + 24);
    doc.text(`Rs. ${student.remaining_amount}`, 196, finalY + 24, { align: "right" });

    // --- Payment Information Section ---
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Information:", 14, finalY + 40);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const paymentInfoText = "Please make all cheques payable to Driving School Name. Bank transfer details: Account No: 1234567890, IFSC: ABCD0123456. Ensure full payment is completed before the course ends.";
    const splitText = doc.splitTextToSize(paymentInfoText, 180);
    doc.text(splitText, 14, finalY + 46);

    // --- Footer Section ---
    // Full width gray bar at the bottom
    doc.setFillColor(230, 230, 230);
    const pageHeight = doc.internal.pageSize.height;
    doc.rect(0, pageHeight - 20, 210, 20, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Thank you for your business!", 14, pageHeight - 11);

    // Trigger Print
    doc.autoPrint();
    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center space-x-4 bg-white dark:bg-[#1e222d] p-4 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2c3242] rounded-full text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-lg font-bold capitalize">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] capitalize">{student.name}</h2>
              <p className="text-sm text-gray-500 flex items-center"><Phone className="w-3.5 h-3.5 mr-1" /> {student.mobile}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              student.Enrollment_status === 'Active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              student.Enrollment_status === 'Completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {student.Enrollment_status}
            </span>
            <div className="hidden sm:flex items-center space-x-2 border-l border-gray-200 dark:border-[#3c445a] pl-3 ml-1">
              <button
                type="button"
                onClick={() => setIsLicenseModalOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  student.licenseTestDate
                    ? "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                    : "bg-orange-50 hover:bg-orange-100 dark:bg-[#c1552c]/15 dark:hover:bg-[#c1552c]/25 text-[#c1552c] border border-orange-200/60 dark:border-[#c1552c]/30"
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span>{student.licenseTestDate ? "Test: " + new Date(student.licenseTestDate).toLocaleDateString() : "Schedule License Test"}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLicenseModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 rounded-lg text-xs font-semibold transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>WhatsApp</span>
              </button>
              <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-lg text-xs font-semibold transition-colors">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Log Payment</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details */}
        <div className="space-y-6 lg:col-span-1">
          {/* Course Details & Status Pie Chart */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] mb-4 flex items-center uppercase tracking-wider text-xs">
              <Calendar className="w-4 h-4 mr-2 text-indigo-500" /> Course Status
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-[#8a8d96] mb-1">Package Selected</p>
                  <p className="font-medium text-gray-900 dark:text-[#f2e9de] max-w-[140px] truncate" title={student.package_name}>{student.package_name || "N/A"}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 dark:text-[#8a8d96] mb-0.5">Start Date</p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-[#f2e9de]">
                      {student.Course_Start_date ? new Date(student.Course_Start_date).toLocaleDateString() : "Pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-gray-500 dark:text-[#8a8d96] mb-0.5">End Date</p>
                    <p className="text-xs font-semibold text-gray-900 dark:text-[#f2e9de]">
                      {student.Course_End_Date ? new Date(student.Course_End_Date).toLocaleDateString() : "Pending"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pie Chart / Donut Chart */}
              <div className="relative flex flex-col items-center justify-center w-28 h-28 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r={radius} fill="transparent" strokeWidth="6" className="stroke-gray-100 dark:stroke-[#2c3242]" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r={radius} 
                    fill="transparent" 
                    strokeWidth="6" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset}
                    className="stroke-indigo-500 transition-all duration-1000 ease-out" 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">{courseProgress}%</span>
                  <span className="text-[9px] text-gray-500 font-medium uppercase mt-1 tracking-widest">Done</span>
                </div>
              </div>
            </div>
          </div>

          {/* Assignments */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] mb-4 flex items-center uppercase tracking-wider text-xs">
              <UserCheck className="w-4 h-4 mr-2 text-indigo-500" /> Assignments
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-[#252a38] rounded-lg border border-gray-100 dark:border-[#2c3242]">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Instructor</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{student.instructor?.name || "Not Assigned"}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-[#252a38] rounded-lg border border-gray-100 dark:border-[#2c3242]">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vehicle</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{student.car?.name || "Not Assigned"}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Driving License & RTO Test Card */}
          <div className="bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-900 dark:text-[#f2e9de] flex items-center uppercase tracking-wider">
                <Car className="w-4 h-4 mr-1.5 text-[#c1552c]" /> Driving License Test
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                student.licenseTestDate
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {student.licenseTestDate ? "SCHEDULED" : "NOT SET"}
              </span>
            </div>

            {student.licenseTestDate ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#2c3242]">
                  <span className="text-gray-500">Test Date:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {new Date(student.licenseTestDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 dark:border-[#2c3242]">
                  <span className="text-gray-500">Reporting Time:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {student.licenseTestTime || "10:00 AM"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 max-w-[140px] truncate" title={student.licenseTestLocation}>
                    {student.licenseTestLocation || "RTO Driving Track"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-[#8a8d96] mb-2">
                No driving license test date has been scheduled yet.
              </p>
            )}

            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-[#c1552c]/10 hover:bg-[#c1552c]/20 text-[#c1552c] border border-[#c1552c]/30 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{student.licenseTestDate ? "Resend Test Date Alert" : "Schedule & Send Test Date"}</span>
            </button>
          </div>

          {/* Documents Checklist (Mock UI) */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] mb-4 flex items-center uppercase tracking-wider text-xs">
              <CheckCircle className="w-4 h-4 mr-2 text-indigo-500" /> Documents Checklist
            </h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-[#252a38] dark:border-[#3c445a]" />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Learner's License</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-[#252a38] dark:border-[#3c445a]" />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">ID Proof Submitted</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-[#252a38] dark:border-[#3c445a]" />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Theory Test Passed</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-[#252a38] dark:border-[#3c445a]" />
                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">Final Road Test Passed</span>
              </label>
            </div>
          </div>
          
          {/* Internal Notes */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] mb-4 flex items-center uppercase tracking-wider text-xs">
              <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Internal Notes
            </h3>
            <textarea 
              className="w-full h-24 p-3 bg-gray-50 dark:bg-[#252a38] border border-gray-200 dark:border-[#3c445a] rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-colors"
              placeholder="Add private notes about this student's progress..."
            ></textarea>
            <div className="mt-2 flex justify-end">
              <button className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">Save Note</button>
            </div>
          </div>
          
        </div>

        {/* Right Column: Payments & Schedule */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Payment Overview */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] flex items-center uppercase tracking-wider text-xs">
                <Receipt className="w-4 h-4 mr-2 text-indigo-500" /> Payment Summary
              </h3>
              <div className="flex items-center space-x-2">
                {student.remaining_amount > 0 && (
                  <button 
                    onClick={markDueCompleted} 
                    disabled={isMarkingPaid}
                    className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded transition-colors shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                    {isMarkingPaid ? "Updating..." : "Mark Paid"}
                  </button>
                )}
                <button onClick={printReceipt} className="flex items-center text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded transition-colors shadow-sm">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  Print Receipt
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl border border-gray-100 dark:border-[#2c3242] bg-gray-50/50 dark:bg-[#252a38]">
                <p className="text-xs text-gray-500 mb-1">Total Fee</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">₹{student.Total_amount}</p>
              </div>
              <div className="p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/50 dark:bg-emerald-900/10">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Amount Paid</p>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">₹{student.Amount_paid}</p>
              </div>
              <div className="p-4 rounded-xl border border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/10">
                <p className="text-xs text-red-600 dark:text-red-400 mb-1">Remaining</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-300">₹{student.remaining_amount}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-2 flex justify-between text-sm font-medium">
              <span className="text-gray-900 dark:text-white">Payment Progress</span>
              <span className="text-emerald-600">{percentage}% Paid</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-[#2c3242] rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000" 
                style={{ width: `${Math.min(percentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Timetable / Schedule */}
          <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] mb-4 flex items-center uppercase tracking-wider text-xs">
              <Clock className="w-4 h-4 mr-2 text-indigo-500" /> Assigned Batches
            </h3>
            
            {loading ? (
              <p className="text-sm text-gray-500">Loading schedules...</p>
            ) : schedules.length > 0 ? (
              <div className="space-y-3">
                {schedules.map(sch => (
                  <div key={sch.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-[#2c3242] rounded-lg bg-gray-50 dark:bg-[#252a38]">
                    <div className="flex items-center space-x-3">
                      <div className="bg-white dark:bg-[#1e222d] p-2 rounded-md border border-gray-200 dark:border-[#3c445a] text-indigo-600">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{sch.Batch_time}</p>
                        <p className="text-xs text-gray-500">Duration: {sch.Duration_time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 dark:border-[#3c445a] rounded-lg">
                <p className="text-sm text-gray-500">No active schedule assigned yet.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* License Test Notification Modal */}
      {isLicenseModalOpen && (
        <SendLicenseTestModal
          isOpen={isLicenseModalOpen}
          student={student}
          onClose={() => setIsLicenseModalOpen(false)}
          onSent={(updated) => {
            setStudent(updated);
            if (onUpdate) onUpdate(updated);
          }}
        />
      )}
    </div>
  );
}
