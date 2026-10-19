"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Car,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CalendarClock,
  Briefcase,
  Phone,
  Globe,
  Moon,
} from "lucide-react";

export function AuthPage({ mode = "login" }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [password, setPassword] = useState("");
  // Login specific
  const [businessOrMobile, setBusinessOrMobile] = useState("");
  // Registration specific
  const [businessName, setBusinessName] = useState("");
  const [handlerName, setHandlerName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [language, setLanguage] = useState("");
  const [storedBusinessName, setStoredBusinessName] = useState("Driving School Pro");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj && userObj.businessName) {
          setStoredBusinessName(userObj.businessName);
        }
      }
    } catch (e) {
      console.error("Error reading businessName from localStorage", e);
    }
  }, []);

  useEffect(() => {
    if (!document.getElementById("razorpay-script")) {
      const script = document.createElement("script");
      script.id = "razorpay-script";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleAuthenticate = (isDemo = false) => {
    // Save authentication state so the dashboard knows we are logged in
    localStorage.setItem("isAuthenticated", "true");
    if (isDemo) {
      localStorage.setItem("isDemoMode", "true");
      localStorage.setItem("demoStartDate", new Date().toISOString());
      const demoUser = {
        businessName: "Demo Driving School",
        systemUserId: "demo-school-tenant",
        mobileNumber: "9999999999"
      };
      localStorage.setItem("user", JSON.stringify(demoUser));
    } else {
      localStorage.removeItem("isDemoMode");
      localStorage.removeItem("demoStartDate");
    }
    window.location.href = "/";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      if (isLogin) {
        const payload = { password };
        if (/^\+?\d+$/.test(businessOrMobile)) {
          payload.mobileNumber = businessOrMobile;
        } else {
          payload.businessName = businessOrMobile;
        }

        const apiUrl = "https://backend-for-drawing-school.vercel.app/api/auth/login/";
           

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const systemUserId = result.data.systemUserId || result.data.systemId || result.data.userId || result.data._id || result.data.id;
            const userData = { ...result.data, systemUserId };
            localStorage.setItem("user", JSON.stringify(userData));
            if (result.data.accessToken) {
              localStorage.setItem("token", result.data.accessToken);
            }

            // Background sync with local database
            fetch("http://localhost:49215/api/school-setup", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                "x-system-id": systemUserId
              },
              body: JSON.stringify({
                name: result.data.businessName || "My School",
                mobile: result.data.mobileNumber || "0000000000",
                systemID: systemUserId
              })
            }).catch(err => console.error("Local sync error:", err));

            // Check payment verification
            if (result.data.isPaymentVerified) {
              // Automatically unlock the app locally
              fetch("http://localhost:49215/api/payment/license", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ simulate: true })
              }).catch(() => {});
              
              if (result.token) {
                localStorage.setItem("token", result.token);
              }
              handleAuthenticate(false);
            } else {
              // Force payment right now!
              setIsLoading(true);
              try {
                const orderRes = await fetch("http://localhost:49215/api/payment/create-order", { method: "POST" });
                const orderData = await orderRes.json();
                
                if (!orderData.success) {
                  setErrorMsg(orderData.message || "Failed to initialize payment for login.");
                  setIsLoading(false);
                  return;
                }

                const options = {
                  key: orderData.key_id,
                  amount: orderData.order.amount,
                  currency: orderData.order.currency,
                  name: result.data.businessName || "Drawing School",
                  description: "Software License Activation",
                  order_id: orderData.order.id,
                  handler: async function (response) {
                    // Payment successful!
                    try {
                      // 1. Verify payment with the central server
                      const verifyApiUrl = "https://backend-for-drawing-school.vercel.app/api/payment/verify";
                      const verifyRes = await fetch(verifyApiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: result.data.userId || result.data.systemUserId,
                          razorpayPaymentData: {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                          }
                        })
                      });
                      
                      const verifyData = await verifyRes.json();

                      // 2. Update local storage with the new token
                      if (verifyData.success && verifyData.data && verifyData.data.accessToken) {
                        localStorage.setItem("token", verifyData.data.accessToken);
                        
                        // Update the locally cached user object so the app knows they paid
                        const updatedUser = { ...result.data, isPaymentVerified: true };
                        localStorage.setItem("user", JSON.stringify(updatedUser));
                      } else if (result.token) {
                        localStorage.setItem("token", result.token);
                      }

                      // 3. Permanently unlock the local SQLite DB
                      await fetch("http://localhost:49215/api/payment/license", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ simulate: true }) // Force unlock
                      }).catch(() => {});
                      
                      // 4. Log them in!
                      handleAuthenticate(false);

                    } catch (error) {
                      console.error("Central Verification Error:", error);
                      setErrorMsg("Failed to sync payment with server. Please try logging in again.");
                      setIsLoading(false);
                    }
                  },
                  prefill: {
                    name: result.data.handlerName || "",
                    contact: result.data.mobileNumber || ""
                  },
                  theme: { color: "#c1552c" },
                  modal: {
                    ondismiss: function() {
                      setIsLoading(false);
                      setErrorMsg("Payment is required to access the dashboard.");
                    }
                  }
                };

                if (!window.Razorpay) {
                  setErrorMsg("Razorpay SDK failed to load.");
                  setIsLoading(false);
                  return;
                }

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response){
                   setErrorMsg(response.error.description || "Payment failed");
                   setIsLoading(false);
                });
                rzp.open();
                return; // Wait for Razorpay modal
              } catch (err) {
                setErrorMsg("Error opening payment screen.");
                setIsLoading(false);
              }
            }
          } else if (result.token && !result.data) {
             // Fallback if data is missing but token exists
             localStorage.setItem("token", result.token);
             handleAuthenticate(false);
          }
        } else {
          const errorData = await response.json().catch(() => null);
          setErrorMsg(
            errorData?.message || "Invalid credentials. Please try again.",
          );
        }
      } else {
        const payload = {
          businessName,
          handlerName,
          mobileNumber,
          password,
          language,
        };

        const apiUrl = "https://backend-for-drawing-school.vercel.app/api/auth/register/";

        // 1. Create a Razorpay order from local backend
        let orderRes;
        try {
          orderRes = await fetch("http://localhost:49215/api/payment/create-order", { method: "POST" });
        } catch (err) {
          setErrorMsg("Local backend not running. Please restart the app.");
          setIsLoading(false);
          return;
        }

        let orderData;
        try {
          orderData = await orderRes.json();
        } catch (err) {
          setErrorMsg("Failed to parse order API response. Did you restart the server?");
          setIsLoading(false);
          return;
        }

        if (!orderData.success) {
          setErrorMsg(orderData.message || "Failed to initialize payment");
          setIsLoading(false);
          return;
        }

        // 2. Open Razorpay Checkout Modal
        try {
          const options = {
            key: orderData.key_id,
            amount: orderData.order.amount,
            currency: orderData.order.currency,
            name: businessName || "Drawing School",
            description: "Software License Registration",
            order_id: orderData.order.id,
            handler: async function (response) {
              // 3. Inject payment data into payload
              payload.razorpayPaymentData = {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              };
              payload.isPaymentVerified = true;

              // 4. Send Registration API request
              try {
                const regResponse = await fetch(apiUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
                });

                if (regResponse.ok) {
                  const result = await regResponse.json();
                  if (result.success && result.data) {
                    const systemUserId = result.data.systemUserId || result.data.systemId || result.data.userId || result.data._id || result.data.id;
                    const userData = { ...result.data, systemUserId };
                    localStorage.setItem("user", JSON.stringify(userData));
                    if (result.data.accessToken) {
                      localStorage.setItem("token", result.data.accessToken);
                    }

                    // Background sync with local database
                    await fetch("http://localhost:49215/api/school-setup", {
                      method: "POST",
                      headers: { 
                        "Content-Type": "application/json",
                        "x-system-id": systemUserId
                      },
                      body: JSON.stringify({
                        name: result.data.businessName || "My School",
                        mobile: result.data.mobileNumber || "0000000000",
                        systemID: systemUserId
                      }),
                    }).catch(err => console.error("Local sync error:", err));
                    
                    // Unlock the local PC software automatically
                    await fetch("http://localhost:49215/api/payment/license", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ simulate: true }) // Force unlock
                    }).catch(() => {});

                  } else if (result.token) {
                    localStorage.setItem("token", result.token);
                  }
                  
                  handleAuthenticate(false);
                } else {
                  const errorData = await regResponse.json().catch(() => null);
                  setErrorMsg(errorData?.message || "Registration failed. Please try again.");
                  setIsLoading(false);
                }
              } catch (err) {
                console.error(err);
                setErrorMsg("Network error during registration.");
                setIsLoading(false);
              }
            },
            prefill: {
              name: handlerName || "",
              contact: mobileNumber || ""
            },
            theme: { color: "#c1552c" },
            modal: {
              ondismiss: function() {
                setIsLoading(false);
              }
            }
          };

          if (!window.Razorpay) {
            setErrorMsg("Razorpay SDK failed to load. Check your internet connection.");
            setIsLoading(false);
            return;
          }

          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){
             setErrorMsg(response.error.description || "Payment failed");
             setIsLoading(false);
          });
          rzp.open();
        } catch (rzpErr) {
          console.error("Razorpay Init Error:", rzpErr);
          setErrorMsg(rzpErr.message || "Failed to open Razorpay modal");
          setIsLoading(false);
        }
        
        // Return here so we don't hit the finally block immediately while modal is open
        return;
      }
    } catch (error) {
      console.error("Auth Error:", error);
      setErrorMsg(error.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
    
    if (isLogin) {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Panel - Branding/Image (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 relative flex-col justify-between p-10 text-white overflow-hidden">
        
        {/* Animated Background Graphics */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 w-full h-[60%] bg-gradient-to-b from-zinc-900 to-zinc-950"></div>
          
          {/* Twinkling Stars */}
          <div className="absolute top-0 left-0 w-full h-[55%] z-0">
             {[
               [10, 20, 3.2, 0.5], [25, 10, 2.5, 1.2], [45, 30, 4.0, 0.2], 
               [60, 15, 3.3, 0.8], [80, 25, 2.8, 1.5], [90, 5, 3.4, 0.4], 
               [15, 45, 2.6, 0.9], [35, 50, 4.1, 1.1], [55, 40, 2.7, 0.3], 
               [75, 48, 3.9, 1.4], [5, 10, 2.2, 0.7], [20, 35, 3.5, 1.0], 
               [40, 5, 4.1, 0.1], [70, 35, 2.4, 1.3], [85, 40, 3.6, 0.6], 
               [95, 20, 2.3, 1.6], [50, 20, 3.8, 0.5], [30, 25, 2.2, 0.8], 
               [12, 55, 3.4, 1.2], [65, 50, 2.7, 0.4], [88, 55, 3.5, 0.9],
               [2, 30, 3.1, 1.5], [18, 5, 2.9, 0.4], [28, 45, 4.2, 1.8],
               [38, 15, 2.4, 0.7], [48, 45, 3.7, 1.1], [58, 5, 2.6, 1.9],
               [68, 20, 4.3, 0.3], [78, 10, 2.1, 1.6], [92, 35, 3.8, 0.8],
               [98, 45, 2.5, 1.4], [7, 40, 3.3, 1.0], [22, 20, 4.5, 0.2],
               [32, 55, 2.7, 1.7], [42, 25, 3.9, 0.6], [52, 10, 2.8, 1.3],
               [62, 35, 4.4, 0.9], [72, 55, 3.0, 1.5], [82, 5, 2.3, 0.1],
               [90, 50, 4.1, 1.2], [3, 15, 2.6, 0.5], [14, 25, 3.5, 1.8],
               [26, 35, 2.9, 0.7], [36, 10, 4.2, 1.1], [46, 50, 3.4, 0.4],
               [56, 25, 2.2, 1.9], [66, 15, 3.7, 0.3], [76, 40, 4.0, 1.6],
               [86, 20, 2.5, 0.8], [94, 10, 3.1, 1.4], [96, 55, 4.6, 0.2]
             ].map(([left, top, duration, delay], i) => (
                <div 
                  key={`star-${i}`}
                  className="absolute bg-white rounded-full"
                  style={{
                     left: `${left}%`,
                     top: `${top}%`,
                     width: `${Math.max(1.5, duration - 1)}px`,
                     height: `${Math.max(1.5, duration - 1)}px`,
                     animation: `twinkle ${duration}s ease-in-out infinite ${delay}s`
                  }}
                />
             ))}
          </div>

          {/* Glowing Moon */}
          <div className="absolute top-12 right-20 z-0">
             <div className="relative">
                <div className="absolute inset-0 bg-yellow-100 rounded-full blur-[24px] opacity-30 transform scale-150"></div>
                <Moon className="relative w-20 h-20 text-yellow-100 fill-yellow-100/10 drop-shadow-[0_0_15px_rgba(254,240,138,0.3)]" strokeWidth={1} />
             </div>
          </div>
          
          {/* Road */}
          <div className="absolute bottom-0 w-full h-[40%] bg-[#1a1c23] transform -skew-y-3 origin-bottom-right shadow-[inset_0_10px_20px_rgba(0,0,0,0.5)]">
            {/* Road lines */}
            <div className="absolute top-1/2 left-0 w-full h-2 flex gap-8 whitespace-nowrap overflow-hidden -translate-y-1/2">
              <style>{`
                @keyframes twinkle {
                  0%, 100% { opacity: 0.1; transform: scale(0.5); }
                  50% { opacity: 0.8; transform: scale(1.2); }
                }
                @keyframes road-move {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-150px); }
                }
                @keyframes car-bounce {
                  0%, 100% { transform: translateY(0); }
                  50% { transform: translateY(-4px); }
                }
                @keyframes wheel-spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                @keyframes clouds-move {
                  0% { transform: translateX(100%); }
                  100% { transform: translateX(-100%); }
                }
                @keyframes rain-fall {
                  0% { transform: translate(0, -20vh) rotate(-20deg); opacity: 0; }
                  10% { opacity: 1; }
                  80% { opacity: 1; }
                  100% { transform: translate(-30vw, 100vh) rotate(-20deg); opacity: 0; }
                }
                @keyframes tree-sway {
                  0%, 100% { transform: rotate(-6deg); }
                  50% { transform: rotate(6deg); }
                }
                @keyframes trees-move {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
              `}</style>
              <div className="w-[200%] h-full flex gap-12" style={{ animation: 'road-move 0.6s linear infinite' }}>
                 {[...Array(30)].map((_, i) => (
                   <div key={i} className="w-16 h-full bg-[#c1552c]/80 rounded-full" />
                 ))}
              </div>
            </div>
          </div>

          {/* Trees Horizon (Behind Road) */}
          <div className="absolute bottom-[30%] left-0 w-[200%] h-32 z-0 opacity-80" style={{ animation: 'trees-move 12s linear infinite' }}>
             {[
               [5, 3.2, 0.1, 70, 100], [18, 3.5, 0.8, 90, 120], [32, 2.8, 0.3, 60, 90],
               [45, 3.1, 1.2, 85, 110], [58, 3.8, 0.5, 75, 105], [72, 2.9, 0.2, 95, 125],
               [85, 3.6, 0.9, 65, 95],
               [105, 3.2, 0.1, 70, 100], [118, 3.5, 0.8, 90, 120], [132, 2.8, 0.3, 60, 90],
               [145, 3.1, 1.2, 85, 110], [158, 3.8, 0.5, 75, 105], [172, 2.9, 0.2, 95, 125],
               [185, 3.6, 0.9, 65, 95]
             ].map(([left, swayDur, swayDelay, w, h], i) => (
                <div 
                  key={`tree-${i}`}
                  className="absolute bottom-0"
                  style={{
                     left: `${left}%`,
                     transformOrigin: 'bottom center',
                     animation: `tree-sway ${swayDur}s ease-in-out infinite ${swayDelay}s`
                  }}
                >
                  <svg width={w} height={h} viewBox="0 0 100 120" fill="none">
                     <path d="M45 120h10v-30H45v30z" fill="#1a1210"/>
                     <circle cx="50" cy="50" r="40" fill="#064e3b"/>
                     <circle cx="30" cy="60" r="25" fill="#064e3b"/>
                     <circle cx="70" cy="60" r="25" fill="#065f46"/>
                     <circle cx="50" cy="30" r="25" fill="#065f46"/>
                  </svg>
                </div>
             ))}
          </div>

          {/* Rain */}
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-50">
             {[
               [12, 0.5, 0.1], [25, 0.4, 0.8], [45, 0.6, 0.3], [67, 0.5, 1.2], 
               [88, 0.7, 0.5], [105, 0.4, 0.2], [130, 0.6, 0.9], [145, 0.5, 1.5],
               [5, 0.6, 0.7], [35, 0.5, 1.1], [55, 0.4, 0.4], [78, 0.6, 1.3],
               [95, 0.5, 0.6], [115, 0.7, 0.8], [135, 0.4, 1.4], [15, 0.5, 1.8],
               [40, 0.6, 1.6], [60, 0.5, 0.2], [82, 0.4, 1.9], [125, 0.6, 0.1],
               [20, 0.5, 0.5], [50, 0.6, 1.0], [70, 0.4, 0.7], [110, 0.5, 1.7]
             ].map(([left, duration, delay], i) => (
                <div 
                  key={`rain-${i}`}
                  className="absolute bg-white/50 w-[2px] h-24 rounded-full"
                  style={{
                     left: `${left}%`,
                     top: `-20%`,
                     animation: `rain-fall ${duration}s linear infinite`,
                     animationDelay: `${delay}s`
                  }}
                />
             ))}
          </div>

          {/* Clouds Layer 1 - Slow */}
          <div className="absolute top-4 w-full h-40 opacity-[0.07]" style={{ animation: 'clouds-move 60s linear infinite' }}>
             <svg width="250" height="120" viewBox="0 0 200 100" fill="white" className="absolute top-0 right-10">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
             <svg width="150" height="80" viewBox="0 0 200 100" fill="white" className="absolute top-20 left-[10%]">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
             <svg width="200" height="100" viewBox="0 0 200 100" fill="white" className="absolute top-5 left-[60%]">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
          </div>

          {/* Clouds Layer 2 - Fast */}
          <div className="absolute top-24 w-full h-32 opacity-10" style={{ animation: 'clouds-move 35s linear infinite' }}>
             <svg width="180" height="90" viewBox="0 0 200 100" fill="white" className="absolute top-12 left-20">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
             <svg width="220" height="110" viewBox="0 0 200 100" fill="white" className="absolute top-2 right-[30%]">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
          </div>

          {/* Clouds Layer 3 - Mid (Fills empty space) */}
          <div className="absolute top-1/3 w-full h-64 opacity-[0.08]" style={{ animation: 'clouds-move 45s linear infinite' }}>
             <svg width="280" height="140" viewBox="0 0 200 100" fill="white" className="absolute top-10 left-[15%]">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
             <svg width="200" height="100" viewBox="0 0 200 100" fill="white" className="absolute top-0 right-[15%]">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
             <svg width="160" height="80" viewBox="0 0 200 100" fill="white" className="absolute top-32 left-[70%]">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
             <svg width="240" height="120" viewBox="0 0 200 100" fill="white" className="absolute top-20 left-[45%]">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
             <svg width="190" height="95" viewBox="0 0 200 100" fill="white" className="absolute top-40 left-5">
               <path d="M 50 50 A 20 20 0 0 1 90 50 A 30 30 0 0 1 150 50 A 20 20 0 0 1 190 50 Z" />
             </svg>
          </div>

          {/* Fancy SVG Car Driving */}
          <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 z-10">
            <div style={{ animation: 'car-bounce 0.8s infinite' }}>
              <svg width="350" height="186" viewBox="0 0 300 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ overflow: "visible" }}>
                {/* ground shadow */}
                <ellipse cx="150" cy="138" rx="130" ry="8" fill="rgba(0,0,0,0.5)" />
          
                {/* Light beam (added behind bumpers for effect) */}
                <polygon points="268,96 1000,-50 1000,250" fill="url(#light-gradient)" opacity="0.3" />

                {/* wheel-well black backdrops */}
                <circle cx="80" cy="120" r="26" fill="#111" />
                <circle cx="220" cy="120" r="26" fill="#111" />
          
                {/* body */}
                <path
                  d="
                    M 30 118
                    L 30 100
                    C 30 92 36 86 44 86
                    L 70 86
                    L 95 55
                    C 100 49 108 46 116 46
                    L 190 46
                    C 198 46 205 49 210 55
                    L 232 82
                    L 262 86
                    C 270 87 276 93 276 101
                    L 276 118
                    Z
                  "
                  fill="#c1552c"
                  stroke="#8f3d1e"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
          
                {/* windows */}
                <path d="M 100 82 L 118 56 C 121 52 126 50 131 50 L 148 50 L 148 82 Z" fill="#161a2e" />
                <path d="M 154 82 L 154 50 L 186 50 C 191 50 196 52 199 56 L 216 82 Z" fill="#161a2e" />
                <rect x="150" y="50" width="4" height="32" fill="#8f3d1e" />
          
                {/* door seam */}
                <line x1="180" y1="86" x2="180" y2="118" stroke="#8f3d1e" strokeWidth="2" opacity="0.6" />
          
                {/* bumpers */}
                <rect x="30" y="100" width="12" height="18" rx="3" fill="#eee7dc" />
                <rect x="264" y="100" width="12" height="18" rx="3" fill="#eee7dc" />
          
                {/* lights: headlight (front, right) / taillight (rear, left) */}
                <circle cx="268" cy="96" r="4" fill="#f4d58d" />
                <circle cx="38" cy="96" r="4" fill="#e0574a" />
          
                {/* door handle */}
                <rect x="164" y="76" width="10" height="4" rx="2" fill="#eee7dc" />
          
                {/* wheel arches */}
                <path d="M 54 118 A 26 26 0 0 1 106 118" fill="none" stroke="#eee7dc" strokeWidth="3" opacity="0.7" />
                <path d="M 194 118 A 26 26 0 0 1 246 118" fill="none" stroke="#eee7dc" strokeWidth="3" opacity="0.7" />
          
                {/* wheels */}
                <g transform="translate(80,120)">
                  <g style={{ transformOrigin: "0px 0px", animation: "wheel-spin 0.5s linear infinite" }}>
                    <circle r="19" fill="#151515" />
                    <circle r="19" fill="none" stroke="#333" strokeWidth="2" />
                    <circle r="9.5" fill="#c9c9c9" />
                    <line x1="0" y1="-9.5" x2="0" y2="9.5" stroke="#777" strokeWidth="2" />
                    <line x1="-9.5" y1="0" x2="9.5" y2="0" stroke="#777" strokeWidth="2" />
                    <circle r="2.5" fill="#555" />
                  </g>
                </g>
                <g transform="translate(220,120)">
                  <g style={{ transformOrigin: "0px 0px", animation: "wheel-spin 0.5s linear infinite" }}>
                    <circle r="19" fill="#151515" />
                    <circle r="19" fill="none" stroke="#333" strokeWidth="2" />
                    <circle r="9.5" fill="#c9c9c9" />
                    <line x1="0" y1="-9.5" x2="0" y2="9.5" stroke="#777" strokeWidth="2" />
                    <line x1="-9.5" y1="0" x2="9.5" y2="0" stroke="#777" strokeWidth="2" />
                    <circle r="2.5" fill="#555" />
                  </g>
                </g>

                <defs>
                  <linearGradient id="light-gradient" x1="268" y1="96" x2="1000" y2="96" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#f4d58d" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#f4d58d" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="mt-8 text-center z-10">
              <h2 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-xl bg-zinc-950/30 px-6 py-2 rounded-2xl backdrop-blur-sm border border-white/10">
                {storedBusinessName}
              </h2>
            </div>
          </div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 flex items-center gap-3 bg-zinc-950/40 p-3 rounded-2xl backdrop-blur-sm self-start border border-white/5">
          <div className="bg-[#c1552c] p-2.5 rounded-xl shadow-lg shadow-[#c1552c]/20">
            <Car className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            {storedBusinessName}
          </span>
        </div>


        <div className="relative z-10 self-start bg-zinc-950/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/5">
          <p className="text-sm font-medium text-zinc-400">
            &copy; {new Date().getFullYear()} {storedBusinessName}. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="bg-[#c1552c] p-2 rounded-lg">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              {storedBusinessName}
            </span>
          </div>

          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              {isLogin ? "Sign in" : "Create an account"}
            </h2>
            <p className="text-muted-foreground">
              {isLogin
                ? "Enter your username or mobile number to access your account"
                : "Enter your details below to create your account"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {errorMsg && (
              <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4">
              {isLogin ? (
                <div className="space-y-2 relative">
                  <Label htmlFor="businessOrMobile">
                    Business Name or Mobile Number
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="businessOrMobile"
                      type="text"
                      placeholder="Enter business name or mobile number"
                      className="pl-10"
                      value={businessOrMobile}
                      onChange={(e) => setBusinessOrMobile(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2 relative">
                    <Label htmlFor="businessName">Business Name</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="businessName"
                        type="text"
                        placeholder="Enter your business name"
                        className="pl-10"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="handlerName">Handler Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="handlerName"
                        type="text"
                        placeholder="Enter handler name"
                        className="pl-10"
                        value={handlerName}
                        onChange={(e) => setHandlerName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="mobileNumber"
                        type="tel"
                        placeholder="Enter your mobile number"
                        className="pl-10"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <Label htmlFor="language">Language</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="language"
                        type="text"
                        placeholder="Preferred language"
                        className="pl-10"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {isLogin && (
                    <a
                      href="#"
                      className="text-sm font-medium text-[#c1552c] hover:underline"
                    >
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#c1552c] hover:bg-[#a84a26] text-white disabled:opacity-70"
            >
              {isLoading
                ? "Please wait..."
                : isLogin
                  ? "Sign in"
                  : "Create account"}
              {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Button
              variant="outline"
              type="button"
              className="w-full flex justify-center gap-2 border-[#c1552c]/50 text-[#c1552c] hover:bg-[#c1552c]/10"
              onClick={() => handleAuthenticate(true)}
            >
              <CalendarClock className="w-4 h-4" />
              Start 15-Day Free Demo
            </Button>

          </div>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <Link
              href={isLogin ? "/register" : "/login"}
              className="font-medium text-[#c1552c] hover:underline"
            >
              {isLogin ? "Register now" : "Sign in"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
