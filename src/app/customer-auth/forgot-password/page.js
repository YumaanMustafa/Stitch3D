"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import AuthLayout from "../../components/AuthLayout";
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from "yup";

const ForgotPasswordSchema = Yup.object().shape({
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
});

export default function ForgotPassword() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerMessage("");
    setIsSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();

      if (res.ok) {
        setServerMessage(data.message || "Reset link sent! Check your email.");
        setIsSuccess(true);
        setTimeout(() => {
          router.push(`/customer-auth/reset-password?email=${encodeURIComponent(values.email)}`);
        }, 2000);
      } else {
        setServerMessage(data.message || "Account not found or error sending code.");
        setIsSuccess(false);
      }
    } catch (err) {
      setServerMessage("Network error. Please try again later.");
      setIsSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Don't worry, we'll help you reset it."
      heroTitle={<>Secure Your <span className="text-gold-gradient">Digital Atelier</span></>}
      heroSubtitle="Privacy and security are our top priorities. Recover your account to continue crafting your bespoke collection."
      heroImage="https://images.unsplash.com/photo-1548883354-94bcfe321cbb?q=80&w=2692&auto=format&fit=crop"
    >
      <Formik
        initialValues={{ email: "" }}
        validationSchema={ForgotPasswordSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="space-y-6">
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Reset Code"}
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
                Remember your password?{" "}
                <Link href="/customer-auth/login" className="text-[var(--color-accent-orange)] font-bold hover:underline transition-all">
                  Back to Login
                </Link>
              </p>
            </div>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
}