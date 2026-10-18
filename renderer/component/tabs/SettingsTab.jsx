import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { fetchApi } from "../../lib/api";
import { toast } from "sonner";
import { Clock, Bell, Check, Sparkles, Send } from "lucide-react";

export function SettingsTab() {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('school');

  const [schoolData, setSchoolData] = useState({
    name: "Elite Driving School",
    mobile: "+1 (555) 123-4567",
    address: "",
    email: "",
    reminderDays: 10,
    enableOnboardingMsg: true,
    enableReminderMsg: true,
    enableCompletionMsg: true,
    workingStartTime: "09:00",
    workingEndTime: "19:00",
    enableAttendanceReminder: true,
    reminderBeforeMinutes: 60,
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetchApi("/school-setup")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setSchoolData({
            name: data.data.school_name || "",
            mobile: data.data.contact_Number || "",
            address: data.data.address || "",
            email: data.data.support_Email || "",
            reminderDays: data.data.reminderDays ?? 10,
            enableOnboardingMsg: data.data.enableOnboardingMsg ?? true,
            enableReminderMsg: data.data.enableReminderMsg ?? true,
            enableCompletionMsg: data.data.enableCompletionMsg ?? true,
            workingStartTime: data.data.workingStartTime || "09:00",
            workingEndTime: data.data.workingEndTime || "19:00",
            enableAttendanceReminder: data.data.enableAttendanceReminder ?? true,
            reminderBeforeMinutes: data.data.reminderBeforeMinutes ?? 60,
          });
        }
      })
      .catch(console.error);
  }, []);

  const handleTestNotification = async () => {
    try {
      const res = await fetchApi("/test-attendance-reminder", { method: "POST" });
      const data = await res.json();
      if (data && data.status) {
        window.ipc?.send("show-notification", {
          title: "⏰ Attendance Reminder",
          body: `Working day ends at ${schoolData.workingEndTime || "19:00"}. Today's employee attendance has not been marked yet! Please record attendance to maintain accurate records.`,
        });
        toast.success("Desktop notification sent! Check your system notification banner.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to trigger test notification");
    }
  };

  const handleSaveSchool = async () => {
    setSaving(true);
    setSaveMessage("");
    try {
      const res = await fetchApi("/school-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schoolData)
      });
      if (res.ok) {
        setSaveMessage("Saved successfully!");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* {t("Settings")} Sidebar */}
      <div className="w-full md:w-64 shrink-0">
        <div className="bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm p-4 transition-colors duration-300">
          <h2 className="text-sm font-bold text-gray-400 dark:text-[#5a5f6e] uppercase tracking-wider mb-4 px-3">Configuration</h2>
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveSection('school')}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'school' 
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-[#c1552c]' 
                  : 'text-gray-600 dark:text-[#a8967b] hover:bg-gray-100 dark:hover:bg-[#232734]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              School Profile
            </button>
            <button 
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'notifications' 
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-[#c1552c]' 
                  : 'text-gray-600 dark:text-[#a8967b] hover:bg-gray-100 dark:hover:bg-[#232734]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Notifications
            </button>
            <button 
              onClick={() => setActiveSection('billing')}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'billing' 
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-[#c1552c]' 
                  : 'text-gray-600 dark:text-[#a8967b] hover:bg-gray-100 dark:hover:bg-[#232734]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              Billing & Packages
            </button>
            <button 
              onClick={() => setActiveSection('security')}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeSection === 'security' 
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-[#c1552c]' 
                  : 'text-gray-600 dark:text-[#a8967b] hover:bg-gray-100 dark:hover:bg-[#232734]'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Security
            </button>
          </nav>
        </div>
      </div>

      {/* {t("Settings")} Content Area */}
      <div className="flex-1 bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm overflow-hidden transition-colors duration-300">
        
        {activeSection === 'school' && (
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] mb-6">School Profile</h2>
            <div className="space-y-6 max-w-2xl">
              
              {/* Logo Upload Mock */}
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gray-100 dark:bg-[#2c3242] border border-gray-200 dark:border-[#3a3d45] rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-[#5a5f6e]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span className="text-xs">Logo</span>
                </div>
                <div>
                  <button className="px-4 py-2 border border-gray-300 dark:border-[#3a3d45] text-gray-700 dark:text-[#cfd3da] rounded-lg hover:bg-gray-50 dark:hover:bg-[#2c3242] transition-colors text-sm font-medium mb-2 block">
                    Upload New Logo
                  </button>
                  <p className="text-xs text-gray-500 dark:text-[#8a8d96]">JPG, GIF or PNG. Max size of 2MB.</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#cfd3da] mb-1.5">School Name</label>
                  <input type="text" value={schoolData.name} onChange={e => setSchoolData({...schoolData, name: e.target.value})} className="w-full bg-transparent border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c] transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#cfd3da] mb-1.5">Support Email</label>
                  <input type="email" value={schoolData.email} onChange={e => setSchoolData({...schoolData, email: e.target.value})} className="w-full bg-transparent border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c] transition-colors" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#cfd3da] mb-1.5">Office Address</label>
                  <input type="text" value={schoolData.address} onChange={e => setSchoolData({...schoolData, address: e.target.value})} className="w-full bg-transparent border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c] transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#cfd3da] mb-1.5">Contact Phone</label>
                  <input type="text" value={schoolData.mobile} onChange={e => setSchoolData({...schoolData, mobile: e.target.value})} className="w-full bg-transparent border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c] transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#cfd3da] mb-1.5">Global Payment Reminder Delay (Days)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" value={schoolData.reminderDays} onChange={e => setSchoolData({...schoolData, reminderDays: parseInt(e.target.value) || 0})} className="w-24 bg-transparent border border-gray-300 dark:border-[#3a3d45] rounded-lg px-4 py-2.5 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c] transition-colors" />
                    <span className="text-sm text-gray-500">Days after Course Start</span>
                  </div>
                </div>

                {/* Working Hours & Daily Attendance Reminder Settings */}
                <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-[#2c3242]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-[#c1552c]" /> Working Hours & End-of-Day Attendance Reminder
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">
                        Set your school's daily operating hours. A reminder notification will automatically trigger ~1 hour before closing if attendance has not been recorded.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-orange-50/20 dark:bg-[#1a1e28]/50 p-4 rounded-xl border border-orange-100 dark:border-[#2c3242]">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-[#cfd3da] mb-1">
                        Work Start Time
                      </label>
                      <input
                        type="time"
                        value={schoolData.workingStartTime}
                        onChange={e => setSchoolData({...schoolData, workingStartTime: e.target.value})}
                        className="w-full bg-white dark:bg-[#1e222d] border border-gray-300 dark:border-[#3a3d45] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-[#cfd3da] mb-1">
                        Work End / Closing Time
                      </label>
                      <input
                        type="time"
                        value={schoolData.workingEndTime}
                        onChange={e => setSchoolData({...schoolData, workingEndTime: e.target.value})}
                        className="w-full bg-white dark:bg-[#1e222d] border border-gray-300 dark:border-[#3a3d45] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-[#cfd3da] mb-1">
                        Reminder Trigger Window
                      </label>
                      <select
                        value={schoolData.reminderBeforeMinutes}
                        onChange={e => setSchoolData({...schoolData, reminderBeforeMinutes: parseInt(e.target.value, 10)})}
                        className="w-full bg-white dark:bg-[#1e222d] border border-gray-300 dark:border-[#3a3d45] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f2e9de] focus:outline-none focus:ring-2 focus:ring-[#c1552c]"
                      >
                        <option value={30}>30 mins before closing</option>
                        <option value={45}>45 mins before closing</option>
                        <option value={60}>60 mins (1 hour) before closing</option>
                        <option value={90}>90 mins (1.5 hours) before closing</option>
                        <option value={120}>2 hours before closing</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="flex items-center space-x-2 pt-2">
                        <input
                          type="checkbox"
                          id="enableAttendanceReminder"
                          checked={schoolData.enableAttendanceReminder}
                          onChange={e => setSchoolData({...schoolData, enableAttendanceReminder: e.target.checked})}
                          className="w-4 h-4 text-[#c1552c] rounded border-gray-300 focus:ring-[#c1552c]"
                        />
                        <label htmlFor="enableAttendanceReminder" className="text-xs font-semibold text-gray-700 dark:text-[#cfd3da] cursor-pointer">
                          Enable Daily Reminder
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={handleTestNotification}
                        className="mt-2 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/40 dark:hover:bg-orange-900/60 text-[#c1552c] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Send a sample notification right now to see how it looks"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>Test Notification</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-[#2c3242] flex items-center justify-end gap-4">
                {saveMessage && <span className="text-sm text-green-600 dark:text-green-400 font-medium">{saveMessage}</span>}
                <button disabled={saving} onClick={handleSaveSchool} className="bg-[#c1552c] hover:bg-[#a64724] disabled:opacity-50 text-white font-medium rounded-lg px-6 py-2 transition-colors duration-200 shadow-md shadow-[#c1552c]/20">
                  {saving ? "Saving..." : t("Save Changes")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications & WhatsApp Automations */}
        {activeSection === 'notifications' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-500" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                  WhatsApp Automations
                </h2>
                <p className="text-sm text-gray-500 dark:text-[#8a8d96] mt-1">Configure automated messaging via WhatsApp Business API.</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600 dark:text-[#cfd3da]">API Status:</span>
                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded text-xs font-bold">Connected</span>
              </div>
            </div>

            <div className="space-y-4">
              
              {/* Automation 2: Joined / Onboarding */}
              <div className={`border rounded-xl p-5 transition-colors ${schoolData.enableOnboardingMsg ? 'border-[#c1552c]/30 bg-orange-50/10 dark:bg-orange-900/10' : 'border-gray-200 dark:border-[#3a3d45] bg-gray-50/50 dark:bg-[#171a22]/50'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-[#f2e9de]">1. Welcome & Onboarding</h3>
                    <p className="text-xs text-gray-500 dark:text-[#8a8d96]">Trigger: Student successfully enrolls.</p>
                  </div>
                  <div 
                    onClick={() => setSchoolData({...schoolData, enableOnboardingMsg: !schoolData.enableOnboardingMsg})}
                    className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${schoolData.enableOnboardingMsg ? 'bg-[#c1552c]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-transform ${schoolData.enableOnboardingMsg ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3a3d45] rounded-lg p-3 relative opacity-80">
                  <span className="absolute -top-2.5 left-3 bg-white dark:bg-[#1e222d] px-1 text-[10px] uppercase font-bold tracking-wider text-gray-400">Template Message</span>
                  <p className="text-sm text-gray-700 dark:text-[#cfd3da]">"🎉 Welcome to [School]! Hello [Name], your driving course enrollment has been successfully completed..."</p>
                </div>
              </div>

              {/* Automation 3: Payment Reminder */}
              <div className={`border rounded-xl p-5 transition-colors ${schoolData.enableReminderMsg ? 'border-[#c1552c]/30 bg-orange-50/10 dark:bg-orange-900/10' : 'border-gray-200 dark:border-[#3a3d45] bg-gray-50/50 dark:bg-[#171a22]/50'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-[#f2e9de]">2. Balance Payment Reminder</h3>
                    <p className="text-xs text-gray-500 dark:text-[#8a8d96]">Trigger: {schoolData.reminderDays} days after course start.</p>
                  </div>
                  <div 
                    onClick={() => setSchoolData({...schoolData, enableReminderMsg: !schoolData.enableReminderMsg})}
                    className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${schoolData.enableReminderMsg ? 'bg-[#c1552c]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-transform ${schoolData.enableReminderMsg ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3a3d45] rounded-lg p-3 relative opacity-80">
                  <span className="absolute -top-2.5 left-3 bg-white dark:bg-[#1e222d] px-1 text-[10px] uppercase font-bold tracking-wider text-gray-400">Template Message</span>
                  <p className="text-sm text-gray-700 dark:text-[#cfd3da]">"Hello [Name], This is a friendly reminder from [School] regarding your pending payment..."</p>
                </div>
              </div>

              {/* Automation 4: Course Completed */}
              <div className={`border rounded-xl p-5 transition-colors ${schoolData.enableCompletionMsg ? 'border-[#c1552c]/30 bg-orange-50/10 dark:bg-orange-900/10' : 'border-gray-200 dark:border-[#3a3d45] bg-gray-50/50 dark:bg-[#171a22]/50'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-[#f2e9de]">3. Course Completion</h3>
                    <p className="text-xs text-gray-500 dark:text-[#8a8d96]">Trigger: On course completion date.</p>
                  </div>
                  <div 
                    onClick={() => setSchoolData({...schoolData, enableCompletionMsg: !schoolData.enableCompletionMsg})}
                    className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${schoolData.enableCompletionMsg ? 'bg-[#c1552c]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-transform ${schoolData.enableCompletionMsg ? 'right-0.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3a3d45] rounded-lg p-3 relative opacity-80">
                  <span className="absolute -top-2.5 left-3 bg-white dark:bg-[#1e222d] px-1 text-[10px] uppercase font-bold tracking-wider text-gray-400">Template Message</span>
                  <p className="text-sm text-gray-700 dark:text-[#cfd3da]">"Hello [Name], 🎉 Congratulations on completing your driving course with [School]!..."</p>
                </div>
              </div>

              {/* Automation 4: End-of-Day Attendance Reminder */}
              <div className={`border rounded-xl p-5 transition-colors ${schoolData.enableAttendanceReminder ? 'border-[#c1552c]/30 bg-orange-50/10 dark:bg-orange-900/10' : 'border-gray-200 dark:border-[#3a3d45] bg-gray-50/50 dark:bg-[#171a22]/50'}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-[#f2e9de] flex items-center">
                      <Clock className="w-4 h-4 mr-1.5 text-[#c1552c]" /> 4. End-of-Day Attendance Reminder
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8a8d96]">
                      Trigger: {schoolData.reminderBeforeMinutes || 60} mins before closing time ({schoolData.workingEndTime || "19:00"}) if today's employee attendance has not been recorded.
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleTestNotification}
                      className="px-2.5 py-1 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3a3d45] hover:border-[#c1552c] text-[#c1552c] text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Bell className="w-3 h-3" />
                      <span>Test Alert</span>
                    </button>
                    <div 
                      onClick={() => setSchoolData({...schoolData, enableAttendanceReminder: !schoolData.enableAttendanceReminder})}
                      className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${schoolData.enableAttendanceReminder ? 'bg-[#c1552c]' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 shadow transition-transform ${schoolData.enableAttendanceReminder ? 'right-0.5' : 'left-0.5'}`}></div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3a3d45] rounded-lg p-3 relative opacity-80">
                  <span className="absolute -top-2.5 left-3 bg-white dark:bg-[#1e222d] px-1 text-[10px] uppercase font-bold tracking-wider text-gray-400">Desktop Notification & Banner Alert</span>
                  <p className="text-sm text-gray-700 dark:text-[#cfd3da]">
                    "⏰ Attendance Reminder: Working day ends at {schoolData.workingEndTime || '19:00'}. Today's employee attendance has not been marked yet! Please record attendance to maintain accurate salary & work records."
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 dark:border-[#2c3242] flex items-center justify-end gap-4 mt-6">
                {saveMessage && <span className="text-sm text-green-600 dark:text-green-400 font-medium">{saveMessage}</span>}
                <button disabled={saving} onClick={handleSaveSchool} className="bg-[#c1552c] hover:bg-[#a64724] disabled:opacity-50 text-white font-medium rounded-lg px-6 py-2 transition-colors duration-200 shadow-md shadow-[#c1552c]/20">
                  {saving ? "Saving..." : t("Save Changes")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Section */}
        {activeSection === 'billing' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] flex items-center">
                  <svg className="w-6 h-6 mr-2 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                  Billing & Licensing
                </h2>
                <p className="text-sm text-gray-500 dark:text-[#8a8d96] mt-1">Manage your software license and API usage costs.</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Software License */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">Pro License (Yearly)</h3>
                    <p className="text-sm text-indigo-700/80 dark:text-indigo-400/80 mt-1">Full access to CRM, Scheduling, and Analytics.</p>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-indigo-400 line-through">₹15,999</span>
                      <div className="text-2xl font-black text-indigo-900 dark:text-indigo-300 -mt-1">₹11,499</div>
                    </div>
                    <span className="inline-block mt-2 px-2.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">Active</span>
                  </div>
                </div>
              </div>

              {/* WhatsApp Charges */}
              <div className="border border-gray-200 dark:border-[#3a3d45] bg-white dark:bg-[#1e222d] rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <svg className="w-5 h-5 mr-2 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884Z"/></svg>
                  <h3 className="font-bold text-gray-900 dark:text-[#f2e9de]">WhatsApp API Usage & Charges</h3>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-lg p-4 mb-4">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    <strong>Note:</strong> WhatsApp messages are charged separately based on Meta's official pricing. The first 1,000 Service conversations per month are free. Utility and Marketing templates incur per-message costs according to Meta's regional rates.
                  </p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3d45]">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-[#cfd3da] mb-2 uppercase tracking-wide">Terms & Conditions</h4>
                  <ul className="space-y-2 text-xs text-gray-500 dark:text-[#8a8d96] list-disc pl-4">
                    <li>WhatsApp message delivery is dependent on Meta's servers and the recipient's network connectivity. Delivery is not guaranteed in 100% of cases.</li>
                    <li>If a student's number is invalid, blocked, or if they have not used WhatsApp recently, the message may fail to deliver.</li>
                    <li>Automated messages rely on approved templates. Altering templates without Meta's approval may result in message failures.</li>
                    <li>Our platform integrates directly with Meta's Official API. We are not responsible for account bans or restrictions placed by WhatsApp due to spam complaints.</li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] flex items-center">
                  <svg className="w-6 h-6 mr-2 text-shield-500 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  Security & Data Backup
                </h2>
                <p className="text-sm text-gray-500 dark:text-[#8a8d96] mt-1">Manage data protection, local backups, and system security.</p>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* Data Backup */}
              <div className="border border-gray-200 dark:border-[#3a3d45] bg-white dark:bg-[#1e222d] rounded-xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg mr-4">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-[#f2e9de]">Local Database Backup (Pendrive)</h3>
                      <p className="text-sm text-gray-500 dark:text-[#8a8d96] mt-1">Your data is stored securely on your local device. Please keep the provided USB Pendrive attached to automatically sync and replace your data backup securely.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        const ip = window.serverIpAddress || localStorage.getItem("serverIpAddress") || "localhost";
                        window.open(`http://${ip}:49215/api/backup/download`, "_blank");
                      }}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 font-medium rounded-lg px-4 py-2 text-sm transition-colors border border-blue-200 dark:border-blue-800"
                    >
                      Sync to Pendrive
                    </button>
                    <input 
                      type="file" 
                      id="db-upload"
                      className="hidden" 
                      accept=".db,.sqlite,application/octet-stream"
                      onChange={async (e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        const file = e.target.files[0];
                        const formData = new FormData();
                        formData.append("dbfile", file);
                        try {
                          const res = await fetchApi("/backup/restore", {
                            method: "POST",
                            body: formData
                          });
                          const data = await res.json();
                          if (data.success) {
                            if (window.ipc) {
                              window.ipc.send('restart-app');
                            } else {
                              alert("Database restored successfully! Please close and reopen the app.");
                            }
                          } else {
                            alert("Failed to restore: " + data.message);
                          }
                        } catch (err) {
                          console.error(err);
                          alert("Error restoring database.");
                        }
                      }} 
                    />
                    <button 
                      onClick={() => document.getElementById('db-upload').click()}
                      className="bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 font-medium rounded-lg px-4 py-2 text-sm transition-colors border border-red-200 dark:border-red-800"
                    >
                      Restore from Pendrive
                    </button>
                  </div>
                </div>
                
              </div>

              {/* Data Privacy & Compliance */}
              <div className="border border-gray-200 dark:border-[#3a3d45] bg-white dark:bg-[#1e222d] rounded-xl p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg mr-4">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-[#f2e9de]">Data Privacy & Security</h3>
                    <p className="text-sm text-gray-500 dark:text-[#8a8d96] mt-1">Information on how your student records are protected.</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#3a3d45]">
                  <ul className="space-y-3 text-sm text-gray-600 dark:text-[#cfd3da]">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span><strong>Local-First Storage:</strong> All student and instructor data remains exclusively on this device. No central cloud servers store your school's private CRM data.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span><strong>WhatsApp Meta Encryption:</strong> Messages sent through the official Meta API are processed securely by WhatsApp infrastructure.</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span><strong>Access Control:</strong> Administrative settings and API tokens are hidden and sandboxed to prevent unauthorized access.</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Fallback for other sections */}
        {activeSection !== 'school' && activeSection !== 'notifications' && activeSection !== 'billing' && activeSection !== 'security' && (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-gray-400 dark:text-[#5a5f6e]">
            <div className="text-5xl mb-4 opacity-50">⚙️</div>
            <h2 className="text-lg font-medium text-gray-600 dark:text-[#a8967b] capitalize">{activeSection} Preferences</h2>
            <p className="mt-1 text-sm">Configure your {activeSection} settings here.</p>
          </div>
        )}

      </div>
    </div>
  );
}
