"use client";

import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { Suspense, useEffect, useState, useRef } from "react";

function WhatsAppConnectContent() {
  const searchParams = useSearchParams();

  // -----------------------------------------
  // GET PARAMETERS FROM URL
  // -----------------------------------------
  const userId = searchParams.get("userId") || searchParams.get("id");
  const accessToken = searchParams.get("accessToken") || searchParams.get("token");
  const businessName = searchParams.get("businessName") || searchParams.get("name");

  const [isLoaded, setIsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const waDataRef = useRef(null);

  // -----------------------------------------
  // DEBUG URL PARAMETERS
  // -----------------------------------------
  useEffect(() => {
    console.log("========== WHATSAPP CONNECT ==========");

    console.log("URL:", window.location.href);
    console.log("User ID:", userId);
    console.log("Business Name:", businessName);
    console.log(
      "Access Token:",
      accessToken ? "PRESENT" : "MISSING",
    );

    console.log("======================================");
  }, [userId, accessToken, businessName]);

  // -----------------------------------------
  // META POSTMESSAGE
  // -----------------------------------------
  useEffect(() => {
    const handleMessage = (event) => {
      console.log("========== META MESSAGE ==========");
      console.log("Origin:", event.origin);
      console.log("Raw data:", event.data);

      // Only accept Meta
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        console.log("❌ Ignored unknown origin");
        return;
      }

      let data = event.data;

      // Meta can send JSON string
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          console.log("❌ Could not parse Meta message");
          return;
        }
      }

      if (data?.type !== "WA_EMBEDDED_SIGNUP") {
        return;
      }

      console.log(
        "✅ WA_EMBEDDED_SIGNUP:",
        data,
      );

      // -----------------------------------------
      // FINISH
      // -----------------------------------------
      if (data.event === "FINISH") {
        const signupData = data.data || {};

        console.log(
          "========== META SIGNUP DATA ==========",
        );

        console.log(
          "WABA ID:",
          signupData.waba_id,
        );

        console.log(
          "Phone Number ID:",
          signupData.phone_number_id,
        );

        console.log(
          "Display Phone:",
          signupData.display_phone_number ||
            signupData.phone_number,
        );

        console.log(
          "Verified Name:",
          signupData.verified_name,
        );

        waDataRef.current = {
          wabaId: signupData.waba_id,

          phoneNumberId:
            signupData.phone_number_id,

          displayPhoneNumber:
            signupData.display_phone_number ||
            signupData.phone_number,

          verifiedName:
            signupData.verified_name,
        };

        console.log(
          "Saved WhatsApp data:",
          waDataRef.current,
        );

        console.log(
          "======================================",
        );
      }

      // -----------------------------------------
      // CANCEL
      // -----------------------------------------
      if (data.event === "CANCEL") {
        console.log(
          "❌ WhatsApp Embedded Signup cancelled:",
          data.data,
        );
      }

      // -----------------------------------------
      // ERROR
      // -----------------------------------------
      if (data.event === "ERROR") {
        console.error(
          "❌ WhatsApp Embedded Signup error:",
          data.data,
        );
      }
    };

    window.addEventListener(
      "message",
      handleMessage,
    );

    console.log(
      "✅ Meta message listener attached",
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage,
      );
    };
  }, []);

  // -----------------------------------------
  // ACCESS TOKEN CHECK
  // -----------------------------------------
  if (!accessToken) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Unauthorized access
          </h2>

          <p className="text-gray-600">
            Missing authorization token.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------
  // CONNECT WHATSAPP
  // -----------------------------------------
  const handleConnect = () => {
    console.log(
      "========== CONNECT WHATSAPP ==========",
    );

    console.log("User ID:", userId);

    if (!userId) {
      console.error("❌ userId missing");

      setError(
        "Missing userId. Please check the connection URL.",
      );

      return;
    }

    if (!window.FB) {
      console.error(
        "❌ Facebook SDK not loaded",
      );

      setError(
        "Facebook SDK not loaded. Please try again.",
      );

      return;
    }

    console.log("✅ Facebook SDK loaded");

    setLoading(true);
    setError(null);
    setSuccess(false);

    // Clear old Meta data
    waDataRef.current = null;

    console.log(
      "Opening Meta Embedded Signup...",
    );

    window.FB.login(
      (response) => {
        console.log(
          "========== FACEBOOK LOGIN RESPONSE ==========",
        );

        console.log(
          "FB response:",
          response,
        );

        if (!response.authResponse) {
          console.log(
            "❌ User cancelled or authorization failed",
          );

          setError(
            "User cancelled login or did not fully authorize.",
          );

          setLoading(false);

          return;
        }

        const authCode =
          response.authResponse.code;

        console.log(
          "✅ Authorization code received:",
          !!authCode,
        );

        // Give Meta postMessage time to arrive
        setTimeout(async () => {
          console.log(
            "========== FINAL META DATA ==========",
          );

          const waData =
            waDataRef.current;

          console.log(
            "WhatsApp data:",
            waData,
          );

          if (!waData?.wabaId) {
            console.error(
              "❌ WABA ID missing",
            );

            setError(
              "WhatsApp Business Account ID was not received from Meta.",
            );

            setLoading(false);

            return;
          }

          if (!waData?.phoneNumberId) {
            console.error(
              "❌ Phone Number ID missing",
            );

            setError(
              "WhatsApp Phone Number ID was not received from Meta.",
            );

            setLoading(false);

            return;
          }

          if (!userId) {
            console.error(
              "❌ User ID missing",
            );

            setError(
              "User ID is missing.",
            );

            setLoading(false);

            return;
          }

          // -----------------------------------------
          // BACKEND PAYLOAD
          // -----------------------------------------
          const payload = {
            code: authCode,

            userId,

            wabaId:
              waData.wabaId,

            phoneNumberId:
              waData.phoneNumberId,

            displayPhoneNumber:
              waData.displayPhoneNumber ||
              null,

            verifiedName:
              waData.verifiedName ||
              null,
          };

          console.log(
            "========== BACKEND PAYLOAD ==========",
          );

          console.log({
            code: payload.code
              ? "PRESENT"
              : "MISSING",

            userId:
              payload.userId,

            wabaId:
              payload.wabaId,

            phoneNumberId:
              payload.phoneNumberId,

            displayPhoneNumber:
              payload.displayPhoneNumber,

            verifiedName:
              payload.verifiedName,
          });

          console.log(
            "=====================================",
          );

          try {
            console.log(
              "Sending POST request to exchange API...",
            );

            const res = await fetch(
              "https://backend-for-drawing-school.vercel.app/api/whatsapp/embedded-signup/exchange/",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${accessToken}`,
                },

                body:
                  JSON.stringify(payload),
              },
            );

            console.log(
              "Backend HTTP status:",
              res.status,
            );

            const result =
              await res
                .json()
                .catch(() => ({}));

            console.log(
              "Backend response:",
              result,
            );

            if (!res.ok) {
              throw new Error(
                result.message ||
                  result.error ||
                  `Server responded with status ${res.status}`,
              );
            }

            console.log(
              "✅ WhatsApp connection successful",
            );

            setSuccess(true);

          } catch (err) {
            console.error(
              "❌ Exchange error:",
              err,
            );

            setError(
              err.message ||
                "Failed to link WhatsApp account.",
            );

          } finally {
            setLoading(false);
          }
        }, 1500);
      },

      {
        config_id:
          "2655838821499638",

        response_type:
          "code",

        override_default_response_type:
          true,

        extras: {
          version: "v4",
          sessionInfoVersion: "3",
        },
      },
    );
  };

  // -----------------------------------------
  // UI
  // -----------------------------------------
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">

      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log(
            "========== FACEBOOK SDK ==========",
          );

          if (window.FB) {
            window.FB.init({
              appId:
                "2290666861778395",

              xfbml: true,

              version:
                "v26.0",
            });

            console.log(
              "✅ Facebook SDK initialized",
            );

            setIsLoaded(true);
          } else {
            console.error(
              "❌ Facebook SDK unavailable",
            );
          }
        }}
      />

      <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full">

        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Connect WhatsApp
        </h1>

        {businessName && (
          <p className="text-gray-600 mb-6 text-center">
            Link WhatsApp to{" "}
            <strong>
              {businessName}
            </strong>
          </p>
        )}

        {success ? (
          <div className="bg-green-50 text-green-700 p-6 rounded-md text-center border border-green-200">

            <svg
              className="w-16 h-16 text-green-500 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            <h3 className="font-bold text-xl mb-2">
              Successfully Connected!
            </h3>

            <p className="text-sm">
              Your WhatsApp account has been
              linked successfully.
            </p>

          </div>
        ) : (
          <>
            <button
              onClick={handleConnect}
              disabled={
                !isLoaded || loading
              }
              className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all shadow-sm ${
                !isLoaded || loading
                  ? "bg-blue-400 cursor-not-allowed opacity-70"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {loading
                ? "Connecting..."
                : !isLoaded
                  ? "Loading SDK..."
                  : "Connect WhatsApp"}
            </button>

            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
                {error}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-6 text-center">
              By connecting, you agree to
              our terms and conditions and
              privacy policy.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function WhatsAppConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="p-8 bg-white rounded-lg shadow-md max-w-md w-full text-center">
            <p className="text-gray-600">
              Loading connection page...
            </p>
          </div>
        </div>
      }
    >
      <WhatsAppConnectContent />
    </Suspense>
  );
}