"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect, Suspense } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import AuthLayout from "../../components/AuthLayout";

/**
 * @file page.js
 * @description Email Verification Page.
 * Accepts a 6-digit OTP code to verify user email.
 * Supports resending code if expired/missing.
 */

const VerifySchema = Yup.object().shape({
  code: Yup.string()
    .length(6, "Please enter the complete 6-digit code.")
    .matches(/^[0-9]+$/, "Code must be numeric")
    .required("Verification code is required"),
});

function VerifyContent() {
  const router = useRouter();
  const email = useSearchParams()?.get("email") || "";
  const [message, setMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setMessage("Verifying...");
    setResendMessage("");
    setIsSuccess(false);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: values.code }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || "Verification successful");
        setIsSuccess(true);
        setTimeout(() => router.push("/customer-auth/login"), 1500);
      } else {
        setMessage(data.message || "Invalid or expired code");
        setIsSuccess(false);
      }
    } catch (err) {
      setMessage("Connection error occurred");
      setIsSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return setResendMessage("Missing email parameter");
    setResending(true);
    setResendMessage("Sending new code...");
    setMessage(""); // Clear main message

    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setResendMessage(data.message || "New code sent");
      } else {
        setResendMessage(data.message || "Failed to resend code");
      }
    } catch (err) {
      setResendMessage("Connection error occurred");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify Account"
      subtitle={`Enter the 6-digit code sent to ${email}`}
      heroTitle={<>Your Identity, <span className="text-gold-gradient">Verified</span></>}
      heroSubtitle="Security is our promise. Verify your email to access your exclusive design portfolio."
      heroImage="https://images.unsplash.com/photo-1594938298603-c8148c47e356?q=80&w=2787&auto=format&fit=crop"
    >
      <Formik
        initialValues={{ code: "" }}
        validationSchema={VerifySchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">
                Verification Code
              </label>
              <Field
                name="code"
                type="text"
                maxLength={6}
                placeholder="000000"
                className="w-full px-6 py-4 bg-white rounded-xl text-center text-3xl font-mono tracking-[0.5em] text-[var(--text-primary)] placeholder-slate-300 input-premium focus:ring-[var(--color-accent-orange)]"
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setFieldValue("code", val);
                }}
              />
              <ErrorMessage name="code">
                {(msg) => <div className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">⚠️ {msg}</div>}
              </ErrorMessage>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70"
            >
              {isSubmitting ? "Verifying..." : "Verify Account"}
            </button>

            {(message || resendMessage) && (
              <div className={`text-center text-sm py-4 px-4 rounded-xl font-bold shadow-md animate-fade-in flex items-center justify-center gap-2 ${(isSuccess || (resendMessage && resendMessage.includes("sent")))
                ? "bg-[var(--color-brand)] text-white border border-[var(--color-gold)]"
                : "bg-rose-50 text-[var(--color-error)] border border-rose-100"
                }`}>
                {(isSuccess || (resendMessage && resendMessage.includes("sent"))) && <span className="text-[var(--color-gold)]">✓</span>}
                {!(isSuccess || (resendMessage && resendMessage.includes("sent"))) && <span>🚫</span>}
                {message || resendMessage}
              </div>
            )}

            <div className="pt-2 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-[var(--color-accent-orange)] font-bold hover:underline transition-all disabled:opacity-50"
                >
                  {resending ? "Resending..." : "Resend Code"}
                </button>
              </p>
              <div className="mt-4">
                <Link href="/customer-auth/login" className="text-xs text-slate-500 hover:text-[var(--color-brand)] transition-colors">
                  Back to Login
                </Link>
              </div>
            </div>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}