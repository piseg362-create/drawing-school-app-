import React, { useState, useEffect } from 'react';
import { CreditCard, X, ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '../lib/api';

export function LicensePaymentModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load Razorpay script when modal opens
    if (isOpen && !document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRazorpayPayment = async () => {
    setLoading(true);
    try {
      // 1. Ask backend to create order
      const orderRes = await fetchApi("/payment/create-order", { method: "POST" });
      const orderData = await orderRes.json();
      
      if (!orderData.success) {
        toast.error(orderData.message || "Failed to create order");
        setLoading(false);
        return;
      }

      // 2. Open Razorpay Checkout Modal
      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "Driving School Pro",
        description: "Lifetime License Activation",
        order_id: orderData.order.id,
        handler: async function (response) {
           // 3. Send signature to backend for verification
           const verifyRes = await fetchApi("/payment/license", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({
               razorpay_order_id: response.razorpay_order_id,
               razorpay_payment_id: response.razorpay_payment_id,
               razorpay_signature: response.razorpay_signature,
             })
           });
           const verifyData = await verifyRes.json();
           if (verifyData.success) {
             toast.success(verifyData.message || "License activated!");
             localStorage.removeItem("isDemoMode");
             if (onSuccess) onSuccess();
           } else {
             toast.error(verifyData.message || "Verification failed");
           }
        },
        prefill: {
          name: "School Admin",
          email: "admin@example.com",
          contact: "9999999999"
        },
        theme: {
          color: "#c1552c"
        }
      };

      if (!window.Razorpay) {
        toast.error("Razorpay SDK failed to load. Are you offline?");
        setLoading(false);
        return;
      }

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response){
         toast.error(response.error.description || "Payment failed");
      });
      rzp1.open();
      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Network error while initializing payment");
      setLoading(false);
    }
  };

  const handleSimulatePayment = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const res = await fetchApi("/payment/license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulate: true })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "License activated!");
        localStorage.removeItem("isDemoMode");
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.message || "Payment failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error");
    } finally {
      setLoading(false);
      onClose();
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1e222d] rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-[#2c3242] overflow-hidden">
        <div className="relative p-6 bg-gradient-to-r from-[#c1552c] to-[#e0574a] text-white">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Activate Your License</h2>
          <p className="text-white/80 text-sm mt-1">Unlock all features of Driving School Pro.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center py-3 border-b border-gray-100 dark:border-[#2c3242]">
            <span className="text-gray-600 dark:text-gray-400">Lifetime License</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">₹1 (Testing)</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 text-sm text-gray-600 dark:text-gray-400">
              <ShieldCheck className="w-5 h-5 text-green-500 shrink-0" />
              <span>Secure, one-time payment. No hidden fees or recurring charges.</span>
            </div>
          </div>

          <button
            onClick={handleRazorpayPayment}
            disabled={loading}
            className={`w-full py-3 px-4 flex items-center justify-center space-x-2 text-white font-medium rounded-lg transition-colors shadow-lg
              ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#c1552c] hover:bg-[#a84a26] shadow-[#c1552c]/20'}
            `}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                <span>Pay ₹1 with Razorpay</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleSimulatePayment}
            disabled={loading}
            className="w-full py-2 px-4 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mt-2"
          >
            Bypass & Simulate (Testing)
          </button>
        </div>
      </div>
    </div>
  );
}
