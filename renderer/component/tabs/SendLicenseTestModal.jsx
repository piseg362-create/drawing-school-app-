"use client";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../component/ui/dialog";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  FileCheck,
  Send,
  ExternalLink,
  Car,
  User,
  Phone,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";

const TIME_OPTIONS = [
  "08:30 AM",
  "09:30 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "02:00 PM",
  "03:30 PM",
];

const PRESET_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "mr", name: "मराठी (Marathi)" },
  { code: "hi", name: "हिन्दी (Hindi)" },
  { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
  { code: "te", name: "తెలుగు (Telugu)" },
  { code: "ta", name: "தமிழ் (Tamil)" },
];

export function SendLicenseTestModal({ isOpen, onClose, student, onSent }) {
  const { t } = useTranslation();

  // Tomorrow's date as default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split("T")[0];

  const [testDate, setTestDate] = useState(defaultDateStr);
  const [testTime, setTestTime] = useState("10:00 AM");
  const [location, setLocation] = useState("RTO Driving Test Track");
  const [documents, setDocuments] = useState(
    "Original Learning License (LL), Aadhaar Card, 2 Photos"
  );
  const [notes, setNotes] = useState("");
  const [language, setLanguage] = useState("mr");
  const [isSending, setIsSending] = useState(false);

  // Initialize from student existing test data if available
  useEffect(() => {
    if (student) {
      if (student.licenseTestDate) {
        try {
          const d = new Date(student.licenseTestDate);
          if (!isNaN(d.getTime())) {
            setTestDate(d.toISOString().split("T")[0]);
          }
        } catch {
          setTestDate(defaultDateStr);
        }
      } else {
        setTestDate(defaultDateStr);
      }

      if (student.licenseTestTime) {
        setTestTime(student.licenseTestTime);
      } else {
        setTestTime("10:00 AM");
      }

      if (student.licenseTestLocation) {
        setLocation(student.licenseTestLocation);
      } else {
        setLocation("RTO Driving Test Track");
      }
    }
  }, [student, isOpen]);

  if (!student) return null;

  // Format date preview
  let formattedDisplayDate = testDate;
  try {
    const [y, m, d] = testDate.split("-");
    const dObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    if (!isNaN(dObj.getTime())) {
      formattedDisplayDate = format(dObj, "dd MMM yyyy");
    }
  } catch {
    formattedDisplayDate = testDate;
  }

  // Generate live message preview text based on language
  const getPreviewText = () => {
    const studentName = student.name || "Student";
    const schoolName = "Driving School";

    if (language === "mr") {
      return `🚗 *ड्रायव्हिंग लायसन्स चाचणी सूचना*\n\nनमस्कार ${studentName},\n\nआपली आरटीओ ड्रायव्हिंग लायसन्स चाचणी निश्चित करण्यात आली आहे.\n\n📅 *चाचणी तारीख:* ${formattedDisplayDate}\n⏰ *उपस्थित राहण्याची वेळ:* ${testTime}\n📍 *ठिकाण / आरटीओ ग्राउंड:* ${location}\n📋 *आवश्यक कागदपत्रे:* ${documents}${
        notes ? `\n\n*टीप:* ${notes}` : ""
      }\n\nकृपया दिलेल्या वेळेच्या १५ मिनिटे आधी उपस्थित राहावे. परीक्षेसाठी मनःपूर्वक शुभेच्छा! 👍\n\n- ${schoolName}`;
    }

    if (language === "hi") {
      return `🚗 *ड्राइविंग लाइसेंस टेस्ट सूचना*\n\nनमस्ते ${studentName},\n\nआपका आरटीओ ड्राइविंग लाइसेंस टेस्ट निर्धारित किया गया है।\n\n📅 *टेस्ट की तारीख:* ${formattedDisplayDate}\n⏰ *उपस्थिति का समय:* ${testTime}\n📍 *स्थान / आरटीओ ग्राउंड:* ${location}\n📋 *आवश्यक दस्तावेज:* ${documents}${
        notes ? `\n\n*नोट:* ${notes}` : ""
      }\n\nकृपया निर्धारित समय से १५ मिनट पहले पहुंचे। शुभकामनाएं! 👍\n\n- ${schoolName}`;
    }

    return `🚗 *Driving License Test Schedule Notification*\n\nHello ${studentName},\n\nYour RTO Driving License Test has been scheduled.\n\n📅 *Test Date:* ${formattedDisplayDate}\n⏰ *Reporting Time:* ${testTime}\n📍 *Location / Track:* ${location}\n📋 *Documents Required:* ${documents}${
      notes ? `\n\n*Note:* ${notes}` : ""
    }\n\nPlease reach 15 minutes before your scheduled time. Drive safely and all the best! 👍\n\n- ${schoolName}`;
  };

  // Direct WhatsApp Web / App link
  const cleanMobile = String(student.mobile || "").replace(/\D/g, "");
  const formattedMobile =
    cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
  const directWhatsAppUrl = `https://api.whatsapp.com/send?phone=${formattedMobile}&text=${encodeURIComponent(
    getPreviewText()
  )}`;

  const handleSendNotification = async () => {
    if (!testDate) {
      toast.error("Please select a test date.");
      return;
    }

    setIsSending(true);
    try {
      const res = await fetchApi(`/students/${student.id}/send-license-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testDate,
          testTime,
          location,
          documents,
          notes,
          language,
        }),
      });

      const data = await res.json();
      if (data && data.status) {
        toast.success(
          data.message || "License test notification sent successfully!"
        );
        if (onSent) {
          onSent(data.data?.student || { ...student, licenseTestDate: testDate, licenseTestTime: testTime, licenseTestLocation: location });
        }
        onClose();
      } else {
        toast.error(data.message || "Failed to send license test notification");
      }
    } catch (err) {
      console.error("Error sending license test notification:", err);
      toast.error("Network error while sending notification");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-gray-100 dark:border-[#2c3242] bg-gradient-to-r from-orange-50/70 to-amber-50/40 dark:from-[#c1552c]/10 dark:to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c1552c] text-white flex items-center justify-center shadow-sm">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-[#f2e9de] flex items-center gap-2">
                <span>{t("Send License Test Schedule")}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40">
                  RTO Exam
                </span>
              </DialogTitle>
              <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">
                Send WhatsApp notification with test date, reporting time, and location to the student.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          {/* Student Info Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#171a22] border border-gray-200/80 dark:border-[#2c3242]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                {student.name?.charAt(0) || "S"}
              </div>
              <div>
                <div className="font-bold text-sm text-gray-900 dark:text-[#f2e9de] flex items-center gap-2">
                  <span>{student.name}</span>
                  {student.car?.name && (
                    <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                      • {student.car.name}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-[#8a8d96] flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3" />
                  <span>{student.mobile}</span>
                  {student.package_name && (
                    <span className="text-gray-400">• {student.package_name}</span>
                  )}
                </div>
              </div>
            </div>

            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
              {student.Enrollment_status || "Active"}
            </span>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Test Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-[#c1552c]" />
                <span>Test Date *</span>
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-[#3c445a] bg-white dark:bg-[#171a22] text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
              />
            </div>

            {/* Reporting Time */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#c1552c]" />
                <span>Reporting Time *</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={testTime}
                  onChange={(e) => setTestTime(e.target.value)}
                  placeholder="e.g. 10:00 AM"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-[#3c445a] bg-white dark:bg-[#171a22] text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                />
              </div>
            </div>
          </div>

          {/* Quick Time Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] text-gray-400 mr-1 font-medium">Quick Times:</span>
            {TIME_OPTIONS.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setTestTime(time)}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                  testTime === time
                    ? "bg-[#c1552c] text-white border-[#c1552c]"
                    : "bg-gray-100 dark:bg-[#2c3242] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#3a3d45] hover:bg-gray-200"
                }`}
              >
                {time}
              </button>
            ))}
          </div>

          {/* Location & Track */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#c1552c]" />
              <span>Test Location / RTO Ground *</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. RTO Driving Test Track, Alandi Road"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-[#3c445a] bg-white dark:bg-[#171a22] text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
            />
          </div>

          {/* Documents to bring */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-[#c1552c]" />
              <span>Required Documents</span>
            </label>
            <input
              type="text"
              value={documents}
              onChange={(e) => setDocuments(e.target.value)}
              placeholder="e.g. Original Learning License (LL), Aadhaar Card, 2 Photos"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-[#3c445a] bg-white dark:bg-[#171a22] text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
            />
          </div>

          {/* Language Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <span>Message Language</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguage(l.code)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                    language === l.code
                      ? "bg-[#128C7E] text-white border-[#128C7E] shadow-xs"
                      : "bg-gray-50 dark:bg-[#252a38] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#3a3d45] hover:bg-gray-100"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          {/* Live WhatsApp Message Preview Bubble */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <span className="flex items-center gap-1 text-[#128C7E]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>WhatsApp Live Preview</span>
              </span>
              <span className="text-[11px] text-gray-400 font-normal">
                To: {student.name} (+{formattedMobile})
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-[#128C7E]/10 border border-emerald-200/80 dark:border-emerald-800/40 text-xs font-sans text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed shadow-inner">
              {getPreviewText()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 px-5 border-t border-gray-100 dark:border-[#2c3242] bg-gray-50/60 dark:bg-[#171a22]/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2c3242] rounded-lg transition-colors order-2 sm:order-1"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2 order-1 sm:order-2">
            {/* Fallback Direct WhatsApp Link */}
            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors"
              title="Open WhatsApp Web or app with pre-filled test date message"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </a>

            {/* Send via Cloud API */}
            <button
              type="button"
              onClick={handleSendNotification}
              disabled={isSending}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#128C7E] hover:bg-[#0e7064] text-white transition-all shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? "Sending Notification..." : "Send via WhatsApp"}</span>
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendLicenseTestModal;
