"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthLayout from "../../components/AuthLayout";
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from "yup";

const ResetPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  code: Yup.string()
    .matches(/^[0-9]{6}$/, "Must be exactly 6 digits")
    .required("Verification code is required"),
  newPassword: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[a-zA-Z]/, "Password must contain at least one letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], "Passwords must match")
    .required("Confirm password is required"),
});

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const emailFromQuery = params?.get("email") ?? "";
  const [serverMessage, setServerMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const initialValues = {
    email: emailFromQuery,
    code: "",
    newPassword: "",
    confirmPassword: "",
  };

  const [resending, setResending] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerMessage("");
    setIsSuccess(false);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email.toLowerCase(),
          code: values.code.trim(),
          newPassword: values.newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setServerMessage(data.message || "Unable to reset password");
        setIsSuccess(false);
      } else {
        setServerMessage("Password reset successful");
        setIsSuccess(true);
        setTimeout(() => router.push("/customer-auth/login"), 1500);
      }
    } catch (err) {
      setServerMessage("Connection error. Try again later.");
      setIsSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async (email) => {
    if (!email) {
      setServerMessage("Please enter your email to resend code.");
      setIsSuccess(false);
      return;
    }
    setResending(true);
    setServerMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setServerMessage(data.message || "New code sent! Check your email.");
        setIsSuccess(true);
      } else {
        setServerMessage(data.message || "Failed to resend code.");
        setIsSuccess(false);
      }
    } catch (err) {
      setServerMessage("Network error. Try again.");
      setIsSuccess(false);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter the code sent to your email and choose a new password"
    >
      <Formik
        initialValues={initialValues}
        validationSchema={ResetPasswordSchema}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ isSubmitting, values }) => (
          <Form className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">
                Email Address
              </label>
              <Field
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
              />
              <ErrorMessage name="email">
                {(msg) => <div className="mt-1.5 p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in"><span className="text-lg">⚠️</span> {msg}</div>}
              </ErrorMessage>
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">
                Verification Code (6-digit)
              </label>
              <Field
                id="code"
                name="code"
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 tracking-widest font-mono input-premium"
              />
              <ErrorMessage name="code">
                {(msg) => <div className="mt-1.5 p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in"><span className="text-lg">⚠️</span> {msg}</div>}
              </ErrorMessage>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">
                New Password
              </label>
              <Field
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="Min. 8 chars, 1 letter, 1 number"
                className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
              />
              <ErrorMessage name="newPassword">
                {(msg) => <div className="mt-1.5 p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in"><span className="text-lg">⚠️</span> {msg}</div>}
              </ErrorMessage>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">
                Confirm Password
              </label>
              <Field
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
              />
              <ErrorMessage name="confirmPassword">
                {(msg) => <div className="mt-1.5 p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in"><span className="text-lg">⚠️</span> {msg}</div>}
              </ErrorMessage>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>

            {serverMessage && (
              <div className={`text-center text-sm py-4 px-4 rounded-xl font-bold shadow-md animate-fade-in flex items-center justify-center gap-2 ${isSuccess
                ? "bg-[var(--color-brand)] text-white border border-[var(--color-gold)]"
                : "bg-rose-50 text-[var(--color-error)] border border-rose-100"
                }`}>
                {isSuccess && <span className="text-[var(--color-gold)]">✓</span>}
                {!isSuccess && <span>🚫</span>}
                {serverMessage}
              </div>
            )}

            <div className="pt-2 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Didn't receive a code?{" "}
                <button
                  type="button"
                  onClick={() => handleResend(values.email)}
                  disabled={resending}
                  className="text-[var(--color-brand)] font-bold hover:underline transition-all disabled:opacity-50"
                >
                  {resending ? "Sending..." : "Request new OTP"}
                </button>
              </p>
            </div>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}