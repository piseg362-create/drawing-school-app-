import React, { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { MiniCalendar } from '../ui/MiniCalendar';
import { fetchApi } from '../../lib/api';

export function OverviewTab({ onNavigate }) {
  const { t } = useTranslation();
  
  const [data, setData] = useState({
    activeStudents: 0,
    todayLessons: 0,
    availableCars: 0,
    totalCars: 0,
    settledAmount: "₹0",
    pendingAmount: "₹0",
    totalAmount: "₹0",
    collectionRate: 0,
    whatsappStats: {
      isConnected: false,
      totalSent: 0,
      monthSent: 0,
      pendingCount: 0,
      failedCount: 0,
      utilityCount: 0,
      marketingCount: 0,
      totalCostINR: "₹0.00",
      monthCostINR: "₹0.00",
      templateBreakdown: {},
      safeMode: false,
      monthlyPaymentAllowed: true,
      wabaId: null,
      phoneNumberId: null,
      displayPhoneNumber: null,
      verifiedName: null,
    },
    weeklyActivity: [
      { day: "Mon", classes: 0 },
      { day: "Tue", classes: 0 },
      { day: "Wed", classes: 0 },
      { day: "Thu", classes: 0 },
      { day: "Fri", classes: 0 },
      { day: "Sat", classes: 0 },
      { day: "Sun", classes: 0 },
    ],
    todaySchedules: []
  });
  const [loading, setLoading] = useState(true);
  const [isScheduleVisible, setIsScheduleVisible] = useState(false);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const response = await fetchApi("/dashboard");
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setData(result.data);
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const chartData = data.weeklyActivity;
  const maxClasses = Math.max(...chartData.map(d => d.classes), 1); // fallback to 1 to avoid NaN
  const schedule = data.todaySchedules;
  const wa = data.whatsappStats || {};

  if (loading) {
    return <div className="flex h-full items-center justify-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#c1552c] to-[#e0574a] rounded-xl p-6 shadow-md text-white flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold mb-1">{t("Good morning, Admin!")}</h2>
          <p className="text-white/80 text-sm">{t("Here is what is happening today.")}</p>
        </div>
        <div className="hidden sm:flex items-center space-x-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate("messages")}
              className="bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
            >
              <span>💬 Message Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[
          {
            title: "Active Students",
            value: data.activeStudents.toString(),
            trend: "Current",
            trendUp: true,
            icon: (
              <>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            ),
          },
          {
            title: "Today's Lessons",
            value: data.todayLessons.toString(),
            trend: "Scheduled",
            trendUp: true,
            icon: (
              <>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </>
            ),
          },
          {
            title: "Available Vehicles",
            value: `${data.availableCars} / ${data.totalCars}`,
            trend: `${data.totalCars - data.availableCars} in use`,
            trendUp: false,
            icon: (
              <>
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2a3 3 0 1 0 6 0h2a3 3 0 1 0 6 0zm-8-7H5.6L6.5 8h4.5v2zm4 0v-2h1.5c.3 0 .7.2.9.5l1.6 1.5H15z" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
              </>
            ),
          },
          {
            title: "Fees Collected",
            value: data.settledAmount,
            isFees: true,
            icon: (
              <>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </>
            ),
          },
          {
            title: "WhatsApp API",
            value: `${wa.totalSent || 0} Sent`,
            trend: `${wa.totalCostINR || "₹0.00"} spend`,
            trendUp: true,
            isWhatsApp: true,
            icon: (
              <>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </>
            ),
          },
        ].map((stat, i) => (
          <div
            key={i}
            className={`bg-white dark:bg-[#1e222d] p-5 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm transition-all duration-300 flex items-center justify-between ${
              stat.isWhatsApp 
                ? "cursor-pointer hover:border-[#128C7E]/50 hover:shadow-md" 
                : stat.isFees && onNavigate
                ? "cursor-pointer hover:border-[#c1552c]/50 hover:shadow-md"
                : ""
            }`}
            onClick={() => {
              if (stat.isWhatsApp && onNavigate) onNavigate("messages");
              if (stat.isFees && onNavigate) onNavigate("students");
            }}
          >
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-[#8a8d96] mb-1 truncate">{stat.title}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-[#f2e9de] truncate">{stat.value}</p>
              
              {stat.isFees ? (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px] leading-tight">
                    <span className="font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 px-1.5 py-0.5 rounded">
                      {data.pendingAmount} Due
                    </span>
                    <span className="text-gray-400 dark:text-[#8a8d96] text-[11px]">
                      of {data.totalAmount || "₹0"}
                    </span>
                  </div>
                  {/* Mini visual progress bar */}
                  <div className="w-full bg-gray-100 dark:bg-[#2c3242] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#c1552c] to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(data.collectionRate || 0, 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-1.5">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded inline-block whitespace-nowrap ${
                      stat.isWhatsApp
                        ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : stat.trendUp
                        ? "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                        : "text-gray-600 bg-gray-100 dark:bg-[#2c3242] dark:text-[#a8967b]"
                    }`}
                  >
                    {stat.trend}
                  </span>
                </div>
              )}
            </div>
            <div
              className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${
                stat.isWhatsApp
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-[#128C7E]"
                  : "bg-orange-50 dark:bg-[#232734] text-[#c1552c]"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {stat.icon}
              </svg>
            </div>
          </div>
        ))}
      </div>

    

      {/* Charts & Tables Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Activity Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex flex-col transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-[#f2e9de]">{t("Weekly Classes Activity")}</h3>
              <p className="text-sm text-gray-500 dark:text-[#8a8d96]">Total lessons conducted over the last 7 days</p>
            </div>
            <select className="bg-gray-50 dark:bg-[#171a22] border border-gray-300 dark:border-[#3a3d45] rounded-md px-3 py-1.5 text-sm text-gray-700 dark:text-[#cfd3da] focus:outline-none focus:ring-1 focus:ring-[#c1552c]">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          
          <div className="flex-1 flex items-end space-x-2 pt-8 border-b border-gray-100 dark:border-[#2c3242] pb-2 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-20">
              <div className="border-t border-gray-300 dark:border-[#5a5f6e] w-full"></div>
              <div className="border-t border-gray-300 dark:border-[#5a5f6e] w-full"></div>
              <div className="border-t border-gray-300 dark:border-[#5a5f6e] w-full"></div>
              <div className="border-t border-gray-300 dark:border-[#5a5f6e] w-full"></div>
            </div>

            {chartData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center group relative z-10 h-full justify-end">
                 <div className="w-full px-1 sm:px-4 flex justify-center items-end h-[200px]">
                   <div 
                     className="w-full max-w-[40px] bg-orange-100 dark:bg-[#c1552c]/20 rounded-t-md group-hover:bg-[#c1552c] transition-colors duration-300 relative"
                     style={{ height: `${(d.classes / maxClasses) * 100}%` }}
                   >
                     <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-gray-700 dark:text-[#f2e9de] bg-white dark:bg-[#2c3242] px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                       {d.classes}
                     </span>
                   </div>
                 </div>
                 <span className="text-xs font-medium text-gray-500 dark:text-[#8a8d96] mt-4">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Today's Schedule Mini */}
        <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex flex-col transition-colors duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#f2e9de]">{t("Today's Schedule")}</h3>
            {schedule.length > 5 && (
              <button onClick={() => setIsScheduleVisible(!isScheduleVisible)} className="text-sm font-medium text-[#c1552c] hover:underline">
                {isScheduleVisible ? t("Show Less") : t("View All")}
              </button>
            )}
          </div>
          
          <div className={`space-y-4 flex-1 pr-1 ${isScheduleVisible ? 'overflow-y-auto max-h-[400px]' : 'overflow-hidden'}`}>
            {schedule.length > 0 ? (isScheduleVisible ? schedule : schedule.slice(0, 5)).map((lesson, i) => (
              <div key={i} className="flex items-start p-3 rounded-xl border border-gray-100 dark:border-[#2c3242] hover:shadow-md transition-all group bg-gray-50/50 dark:bg-[#171a22]/50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 mr-3 ${lesson.color}`}>
                  {lesson.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-gray-900 dark:text-[#f2e9de] truncate group-hover:text-[#c1552c] transition-colors">{lesson.name}</p>
                    <span className="text-xs font-semibold text-gray-500 dark:text-[#8a8d96]">{lesson.time}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5 truncate">{lesson.type} • {lesson.car}</p>
                </div>
              </div>
            )) : (
              <p className="text-center text-sm text-gray-500 py-4">No lessons scheduled for today.</p>
            )}
          </div>
          
          <button className="mt-4 w-full py-2.5 rounded-lg border-2 border-dashed border-gray-300 dark:border-[#3a3d45] text-gray-500 dark:text-[#8a8d96] hover:bg-gray-50 dark:hover:bg-[#232734] hover:text-[#c1552c] hover:border-[#c1552c] transition-colors font-medium text-sm">
            + Book New Lesson
          </button>
        </div>
      </div>


        {/* WhatsApp Cloud API Live Delivery & Spend Card */}
      <div className="bg-white dark:bg-[#1e222d] rounded-xl border border-gray-200 dark:border-[#2c3242] p-5 shadow-sm transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 dark:border-[#2c3242] gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#128C7E]/10 dark:bg-[#128C7E]/20 text-[#128C7E] flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-[#f2e9de]">
                  WhatsApp Cloud API — Delivery & Meta Spend
                </h3>
                {wa.switchOffMode ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                    Switch Off (Sending Paused)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    Active on Meta
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">
                Real-time delivery counts and Meta conversation billing (₹{wa.utilityRate ? wa.utilityRate.toFixed(2) : '0.15'} INR per utility message in India)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onNavigate && (
              <button
                onClick={() => onNavigate("messages")}
                className="text-xs font-medium text-[#c1552c] hover:bg-orange-50 dark:hover:bg-[#2c3242] px-3 py-1.5 rounded-lg border border-[#c1552c]/30 transition-colors"
              >
                View Message Logs
              </button>
            )}
            <a
              href="https://business.facebook.com/billing_hub"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 text-xs font-medium bg-gray-50 dark:bg-[#171a22] hover:bg-gray-100 dark:hover:bg-[#252a38] text-gray-700 dark:text-[#cfd3da] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#3a3d45] transition-colors"
              title="Open Meta Business Manager Billing Hub"
            >
              <span>Meta Invoices</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          </div>
        </div>

        {/* 4 Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {/* Metric 1: Total Sent */}
          <div className="bg-gray-50/70 dark:bg-[#171a22]/70 p-3.5 rounded-xl border border-gray-100 dark:border-[#2c3242]">
            <span className="text-xs font-medium text-gray-500 dark:text-[#8a8d96]">Total Messages Delivered</span>
            <div className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] mt-1">
              {wa.totalSent || 0}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              100% verified Meta delivery
            </div>
          </div>

          {/* Metric 2: Estimated Meta Cost */}
          <div className="bg-gray-50/70 dark:bg-[#171a22]/70 p-3.5 rounded-xl border border-gray-100 dark:border-[#2c3242]">
            <span className="text-xs font-medium text-gray-500 dark:text-[#8a8d96]">Total Meta Bill</span>
            <div className="text-xl font-bold text-gray-900 dark:text-[#f2e9de] mt-1">
              {wa.totalCostINR || "₹0.00"}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-[#8a8d96] mt-1">
              This Month: <strong className="text-gray-700 dark:text-gray-300">{wa.monthCostINR || "₹0.00"}</strong>
            </div>
          </div>

          {/* Metric 3: Template Breakdown */}
          <div className="bg-gray-50/70 dark:bg-[#171a22]/70 p-3.5 rounded-xl border border-gray-100 dark:border-[#2c3242]">
            <span className="text-xs font-medium text-gray-500 dark:text-[#8a8d96]">Automations Breakdown</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium text-xs">
                Onboarding: {wa.templateBreakdown?.onboarding || 0}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium text-xs">
                Reminder: {wa.templateBreakdown?.reminder || 0}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium text-xs">
                Completion: {wa.templateBreakdown?.completion || 0}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-medium text-xs">
                License Test: {wa.templateBreakdown?.license_test || 0}
              </span>
            </div>
          </div>

          {/* Metric 4: Monthly Payment Status */}
          <div className="bg-gray-50/70 dark:bg-[#171a22]/70 p-3.5 rounded-xl border border-gray-100 dark:border-[#2c3242] flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-gray-500 dark:text-[#8a8d96]">{t("WhatsApp Billing")}</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px] border border-emerald-200/60 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ALLOWED
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-[#f2e9de] mt-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#128C7E] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t("Monthly Payment Allowed")}</span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-[#8a8d96] mt-1 flex items-center justify-between">
              <span>{t("Postpaid • No message limit")}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{wa.monthSent || 0} {t("sent this mo")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex flex-col transition-colors duration-300">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#f2e9de] mb-4">{t("Quick Shortcuts")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-orange-50 dark:bg-[#c1552c]/10 text-[#c1552c] hover:bg-orange-100 dark:hover:bg-[#c1552c]/20 transition-colors border border-orange-100 dark:border-[#c1552c]/20">
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="text-sm font-medium">New Student</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-100 dark:border-blue-900/30">
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="text-sm font-medium">Book Lesson</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors border border-green-100 dark:border-green-900/30">
              <svg className="w-6 h-6 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm font-medium">Log Payment</span>
            </button>
            <button
              onClick={onNavigate ? () => onNavigate("messages") : undefined}
              className="flex flex-col items-center justify-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-[#128C7E] hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors border border-emerald-100 dark:border-emerald-900/30"
            >
              <svg className="w-6 h-6 mb-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
              </svg>
              <span className="text-sm font-medium">WhatsApp Logs</span>
            </button>
          </div>
        </div>

        {/* Mini Calendar (Middle Column) */}
        <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex flex-col transition-colors duration-300">
          <h3 className="text-lg font-bold text-gray-900 dark:text-[#f2e9de] mb-4">{t("Upcoming Schedule")}</h3>
          <MiniCalendar />
        </div>

        {/* Action Items / Alerts */}
        <div className="bg-white dark:bg-[#1e222d] p-6 rounded-xl border border-gray-200 dark:border-[#2c3242] shadow-sm flex flex-col transition-colors duration-300">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-[#f2e9de]">{t("Needs Attention")}</h3>
            <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-bold">3 Tasks</span>
          </div>
          
          <div className="space-y-3">
            {/* Alert 1 */}
            <div className="flex items-start justify-between p-3 rounded-lg border border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 text-red-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de]">Vehicle #4 (Honda Civic) Due for Oil Change</p>
                  <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">Odometer crossed 28,000 miles.</p>
                </div>
              </div>
              <button className="text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors">Schedule Service</button>
            </div>

            {/* Alert 2 */}
            <div className="flex items-start justify-between p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/20 bg-yellow-50/50 dark:bg-yellow-900/10">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 text-yellow-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de]">Emma Davis missed payment</p>
                  <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">Invoice #INV-492 is 3 days overdue.</p>
                </div>
              </div>
              <button className="text-xs font-medium text-yellow-700 hover:text-yellow-900 dark:text-yellow-500 dark:hover:text-yellow-400 transition-colors">Send Reminder</button>
            </div>

            {/* Alert 3 */}
            <div className="flex items-start justify-between p-3 rounded-lg border border-blue-100 dark:border-blue-900/20 bg-blue-50/50 dark:bg-blue-900/10">
              <div className="flex items-start space-x-3">
                <div className="mt-0.5 text-blue-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#f2e9de]">3 Students completed Road Test Prep</p>
                  <p className="text-xs text-gray-500 dark:text-[#8a8d96] mt-0.5">Ready for final evaluation and certification.</p>
                </div>
              </div>
              <button className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">View Details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverviewTab;
