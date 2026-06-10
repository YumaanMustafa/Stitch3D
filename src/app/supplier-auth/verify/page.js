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
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [serverMessage, setServerMessage] = useState(!email ? "No email provided. Please sign up first." : "");
  const [isSuccess, setIsSuccess] = useState(false);
  const [otp, setOtp] = useState("");
  const [resending, setResending] = useState(false);

  const handleVerify = async ({ setSubmitting }) => {
    if (otp.length < 6) {
      setServerMessage("Full code required.");
      return;
    }
    setServerMessage("");
    setIsSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setServerMessage(data.message || "Email verified! Review in progress.");
      } else {
        setServerMessage(data.message || "Code is incorrect.");
      }
    } catch (err) {
      setServerMessage("Error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setServerMessage("Sending code...");
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setServerMessage("New code sent!");
      else setServerMessage("Failed to resend.");
    } catch (err) {
      setServerMessage("Failed to resend code");
    } finally {
      setResending(false);
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
