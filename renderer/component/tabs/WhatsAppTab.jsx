"use client";

import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { MessageCircle, ExternalLink, ShieldCheck, RefreshCw, Globe, Check, Layers, Eye, Smartphone, Sparkles, Link2, CheckCircle2, AlertCircle, Sliders, Power, PowerOff, IndianRupee, Wallet } from "lucide-react";
import { CarLoader } from "../../../component/loader/CarLoader";
import { fetchApi, WHATSAPP_VERIFY_SETUP_API } from "../../lib/api";

export function WhatsAppTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [secureUrl, setSecureUrl] = useState("");
  
  // State for check button
  const [checkLoading, setCheckLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [hasStartedSetup, setHasStartedSetup] = useState(false);
  
  // State for sub-tabs ('connection' | 'templates')
  const [activeSubTab, setActiveSubTab] = useState("connection");
  
  // Safe mode & monthly budget settings
  const [safeMode, setSafeMode] = useState(false);
  const [safeModeLoading, setSafeModeLoading] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(150);
  const [utilityRate, setUtilityRate] = useState(0.15);
  const [utilityRateUpdating, setUtilityRateUpdating] = useState(false);
  const [currentMonthSpend, setCurrentMonthSpend] = useState(0);
  const [monthSentCount, setMonthSentCount] = useState(0);
  const [budgetReached, setBudgetReached] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [customBudgetInput, setCustomBudgetInput] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("mr");
  const [langUpdating, setLangUpdating] = useState(false);
  
  // Switch Off Mode (Don't Send Messages / Master Kill-Switch)
  const [switchOffMode, setSwitchOffMode] = useState(false);
  const [switchOffLoading, setSwitchOffLoading] = useState(false);
  
  const fetchSettings = async () => {
    try {
      const res = await fetchApi("/whatsapp/settings");
      const data = await res.json();
      if (data.status) {
        setSafeMode(Boolean(data.data.safeMode));
        setSwitchOffMode(Boolean(data.data.switchOffMode));
        setDefaultLanguage(data.data.defaultLanguage || "mr");
        setMonthlyBudget(Number(data.data.monthlyBudget) || 150);
        setUtilityRate(Number(data.data.utilityRate) || 0.15);
        setCurrentMonthSpend(Number(data.data.currentMonthSpend) || 0);
        setMonthSentCount(Number(data.data.monthSentCount) || 0);
        setBudgetReached(Boolean(data.data.budgetReached));
        setHasStartedSetup(true);
        setStatusMessage({
          type: 'success',
          text: "WhatsApp integration is active and verified."
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDefaultLanguageChange = async (e) => {
    const newLang = e.target.value;
    setDefaultLanguage(newLang);
    setLangUpdating(true);
    try {
      await fetchApi("/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguage: newLang })
      });
    } catch (err) {
      console.error("Failed to update default language:", err);
    } finally {
      setLangUpdating(false);
    }
  };
  
  const toggleSafeMode = async () => {
    setSafeModeLoading(true);
    try {
      const newValue = !safeMode;
      const res = await fetchApi("/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ safeMode: newValue })
      });
      if (res.ok) {
        setSafeMode(newValue);
        fetchSettings();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSafeModeLoading(false);
    }
  };

  const handleUpdateBudget = async (newBudget) => {
    const val = Number(newBudget);
    if (isNaN(val) || val <= 0) return;
    setBudgetSaving(true);
    try {
      const res = await fetchApi("/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyBudget: val })
      });
      if (res.ok) {
        setMonthlyBudget(val);
        setCustomBudgetInput("");
        fetchSettings();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBudgetSaving(false);
    }
  };

  const handleUpdateUtilityRate = async (newRate) => {
    const val = Number(newRate);
    if (isNaN(val) || val <= 0) return;
    setUtilityRateUpdating(true);
    try {
      const res = await fetchApi("/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utilityRate: val })
      });
      if (res.ok) {
        setUtilityRate(val);
        fetchSettings();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUtilityRateUpdating(false);
    }
  };

  const toggleSwitchOffMode = async () => {
    setSwitchOffLoading(true);
    try {
      const newValue = !switchOffMode;
      const res = await fetchApi("/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ switchOffMode: newValue })
      });
      if (res.ok) {
        setSwitchOffMode(newValue);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSwitchOffLoading(false);
    }
  };

  useEffect(() => {
    // 1. Security Check: Retrieve user object from localStorage
    let userObj = null;
    try {
      const userStr = localStorage.getItem("user");
  
      if (userStr) {
        userObj = JSON.parse(userStr);
      }
      
      const started = localStorage.getItem("whatsappSetupStarted");
      if (started === "true") {
        setHasStartedSetup(true);
      }
      // Check if WhatsApp is already configured for this school
      fetchSettings();
    } catch (e) {
      console.error("Failed to parse user from local storage");
    }
    
    // 2. Check if user object and accesstoken exist -> Redirect to logout if missing
    if (!userObj || !userObj.accessToken) {
      console.warn("No access token found in user object. Logging out.");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("isDemoMode");
      localStorage.removeItem("demoStartDate");
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      router.push("/login");
      return;
    }

    // 3. Construct the backend URL with the requested parameters from the user object
    const backendUrl = new URL("https://backend-for-drawing-school.vercel.app/whatsapp/connect");
    
    if (userObj.id) backendUrl.searchParams.append("id", userObj.id);
    if (userObj.userId) backendUrl.searchParams.append("userId", userObj.userId);
    if (userObj.email) backendUrl.searchParams.append("email", userObj.email);
    if (userObj.businessName) backendUrl.searchParams.append("businessName", userObj.businessName);
    if (userObj.accessToken) backendUrl.searchParams.append("accessToken", userObj.accessToken);

    setSecureUrl(backendUrl.toString());
    setLoading(false);
  }, [router]);

  const handleLaunch = () => {
    if (!secureUrl) return;
    localStorage.setItem("whatsappSetupStarted", "true");
    setHasStartedSetup(true);
    window.open(secureUrl, "_blank", "noopener,noreferrer");
  };

  const handleCheckData = async () => {
    setCheckLoading(true);
    setStatusMessage(null);
    try {
      const userStr = localStorage.getItem("user");
      let userId = "";
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userId = userObj.id || userObj.userId || "";
      }

      const res = await fetch(`${WHATSAPP_VERIFY_SETUP_API}?userId=${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      console.log("data", data);

      if (data.status && data.data) {
        setStatusMessage({
          type: 'success',
          text: data.message || "WhatsApp credentials verified successfully!"
        });
        
        try {
          const syncRes = await fetchApi("/whatsapp/save-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(data.data)
          });
          const syncData = await syncRes.json();
          console.log("Local sync result:", syncData);
        } catch (syncErr) {
          console.error("Failed to sync to local DB:", syncErr);
        }
      } else {
        setStatusMessage({
          type: 'error',
          text: data.message || "Setup not complete yet. Please complete configuration."
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: "Could not connect to the verification server. Try again later."
      });
    } finally {
      setCheckLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <CarLoader />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 p-4">
      {/* Top Header & Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#128C7E]/10 dark:bg-[#128C7E]/20 text-[#128C7E] rounded-2xl flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {t("WhatsApp Setup")}
              </h1>
              {switchOffMode ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800/80 animate-pulse">
                  <PowerOff className="w-3.5 h-3.5" />
                  Switch Off Mode (Sending Paused)
                </span>
              ) : hasStartedSetup ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active & Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                  Setup Required
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Manage Meta Cloud API integration, regional multi-language templates, and automated delivery policies.
            </p>
          </div>
        </div>

        {/* Sub-tab Pill Switcher */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-[#151922] rounded-xl border border-gray-200/80 dark:border-[#2c3242] self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("connection")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "connection"
                ? "bg-white dark:bg-[#2c3242] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#c1552c]" />
            <span>Connection & Settings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("templates")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "templates"
                ? "bg-white dark:bg-[#2c3242] text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#128C7E]" />
            <span>Templates & Preview</span>
          </button>
        </div>
      </div>

      {/* Alert Banner when Switch Off Mode is Active */}
      {switchOffMode && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-rose-500/20">
              <PowerOff className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                <span>Switch Off Mode is Active (Don't Send Messages)</span>
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">
                All automated WhatsApp messages are currently stopped and blocked from reaching Meta Cloud API. No WhatsApp charges or budget will be incurred.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleSwitchOffMode}
            disabled={switchOffLoading}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#1e222d] hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95 disabled:opacity-70 shadow-sm"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Resume Sending</span>
          </button>
        </div>
      )}

      {/* Sub-tab 1: Connection & Settings */}
      {activeSubTab === "connection" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
          {/* Card 1: Meta Cloud API Integration */}
          <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#128C7E]/10 dark:bg-[#128C7E]/20 text-[#128C7E] flex items-center justify-center">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">
                      Meta Cloud API Connection
                    </h3>
                    <p className="text-xs text-gray-500">Dedicated OAuth security portal</p>
                  </div>
                </div>
                {hasStartedSetup ? (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                    Verified
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/40">
                    Not Connected
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-600 dark:text-[#a8967b] leading-relaxed mb-6">
                To protect your school's data, WhatsApp configuration is securely processed on our dedicated backend servers. Launch the portal to link your phone number with Meta Cloud API.
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleLaunch}
                  className="w-full inline-flex items-center justify-center bg-[#c1552c] hover:bg-[#a84a26] text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-md shadow-[#c1552c]/20 hover:shadow-[#c1552c]/30 active:scale-[0.99] text-sm"
                >
                  <span>Launch Security Portal</span>
                  <ExternalLink className="w-4 h-4 ml-2" />
                </button>

                <button
                  type="button"
                  onClick={handleCheckData}
                  disabled={checkLoading}
                  className="w-full inline-flex items-center justify-center bg-gray-50 dark:bg-[#2c3242] hover:bg-gray-100 dark:hover:bg-[#363d4f] text-gray-900 dark:text-white border border-gray-200 dark:border-[#3c445a] font-medium py-2.5 px-4 rounded-xl transition-all shadow-sm active:scale-[0.99] text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{checkLoading ? "Checking Credentials..." : "Verify Setup Status"}</span>
                  <RefreshCw className={`w-4 h-4 ml-2 text-gray-500 dark:text-gray-400 ${checkLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {statusMessage && (
                <div className={`mt-4 p-3 text-xs font-medium rounded-xl border flex items-center gap-2 ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'
                }`}>
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#2c3242] flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Session secured via token authentication</span>
              </div>
            </div>
          </div>

          {/* Card 2: Messaging Policies & Safe Mode */}
          <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-[#c1552c] flex items-center justify-center">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Messaging Policies & Defaults
                  </h3>
                  <p className="text-xs text-gray-500">Budget protection, quota safety & default language</p>
                </div>
              </div>

              {/* Switch Off Mode (Don't Send Messages) Emergency Kill-Switch */}
              <div className={`p-4 rounded-xl border transition-all mb-4 ${
                switchOffMode
                  ? "border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30 shadow-sm"
                  : "border-gray-200 dark:border-[#3c445a] bg-gray-50/50 dark:bg-[#171a22]/50"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <PowerOff className={`w-4 h-4 ${switchOffMode ? "text-rose-600 dark:text-rose-400" : "text-gray-500"}`} />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Switch Off Mode (Don't Send Messages)
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      switchOffMode
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40"
                    }`}>
                      {switchOffMode ? "SENDING PAUSED" : "ACTIVE / DISPATCHING"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSwitchOffMode}
                    disabled={switchOffLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      switchOffMode ? 'bg-rose-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        switchOffMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Master kill-switch that completely halts message dispatch to Meta Cloud API. Use this if your school has queued a large volume of messages (e.g. 10,000+ messages) or when you want to prevent exceeding your budget.
                </p>
              </div>

              {/* Safe Mode (Monthly Spend Budget Protection) */}
              <div className={`p-4 rounded-xl border transition-all mb-4 ${
                safeMode && budgetReached
                  ? "border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 shadow-sm"
                  : "border-gray-200 dark:border-[#3c445a] bg-gray-50/50 dark:bg-[#171a22]/50"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-4 h-4 ${safeMode ? "text-emerald-500" : "text-gray-400"}`} />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Safe Mode (Monthly Budget Cap)
                    </h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      !safeMode
                        ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        : budgetReached
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40"
                    }`}>
                      {!safeMode ? "DISABLED" : budgetReached ? "BUDGET REACHED (PAUSED)" : `CAP: ₹${monthlyBudget}/mo`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSafeMode}
                    disabled={safeModeLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      safeMode ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        safeMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                  Protects your budget. Automatically pauses WhatsApp automated sending when total monthly spend reaches your chosen amount.
                </p>

                {safeMode && (
                  <div className="pt-3 border-t border-gray-200 dark:border-[#3c445a] space-y-3">
                    {/* Monthly Spend Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                        <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5 text-[#c1552c]" />
                          <span>This Month: <strong className="font-bold text-gray-900 dark:text-white">₹{currentMonthSpend.toFixed(2)}</strong></span>
                          <span className="text-[11px] text-gray-400">({monthSentCount} msgs)</span>
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          Limit: <strong className="font-bold text-gray-900 dark:text-white">₹{monthlyBudget}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            budgetReached
                              ? "bg-rose-500"
                              : currentMonthSpend / monthlyBudget > 0.75
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(currentMonthSpend > 0 ? 3 : 0, Math.round((currentMonthSpend / (monthlyBudget || 1)) * 100)))}%`
                          }}
                        />
                      </div>
                    </div>

                    {budgetReached && (
                      <div className="p-2.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs font-medium border border-amber-300 dark:border-amber-800/60 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Monthly budget reached! Messaging is paused. Increase your budget below or wait for next month.</span>
                      </div>
                    )}

                    {/* Budget Selector Chips */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                        Choose Monthly Spending Limit
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[150, 300, 500, 1000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleUpdateBudget(amt)}
                            disabled={budgetSaving}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border text-center ${
                              monthlyBudget === amt
                                ? "bg-[#c1552c] text-white border-[#c1552c] shadow-sm shadow-[#c1552c]/20"
                                : "bg-white dark:bg-[#2c3242] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#3c445a] hover:bg-gray-100 dark:hover:bg-[#353c50]"
                            }`}
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>

                      {/* Custom Amount Input */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">₹</span>
                          <input
                            type="number"
                            min="10"
                            placeholder="Custom amount (e.g. 250)"
                            value={customBudgetInput}
                            onChange={(e) => setCustomBudgetInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && customBudgetInput) {
                                e.preventDefault();
                                handleUpdateBudget(customBudgetInput);
                              }
                            }}
                            className="w-full pl-6 pr-3 py-1.5 bg-white dark:bg-[#2c3242] border border-gray-200 dark:border-[#3c445a] rounded-lg text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-[#c1552c]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateBudget(customBudgetInput)}
                          disabled={!customBudgetInput || budgetSaving}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#c1552c] hover:bg-[#a84a26] text-white disabled:opacity-50 transition-all flex-shrink-0"
                        >
                          {budgetSaving ? "Saving..." : "Set"}
                        </button>
                      </div>

                      {/* Variable Utility Message Rate Selector (₹0.12 - ₹0.18) */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-[#3c445a]">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <span>Utility Rate Per Message</span>
                            <span className="text-[10px] font-normal lowercase text-gray-400">(Meta varies ₹0.12 – ₹0.18)</span>
                          </label>
                          <span className="text-xs font-bold text-[#c1552c]">
                            ₹{utilityRate.toFixed(2)} / msg
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[0.12, 0.14, 0.15, 0.18].map((rate) => (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => handleUpdateUtilityRate(rate)}
                              disabled={utilityRateUpdating}
                              className={`py-1 px-1.5 rounded-lg text-xs font-semibold transition-all border text-center ${
                                utilityRate === rate
                                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white shadow-xs"
                                  : "bg-white dark:bg-[#2c3242] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#3c445a] hover:bg-gray-100 dark:hover:bg-[#353c50]"
                              }`}
                            >
                              ₹{rate.toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 mt-2">
                        * At ₹{utilityRate.toFixed(2)}/msg, your ₹{monthlyBudget} budget covers approx {Math.round(monthlyBudget / (utilityRate || 0.15)).toLocaleString()} automated student messages.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Default Language Card */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-[#3c445a] bg-gray-50/50 dark:bg-[#171a22]/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#c1552c]" />
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                      Default Message Language
                    </h4>
                  </div>
                  <select
                    value={defaultLanguage}
                    onChange={handleDefaultLanguageChange}
                    disabled={langUpdating}
                    className="p-1.5 bg-white dark:bg-[#2c3242] border border-gray-200 dark:border-[#3c445a] rounded-lg text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c1552c] outline-none cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.native} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Automated onboarding, payment reminders, and course completion messages will be dispatched in this language by default.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[#2c3242] flex items-center justify-between">
              <span className="text-xs text-gray-500">Manage Meta template components:</span>
              <button
                type="button"
                onClick={() => setActiveSubTab("templates")}
                className="text-xs font-bold text-[#c1552c] hover:text-[#a84a26] inline-flex items-center gap-1 hover:underline"
              >
                <span>Open Templates & Preview</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Templates & Preview */}
      {activeSubTab === "templates" && (
        <TemplateManager
          onBack={() => setActiveSubTab("connection")}
          initialLanguage={defaultLanguage}
          onLanguageChange={setDefaultLanguage}
        />
      )}
    </div>
  );
}

const SUPPORTED_LANGUAGES = [
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
];

const TEMPLATE_DEFINITIONS = {
  onboarding: {
    name: "onboarding",
    label: "Onboarding Message",
    category: "UTILITY",
    translations: {
      en: {
        label: "English",
        header: "🎓 Enrollment Confirmation",
        bodyText: "🎉 Welcome to {{1}}!\n\nHello {{2}}, your driving course enrollment has been successfully completed. 🚗\n\n📅 Course Start Date: {{3}}\n👨🏫 Instructor: {{4}}\n💰 Amount Paid: ₹{{5}}\n💳 Remaining Amount: ₹{{6}}\n\nWe’re happy to have you with us. Please be ready for your first driving session on the scheduled date.\n\nIf you have any questions, feel free to contact us.\n\nThank you for choosing {{7}}! 🙏",
        footer: "Safe Driving School • Official Notification"
      },
      mr: {
        label: "मराठी (Marathi)",
        header: "🎓 प्रवेश निश्चिती",
        bodyText: "🎉 {{1}} मध्ये आपले सहर्ष स्वागत आहे!\n\nनमस्कार {{2}}, आपला ड्रायव्हिंग कोर्स प्रवेश यशस्वीरित्या पूर्ण झाला आहे. 🚗\n\n📅 कोर्स सुरू होण्याची तारीख: {{3}}\n👨🏫 प्रशिक्षक: {{4}}\n💰 भरलेली रक्कम: ₹{{5}}\n💳 उर्वरित रक्कम: ₹{{6}}\n\nआपले आमच्यासोबत स्वागत आहे. कृपया ठरलेल्या तारखेला पहिल्या ड्रायव्हिंग सत्रासाठी तयार रहा.\n\nकाही शंका असल्यास आमच्याशी संपर्क साधा.\n\n{{7}} ची निवड केल्याबद्दल धन्यवाद! 🙏",
        footer: "सुरक्षित ड्रायव्हिंग स्कूल • अधिकृत सूचना"
      },
      hi: {
        label: "हिन्दी (Hindi)",
        header: "🎓 नामांकन पुष्टिकरण",
        bodyText: "🎉 {{1}} में आपका स्वागत है!\n\nनमस्ते {{2}}, आपका ड्राइविंग कोर्स नामांकन सफलतापूर्वक पूरा हो गया है। 🚗\n\n📅 कोर्स शुरू होने की तारीख: {{3}}\n👨🏫 प्रशिक्षक: {{4}}\n💰 जमा की गई राशि: ₹{{5}}\n💳 शेष राशि: ₹{{6}}\n\nहम आपका स्वागत करते हैं। कृपया निर्धारित तारीख पर अपने पहले ड्राइविंग सत्र के लिए तैयार रहें।\n\nयदि आपका कोई प्रश्न है, तो कृपया संपर्क करें।\n\n{{7}} को चुनने के लिए धन्यवाद! 🙏",
        footer: "सुरक्षित ड्राइविंग स्कूल • आधिकारिक सूचना"
      },
      kn: {
        label: "ಕನ್ನಡ (Kannada)",
        header: "🎓 ದಾಖಲಾತಿ ದೃಢೀಕರಣ",
        bodyText: "🎉 {{1}} ಗೆ ಸುಸ್ವಾಗತ!\n\nನಮಸ್ಕಾರ {{2}}, ನಿಮ್ಮ ಡ್ರೈವಿಂಗ್ ಕೋರ್ಸ್ ದಾಖಲಾತಿ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ. 🚗\n\n📅 ಕೋರ್ಸ್ ಪ್ರಾರಂಭ ದಿನಾಂಕ: {{3}}\n👨🏫 ತರಬೇತುದಾರರು: {{4}}\n💰 ಪಾವತಿಸಿದ ಮೊತ್ತ: ₹{{5}}\n💳 ಬಾಕಿ ಮೊತ್ತ: ₹{{6}}\n\nನಿಮ್ಮನ್ನು ಸ್ವಾಗತಿಸಲು ನಾವು ಸಂತೋಷಪಡುತ್ತೇವೆ. ನಿಗದಿತ ದಿನಾಂಕದಂದು ಮೊದಲ ತರಗತಿಗೆ ಸಿದ್ಧರಾಗಿರಿ.\n\nಏನಾದರೂ ಪ್ರಶ್ನೆಗಳಿದ್ದರೆ ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ.\n\n{{7}} ಅನ್ನು ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು! 🙏",
        footer: "ಸುರಕ್ಷಿತ ಡ್ರೈವಿಂಗ್ ಶಾಲೆ • ಅಧಿಕೃತ ಮಾಹಿತಿ"
      },
      te: {
        label: "తెలుగు (Telugu)",
        header: "🎓 అడ్మిషన్ నిర్ధారణ",
        bodyText: "🎉 {{1}} కి స్వాగతం!\n\nనమస్కారం {{2}}, మీ డ్రైవింగ్ కోర్సు నమోదు విజయవంతంగా పూర్తయింది. 🚗\n\n📅 కోర్సు ప్రారంభ తేదీ: {{3}}\n👨🏫 శిక్షకుడు: {{4}}\n💰 చెల్లించిన మొత్తం: ₹{{5}}\n💳 మిగిలిన మొత్తం: ₹{{6}}\n\nమిమ్మల్ని స్వాగతించడం మాకు ఎంతో సంతోషంగా ఉంది. నిర్ణీత తేదీన మొదటి సెషన్‌కు సిద్ధంగా ఉండండి.\n\nఏవైనా సందేహాలు ఉంటే మమ్మల్ని సంప్రదించండి.\n\n{{7}} ను ఎంచుకున్నందుకు ధನ್ಯవాదాలు! 🙏",
        footer: "సురక్షిత డ್ರೈవిಂಗ್ స్కూల్ • అధికారిక సమాచారం"
      },
      ta: {
        label: "தமிழ் (Tamil)",
        header: "🎓 சேர்க்கை உறுதிப்படுத்தல்",
        bodyText: "🎉 {{1}} -க்கு நல்வரவு!\n\nவணக்கம் {{2}}, உங்கள் ஓட்டுநர் பயிற்சி சேர்க்கை வெற்றிகரமாக முடிந்தது. 🚗\n\n📅 பயிற்சி தொடங்கும் தேதி: {{3}}\n👨🏫 பயிற்சியாளர்: {{4}}\n💰 செலுத்திய தொகை: ₹{{5}}\n💳 மீதமுள்ள தொகை: ₹{{6}}\n\nகுறிப்பிட்ட தேதியில் உங்கள் முதல் பயிற்சிக்கு தயாராக இருங்கள்.\n\nஏதேனும் கேள்விகள் இருந்தால் எங்களை தொடர்பு கொள்ளவும்.\n\n{{7}} -ஐ தேர்ந்தெடுத்தமைக்கு நன்றி! 🙏",
        footer: "பாதுகாப்பான ஓட்டுநர் பள்ளி • அதிகாரப்பூர்வ அறிவிப்பு"
      }
    }
  },
  reminder: {
    name: "reminder",
    label: "Reminder Message",
    category: "UTILITY",
    translations: {
      en: {
        label: "English",
        header: "⏳ Payment Due Reminder",
        bodyText: "Hello {{1}},\n\nThis is a friendly reminder from {{2}} regarding your pending payment.\n\n💰 Total Amount: ₹{{3}}\n✅ Amount Paid: ₹{{4}}\n⏳ Pending Amount: ₹{{5}}\n📅 Payment Due Date: {{6}}\n\nPlease complete the pending payment by the due date to continue your driving course without interruption.\n\nIf you have already made the payment, please ignore this message.\n\nThank you,\nThe {{2}} Team.",
        footer: "Please clear pending fees before the due date."
      },
      mr: {
        label: "मराठी (Marathi)",
        header: "⏳ देय फी आठवण संदेश",
        bodyText: "नमस्कार {{1}},\n\nहा {{2}} कडून आपल्या उर्वरित फी संदर्भातील आठवण संदेश आहे.\n\n💰 एकूण फी: ₹{{3}}\n✅ भरलेली रक्कम: ₹{{4}}\n⏳ उर्वरित रक्कम: ₹{{5}}\n📅 देय तारीख: {{6}}\n\nड्रायव्हिंग कोर्स अखंडित सुरू ठेवण्यासाठी कृपया देय तारखेपूर्वी उर्वरित रक्कम भरावी.\n\nआपण आधीच फी भरली असल्यास या संदेशाकडे दुर्लक्ष करावे.\n\nधन्यवाद,\n{{2}} टीम.",
        footer: "कृपया देय तारखेपूर्वी उर्वरित रक्कम भरावी."
      },
      hi: {
        label: "हिन्दी (Hindi)",
        header: "⏳ बकाया शुल्क अनुस्मारक",
        bodyText: "नमस्ते {{1}},\n\nयह {{2}} की ओर से आपके बकाया भुगतान के संबंध में एक अनुस्मारक संदेश है।\n\n💰 कुल शुल्क: ₹{{3}}\n✅ भुगतान की गई राशि: ₹{{4}}\n⏳ शेष बकाया राशि: ₹{{5}}\n📅 देय तिथि: {{6}}\n\nकृपया अपने ड्राइविंग कोर्स को बिना किसी रुकावट के जारी रखने के लिए देय तिथि तक शेष राशि का भुगतान करें।\n\nयदि आप पहले ही भुगतान कर चुके हैं, तो कृपया इस संदेश को अनदेखा करें।\n\nधन्यवाद,\n{{2}} टीम।",
        footer: "कृपया नियत तारीख से पहले भुगतान करें।"
      },
      kn: {
        label: "ಕನ್ನಡ (Kannada)",
        header: "⏳ ಬಾಕಿ ಶುಲ್ಕ ಜ್ಞಾಪನೆ",
        bodyText: "ನಮಸ್ಕಾರ {{1}},\n\nಇದು {{2}} ವತಿಯಿಂದ ನಿಮ್ಮ ಬಾಕಿ ಪಾವತಿ ಕುರಿತಾದ ಜ್ಞಾಪನೆ ಸಂದೇಶ.\n\n💰 ಒಟ್ಟು ಮೊತ್ತ: ₹{{3}}\n✅ ಪಾವತಿಸಿದ ಮೊತ್ತ: ₹{{4}}\n⏳ ಬಾಕಿ ಮೊತ್ತ: ₹{{5}}\n📅 ಪಾವತಿ ಅಂತಿಮ ದಿನಾಂಕ: {{6}}\n\nನಿಮ್ಮ ತರಬೇತಿ ಮುಂದುವರಿಯಲು ದಯವಿಟ್ಟು ನಿಗದಿತ ದಿನಾಂಕದೊಳಗೆ ಬಾಕಿ ಮೊತ್ತವನ್ನು ಪಾವತಿಸಿ.\n\nಈಗಾಗಲೇ ಪಾವತಿಸಿದ್ದರೆ ದಯವಿಟ್ಟು ಈ ಸಂದೇಶವನ್ನು ನಿರ್ಲಕ್ಷಿಸಿ.\n\nಧನ್ಯವಾದಗಳು,\n{{2}} ತಂಡ.",
        footer: "ದಯವಿಟ್ಟು ನಿಗದಿತ ದಿನಾಂಕದೊಳಗೆ ಪಾವತಿಸಿ."
      },
      te: {
        label: "తెలుగు (Telugu)",
        header: "⏳ ఫీజు చెల్లింపు రిమైండర్",
        bodyText: "నమస్కారం {{1}},\n\nఇది {{2}} నుండి మీ పెండింగ్ ఫీజు చెల్లింపు గురించిన రిమైండర్ మెసేజ్.\n\n💰 మొత్తం ఫీజు: ₹{{3}}\n✅ చెల్లించిన మొత్తం: ₹{{4}}\n⏳ మిగిలిన మొత్తం: ₹{{5}}\n📅 చెల్లించాల్సిన చివరి తేదీ: {{6}}\n\nమీ డ్రైవింగ్ కోర్సు నిరంతరాయంగా కొనసాగడానికి దయచేసి నిర్ణీత తేదీలోపు ఫీజు చెల్లించండి.\n\nమీరు ఇప్పటికే చెల్లించి ఉంటే, దయచేసి ఈ సందేశాన్ని విస్మరించండి.\n\nధన్యవాదాలు,\n{{2}} బృందం.",
        footer: "దయచేసి నిర్ణీత తేదీలోపు చెల్లించండి."
      },
      ta: {
        label: "தமிழ் (Tamil)",
        header: "⏳ கட்டண நினைவூட்டல்",
        bodyText: "வணக்கம் {{1}},\n\nஇது {{2}} இடமிருந்து உங்கள் மீதமுள்ள கட்டணம் செலுத்துவது குறித்த நினைவூட்டல்.\n\n💰 மொத்த கட்டணம்: ₹{{3}}\n✅ செலுத்திய தொகை: ₹{{4}}\n⏳ நிலுவைத் தொகை: ₹{{5}}\n📅 செலுத்த வேண்டிய கடைசி தேதி: {{6}}\n\nஉங்கள் பயிற்சி தடையின்றி தொடர கடைசி தேதிக்குள் நிலುவைத் தொகையை செலுத்தவும்.\n\nஏற்கனவே செலுத்தியிருந்தால், இந்த செய்தியை புறக்கணிக்கவும்.\n\nநன்றி,\n{{2}} குழு.",
        footer: "கடைசி தேதிக்குள் செலுத்தவும்."
      }
    }
  },
  completion: {
    name: "completion",
    label: "Course Completion",
    category: "UTILITY",
    translations: {
      en: {
        label: "English",
        header: "🏆 Course Completed",
        bodyText: "Hello {{1}},\n\n🎉 Congratulations on completing your driving course with {{2}}!\n\nThis is a reminder that your course has been completed, but an outstanding payment of ₹{{3}} is still pending.\n\nPlease clear the remaining amount at your earliest convenience.\n\nThank you for choosing {{2}}. We wish you safe and confident driving! 🚗\n\nThe {{2}} Team.",
        footer: "Drive Safe • Follow Traffic Rules"
      },
      mr: {
        label: "मराठी (Marathi)",
        header: "🏆 कोर्स यशस्वीरित्या पूर्ण",
        bodyText: "नमस्कार {{1}},\n\n🎉 {{2}} सोबत आपला ड्रायव्हिंग कोर्स यशस्वीरित्या पूर्ण केल्याबद्दल मनःपूर्वक अभिनंदन!\n\nआपला कोर्स पूर्ण झाला आहे, परंतु ₹{{3}} ची उर्वरित रक्कम अजूनही बाकी आहे.\n\nकृपया लवकरात लवकर उर्वरित रक्कम भरून सहकार्य करावे.\n\n{{2}} ची निवड केल्याबद्दल धन्यवाद. आम्ही तुम्हाला सुरक्षित ड्रायव्हिंगसाठी शुभेच्छा देतो! 🚗\n\n{{2}} टीम.",
        footer: "सुरक्षित ड्रायव्हिंग करा • वाहतुकीचे नियम पाळा"
      },
      hi: {
        label: "हिन्दी (Hindi)",
        header: "🏆 कोर्स संपन्न",
        bodyText: "नमस्ते {{1}},\n\n🎉 {{2}} के साथ अपना ड्राइविंग कोर्स सफलतापूर्वक पूरा करने पर बधाई!\n\nआपका कोर्स पूरा हो चुका है, लेकिन ₹{{3}} का बकाया भुगतान अभी बाकी है।\n\nकृपया अपनी सुविधानुसार जल्द से जल्द शेष राशि का भुगतान करें।\n\n{{2}} को चुनने के लिए धन्यवाद। हम आपके सुरक्षित ड्राइविंग की कामना करते हैं! 🚗\n\n{{2}} टीम।",
        footer: "सुरक्षित ड्राइव करें • यातायात नियमों का पालन करें"
      },
      kn: {
        label: "ಕನ್ನಡ (Kannada)",
        header: "🏆 ಕೋರ್ಸ್ ಪೂರ್ಣಗೊಂಡಿದೆ",
        bodyText: "ನಮಸ್ಕಾರ {{1}},\n\n🎉 {{2}} ನೊಂದಿಗೆ ನಿಮ್ಮ ಡ್ರೈವಿಂಗ್ ಕೋರ್ಸ್ ಅನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಳಿಸಿದ್ದಕ್ಕಾಗಿ ಅಭಿನಂದನೆಗಳು!\n\nನಿಮ್ಮ ಕೋರ್ಸ್ ಪೂರ್ಣಗೊಂಡಿದೆ, ಆದರೆ ₹{{3}} ಬಾಕಿ ಮೊತ್ತ ಇನ್ನೂ ಉಳಿದಿದೆ.\n\nದಯವಿಟ್ಟು ಆದಷ್ಟು ಬೇಗ ಬಾಕಿ ಮೊತ್ತವನ್ನು ಪಾವತಿಸಿ.\n\n{{2}} ಅನ್ನು ಆಯ್ಕೆ ಮಾಡಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ಸುರಕ್ಷಿತ ಚಾಲನೆಗೆ ಶುಭ ಹಾರೈಕೆಗಳು! 🚗\n\n{{2}} ತಂಡ.",
        footer: "ಸುರಕ್ಷಿತವಾಗಿ ಚಾಲನೆ ಮಾಡಿ"
      },
      te: {
        label: "తెలుగు (Telugu)",
        header: "🏆 కోర్సు పూర్తయింది",
        bodyText: "నమస్కారం {{1}},\n\n🎉 {{2}} తో మీ డ్రైవింగ్ కోర్సును విజయవంతంగా పూర్తి చేసినందుకు అభినందనలు!\n\nమీ కోర్సు పూర్తయింది, అయితే ₹{{3}} పెండింగ్ మొత్తం ఇంకా చెల్లించాల్సి ఉంది.\n\nదయచేసి వీలైనంత త్వరగా మిగిలిన మొత్తాన్ని చెల్లించండి.\n\n{{2}} ను ఎంచుకున్నందుకు ಧನ್ಯవాదాలు. సురక్షితమైన డ್ರైవింగ్ కోసం శుభాకాంಕ್ಷలు! 🚗\n\n{{2}} బృందం.",
        footer: "ట్రాఫిక్ నిబంధనలను పాటించండి"
      },
      ta: {
        label: "தமிழ் (Tamil)",
        header: "🏆 பயிற்சி நிறைவடைந்தது",
        bodyText: "வணக்கம் {{1}},\n\n🎉 {{2}} உடன் உங்கள் ஓட்டுநர் பயிற்சியை வெற்றிகரமாக முடித்ததற்கு வாழ்த்துகள்!\n\nஉங்கள் பயிற்சி நிறைவடைந்தது, ஆனால் ₹{{3}} நிலுவைத் தொகை இன்னும் செலுத்த வேண்டியுள்ளது.\n\nதயவுசெய்து விரைவில் மீதமுள்ள தொகையை செலுத்துங்கள்.\n\n{{2}} -ஐ தேர்ந்தெடுத்தமைக்கு நன்றி. பாதுகாப்பான பயணத்திற்கு வாழ்த்துகள்! 🚗\n\n{{2}} குழு.",
        footer: "பாதுகாப்பாக வாகனம் ஓட்டுங்கள்"
      }
    }
  },
  license_test: {
    name: "license_test",
    label: "License / RTO Test Schedule",
    category: "UTILITY",
    translations: {
      en: {
        label: "English",
        header: "Driving License Test Schedule",
        bodyText: "Driving License Test Schedule Notification\n\nHello {{1}},\n\nYour RTO Driving License Test has been scheduled by {{2}}.\n\nTest Date: {{3}}\nReporting Time: {{4}}\nLocation / Track: {{5}}\nDocuments Required: {{6}}\n\nPlease reach 15 minutes before your scheduled time. Drive safely and all the best!\n\nRegards,\n{{2}} Team.",
        footer: "Please carry all required original documents."
      },
      mr: {
        label: "मराठी (Marathi)",
        header: "आरटीओ ड्रायव्हिंग टेस्ट",
        bodyText: "ड्रायव्हिंग लायसन्स चाचणी सूचना\n\nनमस्कार {{1}},\n\nआपली आरटीओ ड्रायव्हिंग लायसन्स चाचणी {{2}} द्वारे निश्चित करण्यात आली आहे.\n\nचाचणी तारीख: {{3}}\nउपस्थित राहण्याची वेळ: {{4}}\nठिकाण / आरटीओ ग्राउंड: {{5}}\nआवश्यक कागदपत्रे: {{6}}\n\nकृपया दिलेल्या वेळेच्या १५ मिनिटे आधी उपस्थित राहावे. परीक्षेसाठी मनःपूर्वक शुभेच्छा!\n\nआपली,\n{{2}} टीम.",
        footer: "कृपया आवश्यक मूळ कागदपत्रे सोबत आणावीत."
      },
      hi: {
        label: "हिन्दी (Hindi)",
        header: "ड्राइविंग लाइसेंस टेस्ट",
        bodyText: "ड्राइविंग लाइसेंस टेस्ट सूचना\n\nनमस्ते {{1}},\n\nआपका आरटीओ ड्राइविंग लाइसेंस टेस्ट {{2}} द्वारा निर्धारित किया गया है।\n\nटेस्ट की तारीख: {{3}}\nउपस्थिति का समय: {{4}}\nस्थान / आरटीओ ग्राउंड: {{5}}\nआवश्यक दस्तावेज: {{6}}\n\nकृपया निर्धारित समय से १५ मिनट पहले पहुंचे। शुभकामनाएं!\n\nधन्यवाद,\n{{2}} टीम।",
        footer: "कृपया सभी आवश्यक मूल दस्तावेज साथ लाएं।"
      },
      kn: {
        label: "ಕನ್ನಡ (Kannada)",
        header: "ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್ ಪರೀಕ್ಷೆ",
        bodyText: "ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್ ಪರೀಕ್ಷೆಯ ಮಾಹಿತಿ\n\nನಮಸ್ಕಾರ {{1}},\n\nನಿಮ್ಮ ಆರ್‌ಟಿಒ ಡ್ರೈವಿಂಗ್ ಲೈಸೆನ್ಸ್ ಪರೀಕ್ಷೆಯನ್ನು {{2}} ವತಿಯಿಂದ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ.\n\nಪರೀಕ್ಷಾ ದಿನಾಂಕ: {{3}}\nಹಾಜರಾತಿ ಸಮಯ: {{4}}\nಸ್ಥಳ: {{5}}\nದಾಖಲೆಗಳು: {{6}}\n\nದಯವಿಟ್ಟು ನಿಗದಿತ ಸಮಯಕ್ಕಿಂತ ೧೫ ನಿಮಿಷ ಮುಂಚಿತವಾಗಿ ಹಾಜರಾಗಿ. ಶುಭ ಹಾರೈಕೆಗಳು!\n\nಧನ್ಯವಾದಗಳು,\n{{2}} ತಂಡ.",
        footer: "ದಯವಿಟ್ಟು ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ತನ್ನಿ."
      },
      te: {
        label: "తెలుగు (Telugu)",
        header: "డ్రైవింగ్ లైసెన్స్ టెస్ట్",
        bodyText: "డ్రైవింగ్ లైసెన్స్ టెస్ట్ షెడ్యూల్ సమాచారం\n\nనమస్కారం {{1}},\n\nమీ ఆర్టీఓ డ్రైవింగ్ లైసెన్స్ టెస్ట్ {{2}} ద్వారా షెడ్యూల్ చేయబడింది.\n\nటెస్ట్ తేదీ: {{3}}\nహాజరు కావాల్సిన సమయం: {{4}}\nపరీక్షా కేంద్రం / ఆర్టీఓ: {{5}}\nఅవసరమైన పత్రాలు: {{6}}\n\nదయచేసి నిర్ణీత సమయానికి 15 నిమిషాల ముందుగా చేరుకోండి. ఆల్ ది బెస్ట్!\n\nధన్యవాదాలు,\n{{2}} బృందం.",
        footer: "దయచేసి అవసరమైన అన్ని ధృవపత్రాలు తీసుకురండి."
      },
      ta: {
        label: "தமிழ் (Tamil)",
        header: "ஓட்டுநர் உரிமத் தேர்வு",
        bodyText: "ஓட்டுநர் உரிமத் தேர்வு அறிவிப்பு\n\nவணக்கம் {{1}},\n\nஉங்கள் ஆர்டிஓ ஓட்டுநர் உரிமத் தேர்வு {{2}} மூலம் திட்டமிடப்பட்டுள்ளது.\n\nதேர்வு தேதி: {{3}}\nவருகை நேரம்: {{4}}\nஇடம்: {{5}}\nதேவையான ஆவணங்கள்: {{6}}\n\nதயவுசெய்து குறிப்பிட்ட நேரத்திற்கு 15 நிமிடங்களுக்கு முன்பே வரவும். வாழ்த்துக்கள்!\n\nநன்றி,\n{{2}} குழு.",
        footer: "அசல் ஆவணங்களை எடுத்து வரவும்."
      }
    }
  }
};

function TemplateManager({ onBack, initialLanguage, onLanguageChange }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateName, setSelectedTemplateName] = useState("onboarding");
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage || "mr");
  const [filterLang, setFilterLang] = useState("all");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeLang, setActiveLang] = useState(initialLanguage || "mr");
  const [settingActiveId, setSettingActiveId] = useState(null);
  const [activeComponentTab, setActiveComponentTab] = useState("all");

  const handleUseTemplate = async (template) => {
    setSettingActiveId(template.id || `${template.name}_${template.language}`);
    try {
      const res = await fetchApi("/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLanguage: template.language })
      });
      const data = await res.json();
      if (data.status) {
        setActiveLang(template.language);
        if (onLanguageChange) onLanguageChange(template.language);
        setMessage({
          type: "success",
          text: `Active WhatsApp message language switched to ${SUPPORTED_LANGUAGES.find(l => l.code === template.language)?.name || template.language}!`
        });
      }
    } catch (err) {
      console.error("Failed to switch template language:", err);
    } finally {
      setSettingActiveId(null);
    }
  };

  useEffect(() => {
    if (initialLanguage) {
      setSelectedLanguage(initialLanguage);
      setActiveLang(initialLanguage);
    }
  }, [initialLanguage]);

  const activeTemplateDef = TEMPLATE_DEFINITIONS[selectedTemplateName] || TEMPLATE_DEFINITIONS.onboarding;
  const activeTranslation = activeTemplateDef.translations[selectedLanguage] || activeTemplateDef.translations.mr || activeTemplateDef.translations.en;

  const existingTemplate = templates.find(
    t => t.name === selectedTemplateName && t.language === selectedLanguage
  );
  const isApproved = existingTemplate?.status === "APPROVED";
  const isPending = existingTemplate?.status === "PENDING";

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetchApi("/whatsapp/templates");
      const data = await res.json();
      if (data.status) {
        setTemplates(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetchApi("/whatsapp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: activeTemplateDef.name, 
          category: activeTemplateDef.category, 
          language: selectedLanguage, 
          bodyText: activeTranslation.bodyText,
          headerText: activeTranslation.header || null,
          footerText: activeTranslation.footer || null,
        })
      });
      const data = await res.json();
      if (data.status) {
        setMessage({ 
          type: 'success', 
          text: data.message || `Template "${activeTemplateDef.name}" (${selectedLanguage}) with Meta components synced successfully!` 
        });
        fetchTemplates();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Failed to create template" });
    } finally {
      setCreating(false);
    }
  };

  const filteredTemplates = filterLang === "all"
    ? templates
    : templates.filter(t => t.language === filterLang);

  const langObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-300">
      {/* Create / Configure Template Form */}
      <div className="flex-1 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-2xl p-6 shadow-sm overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-[#3c445a] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2c3242] transition-colors inline-flex items-center gap-1"
              >
                <span>← Settings</span>
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Meta Components Mode</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold border border-emerald-300/40">
                Multi-Lang
              </span>
            </h2>
          </div>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Template</label>
            <select 
              value={selectedTemplateName} 
              onChange={e => setSelectedTemplateName(e.target.value)} 
              className="w-full p-2.5 bg-gray-50 dark:bg-[#2c3242] border border-gray-200 dark:border-[#3c445a] rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#c1552c] outline-none"
            >
              {Object.values(TEMPLATE_DEFINITIONS).map(t => (
                <option key={t.name} value={t.name}>{t.label} ({t.name})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Select Language</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  type="button"
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    selectedLanguage === lang.code
                      ? "bg-[#c1552c] text-white border-[#c1552c] shadow-sm shadow-[#c1552c]/20"
                      : "bg-gray-50 dark:bg-[#2c3242] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#3c445a] hover:bg-gray-100 dark:hover:bg-[#353c50]"
                  }`}
                >
                  <div className="font-bold">{lang.native}</div>
                  <div className="opacity-80 text-[10px]">{lang.code}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Meta Components Breakdown Card */}
          <div className="border border-gray-200 dark:border-[#3c445a] rounded-xl p-4 bg-gray-50/50 dark:bg-[#171a22]/50 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#2c3242]">
              <div className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-[#c1552c]" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Meta Components ({langObj.native})
                </span>
              </div>
              <span className="text-[11px] text-gray-400">Category: {activeTemplateDef.category}</span>
            </div>

            {/* 1. HEADER COMPONENT */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-mono font-bold">
                    HEADER
                  </span>
                  <span>Header Component (TEXT)</span>
                </span>
                <span className="text-[10px] text-gray-400">Optional</span>
              </div>
              <input
                type="text"
                readOnly
                value={activeTranslation.header || ""}
                className="w-full p-2 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3c445a] rounded-lg text-xs font-semibold text-gray-900 dark:text-white outline-none"
              />
            </div>

            {/* 2. BODY COMPONENT */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-mono font-bold">
                    BODY
                  </span>
                  <span>Body Component (TEXT)</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-medium">Required • Variables: {activeTranslation.bodyText.match(/\{\{\d+\}\}/g)?.length || 0}</span>
              </div>
              <textarea 
                readOnly 
                rows={6} 
                value={activeTranslation.bodyText} 
                className="w-full p-2.5 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3c445a] rounded-lg text-xs text-gray-800 dark:text-gray-200 outline-none font-sans leading-relaxed" 
              />
            </div>

            {/* 3. FOOTER COMPONENT */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-300 text-[10px] font-mono font-bold">
                    FOOTER
                  </span>
                  <span>Footer Component (TEXT)</span>
                </span>
                <span className="text-[10px] text-gray-400">Optional</span>
              </div>
              <input
                type="text"
                readOnly
                value={activeTranslation.footer || ""}
                className="w-full p-2 bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#3c445a] rounded-lg text-xs text-gray-600 dark:text-gray-400 italic outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            disabled={creating} 
            type="submit" 
            className={`w-full font-medium py-2.5 px-4 rounded-xl transition-all shadow-md disabled:opacity-70 ${
              isApproved 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20" 
                : isPending 
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20" 
                : "bg-[#c1552c] hover:bg-[#a84a26] text-white shadow-[#c1552c]/20"
            }`}
          >
            {creating 
              ? "Submitting & Syncing Meta Components..." 
              : isApproved 
              ? `✓ "${activeTemplateDef.name}" (${langObj.name}) is Approved (Sync)`
              : isPending
              ? `⏳ "${activeTemplateDef.name}" (${langObj.name}) is Pending (Sync)`
              : `Submit All Components (${langObj.name}) to Meta`}
          </button>

          {message && (
            <div className={`p-3 text-sm rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-300'}`}>
              {message.text}
            </div>
          )}
        </form>
      </div>

      {/* Live Phone Preview & Templates List */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Live WhatsApp Chat Bubble Preview */}
        <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-[#2c3242]">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                Live WhatsApp Chat Bubble ({langObj.native})
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
              Meta Cloud API
            </span>
          </div>

          {/* Authentic WhatsApp Bubble */}
          <div className="p-4 rounded-xl bg-[#e5ddd5]/40 dark:bg-[#0b141a] flex flex-col items-center">
            <div className="max-w-[340px] w-full bg-white dark:bg-[#202c33] rounded-2xl p-3.5 shadow-md border border-gray-200/50 dark:border-black/30 space-y-2">
              {/* Header */}
              {activeTranslation.header && (
                <div className="font-bold text-sm text-gray-900 dark:text-gray-100 pb-1 border-b border-gray-100 dark:border-gray-700/50">
                  {activeTranslation.header}
                </div>
              )}

              {/* Body */}
              <div className="text-xs text-gray-800 dark:text-[#d1d7db] whitespace-pre-wrap leading-relaxed">
                {activeTranslation.bodyText}
              </div>

              {/* Footer & Timestamp */}
              <div className="pt-1.5 flex items-center justify-between text-[10px] text-gray-500 dark:text-[#8696a0]">
                <span>{activeTranslation.footer || "Official Notice"}</span>
                <span className="flex items-center space-x-1">
                  <span>10:30 AM</span>
                  <span className="text-[#53bdeb] font-bold">✓✓</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white dark:bg-[#1e222d] border border-gray-200 dark:border-[#2c3242] rounded-2xl p-6 shadow-sm overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Your Registered Templates</h2>
              <p className="text-xs text-gray-500">Approved templates across languages</p>
            </div>
            <button onClick={fetchTemplates} className="p-2 hover:bg-gray-100 dark:hover:bg-[#2c3242] rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Language Filter */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            <button
              onClick={() => setFilterLang("all")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterLang === "all"
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-gray-100 dark:bg-[#2c3242] text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              }`}
            >
              All ({templates.length})
            </button>
            {SUPPORTED_LANGUAGES.map(lang => {
              const count = templates.filter(t => t.language === lang.code).length;
              return (
                <button
                  key={lang.code}
                  onClick={() => setFilterLang(lang.code)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filterLang === lang.code
                      ? "bg-[#c1552c] text-white"
                      : "bg-gray-100 dark:bg-[#2c3242] text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {lang.native} ({count})
                </button>
              );
            })}
          </div>
          
          <div className="flex flex-col gap-3">
            {filteredTemplates.length === 0 && !loading && (
              <p className="text-sm text-gray-500 text-center py-8">
                No templates found {filterLang !== "all" ? `for ${SUPPORTED_LANGUAGES.find(l => l.code === filterLang)?.name}` : ""}.
              </p>
            )}
            {filteredTemplates.map(t => {
              const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === t.language);
              return (
                <div key={t.id || `${t.name}_${t.language}`} className="p-3.5 border border-gray-100 dark:border-[#2c3242] bg-gray-50/50 dark:bg-[#252a38] rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                        {t.name}
                        <span className="text-[11px] font-normal px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50">
                          {langInfo ? `${langInfo.native} (${t.language})` : t.language}
                        </span>
                      </h3>
                      <div className="flex items-center space-x-1.5 mt-1">
                        <span className="text-[10px] text-gray-500 uppercase">{t.category}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                          BODY
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                        t.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                        t.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {t.status}
                      </span>

                      {t.status === 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => handleUseTemplate(t)}
                          disabled={settingActiveId === (t.id || `${t.name}_${t.language}`)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                            activeLang === t.language
                              ? "bg-emerald-600 text-white shadow-emerald-600/30 cursor-default"
                              : "bg-[#c1552c] hover:bg-[#a84a26] text-white shadow-[#c1552c]/20"
                          }`}
                        >
                          {activeLang === t.language ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>In Use</span>
                            </>
                          ) : (
                            <>
                              <span>Use this template</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  {t.body && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 bg-white dark:bg-[#1e222d] p-2 rounded border border-gray-100 dark:border-[#353c50] mt-1 whitespace-pre-line">
                      {t.body}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppTab;
