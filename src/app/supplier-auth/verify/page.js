"use client";
import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, RefreshCw, MailOpen } from "lucide-react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import B2BAuthLayout from "../../components/B2BAuthLayout";

/**
 * @file page.js
 * @description Supplier Email Verification - Simplified Text.
 */

function OtpBoxes({ value, onChange }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const handleInput = (e, idx) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next = digits.map((d, i) => (i === idx ? digit : d)).join("");
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e, idx) => {
    if (e.key === "Backspace") {
      if (!digits[idx] && idx > 0) {
        const prev = digits.map((d, i) => (i === idx - 1 ? "" : d)).join("");
        onChange(prev);
        refs.current[idx - 1]?.focus();
      } else {
        const cleared = digits.map((d, i) => (i === idx ? "" : d)).join("");
        onChange(cleared);
      }
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (refs.current[idx] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleInput(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className="w-12 h-16 text-center text-xl font-black bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-900 focus:outline-none focus:border-[#F97316] focus:bg-white transition-all"
        />
      ))}
    </div>
  );
}

function SupplierVerifyEmailContent() {
  // STEP 1: Setting up State and URLs
  const router = useRouter(); // Tool to change pages later
  const searchParams = useSearchParams(); // Reads the web address (URL)
  const email = searchParams.get("email"); // Grabs the '?email=something@example.com' part of the link

  // Set up variables to hold our data
  // If there's no email in the URL, we show an error right away
  const [serverMessage, setServerMessage] = useState(!email ? "No email provided. Please sign up first." : "");
  const [isSuccess, setIsSuccess] = useState(false); // Changes the screen to a green "Success" layout when true
  const [otp, setOtp] = useState(""); // Holds the 6 numbers the user types in
  const [resending, setResending] = useState(false); // Disables the 'Resend Code' button while it's working

  // STEP 2: The Verification Function
  // Runs when they click "Confirm Code"
  const handleVerify = async ({ setSubmitting }) => {
    // 2A: Basic Check - Ensure they typed all 6 digits before asking the server
    if (otp.length < 6) {
      setServerMessage("Full code required.");
      return; // Stop here, don't talk to the backend
    }
    
    // Clear old messages and start the loading animation
    setServerMessage("");
    setIsSuccess(false);
    setSubmitting(true);
    
    try {
      // 2B: Send the Email and the 6-digit Code to the backend for checking
      const res = await fetch("/api/auth/verify", {
        method: "POST", // POST because we are sending sensitive verification data
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      
      const data = await res.json();
      
      // 2C: Handle the Result
      if (res.ok) {
        // Success! The code matched. Change the screen to the success view.
        setIsSuccess(true);
        setServerMessage(data.message || "Email verified! Review in progress.");
      } else {
        // Failure! (e.g. wrong code or expired code)
        setServerMessage(data.message || "Code is incorrect.");
      }
    } catch (err) {
      // Handle wifi/network dropouts
      setServerMessage("Error. Try again.");
    } finally {
      // Stop the loading spinner
      setSubmitting(false);
    }
  };

  // STEP 3: Resend Code Function
  // Runs if they didn't get the email and click "Resend"
  const handleResend = async () => {
    if (!email) return; // Can't resend if we don't know who they are!
    
    setResending(true); // Show a loading indicator next to the resend button
    setServerMessage("Sending code...");
    
    try {
      // Ask the server to generate and email a fresh 6-digit code
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (res.ok) {
          setServerMessage("New code sent!");
      } else {
          setServerMessage("Failed to resend.");
      }
    } catch (err) {
      setServerMessage("Failed to resend code");
    } finally {
      setResending(false); // Enable the button again
    }
  };

  if (isSuccess) {
    return (
      <B2BAuthLayout
        title="VERIFIED"
        subtitle="Success"
        heroTitle={<>SUPPLY <br/> CHAIN <br/> <span className="text-[#F97316]">ACTIVE</span></>}
        heroSubtitle="Verification successful. Your supplier account has been submitted for approval."
      >
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-100">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-4">Confirmed</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-relaxed mb-10">
            Your registration is complete. Our team will review your profile shortly.
          </p>
          <Link
            href="/supplier-auth/login"
            className="inline-block w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-[#F97316] transition-all shadow-xl shadow-slate-200"
          >
            Go to Login
          </Link>
        </div>
      </B2BAuthLayout>
    );
  }

  return (
    <B2BAuthLayout
      title="VERIFY"
      subtitle="Identity Validation"
      heroTitle={<>SECURE <br/> YOUR <br/> <span className="text-[#F97316]">PORTAL</span></>}
      heroSubtitle="Confirm your email to finish setting up your supplier account."
    >
      <div className="mb-10 text-center">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl mx-auto mb-4 flex items-center justify-center text-[#F97316]">
           <MailOpen size={24} />
        </div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
          Enter the code sent to: <br/>
          <span className="text-slate-900 font-black">{email || "your email"}</span>
        </p>
      </div>

      <Formik
        initialValues={{}}
        onSubmit={(_, helpers) => handleVerify(helpers)}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-8">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">6-Digit Code</label>
              <OtpBoxes value={otp} onChange={setOtp} />
            </div>

            {serverMessage && (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border ${isSuccess ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                <AlertCircle size={13} className="shrink-0" />
                {serverMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email || otp.length < 6}
              className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-[#F97316] transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Verifying..." : "Confirm Code"}
            </button>

            <div className="flex items-center justify-center gap-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">No code?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-[9px] font-black uppercase tracking-widest text-[#F97316] hover:underline transition-colors flex items-center gap-2"
              >
                <RefreshCw size={12} className={resending ? "animate-spin" : ""} /> {resending ? "Sending..." : "Resend"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </B2BAuthLayout>
  );
}

export default function SupplierVerifyEmail() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>}>
      <SupplierVerifyEmailContent />
    </Suspense>
  );
}
