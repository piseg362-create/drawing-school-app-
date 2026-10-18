"use client";

import { useEffect, useState } from "react";
import { Sparkles, Clock, AlertTriangle, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { LicensePaymentModal } from "./LicensePaymentModal";
import { fetchApi } from "../lib/api";

export function DemoBanner() {
  const [demoStatus, setDemoStatus] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const pathname = usePathname();

  const fetchStatus = async () => {
    try {
      const res = await fetchApi("/demo-status");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDemoStatus(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch demo status", error);
    }
  };

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      setIsVerified(true);
    }
    fetchStatus();
  }, []);

  const handlePaymentSuccess = () => {
    // Re-fetch status to clear demo banner
    fetchStatus();
  };

  // Hide on auth screens
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  if (!demoStatus || !demoStatus.isDemo) {
    return null; // Not in demo mode, or loading
  }

  if (!isVisible) {
    return null; // Dismissed by user for this session
  }

  const { remainingDays, isExpired } = demoStatus;
  const progressPercent = Math.max(0, Math.min(100, (remainingDays / 15) * 100));

  return (
    <div className="relative bg-white dark:bg-[#1e222d] border-b border-gray-100 dark:border-[#2c3242] font-sans">
      {/* Top progress bar */}
      {!isExpired && (
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gray-100 dark:bg-[#2c3242]">
          <div
            className="h-full bg-[#c1552c] transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      <div className="w-full px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                isExpired
                  ? "bg-red-100 dark:bg-red-900/30 text-red-500"
                  : "bg-orange-100 dark:bg-[#c1552c]/20 text-[#c1552c]"
              }`}
            >
              {isExpired ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
            </div>

            <div className="flex flex-col text-sm leading-tight">
              <span className="font-semibold text-gray-900 dark:text-white">
                {isExpired ? "Free Trial Concluded" : "Evaluation Mode"}
              </span>
              <span className="text-gray-600 dark:text-gray-400 text-xs">
                {isExpired
                  ? "Your free trial has ended. Please activate your license to continue."
                  : `You have ${remainingDays} days remaining to explore all features.`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowPaymentModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#c1552c] hover:bg-[#a84a26] text-white shadow-lg shadow-[#c1552c]/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {isExpired ? "Proceed to Payment" : "Activate License"}
            </button>

            {!isExpired && (
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2c3242] rounded-lg transition-colors"
                title="Dismiss for now"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <LicensePaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}