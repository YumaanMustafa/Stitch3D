// File: app/customer-auth/signup/page.js
"use client";

import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import AuthLayout from "../../components/AuthLayout";

/**
 * @file page.js
 * @description Customer Signup Page.
 * Handles new user registration (Name, Email, Password).
 * Initiates verification flow upon successful signup.
 */

const SignupSchema = Yup.object().shape({
  firstName: Yup.string()
    .trim()
    .min(2, "Name is too short")
    .required("First name is required"),
  lastName: Yup.string()
    .trim()
    .min(2, "Name is too short")
    .required("Last name is required"),
  email: Yup.string()
    .email("Enter a valid email address")
    .matches(
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
      "Invalid email format"
    )
    .required("Email is required"),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .matches(/[a-zA-Z]/, "Password must contain at least one letter")
    .matches(/[0-9]/, "Password must contain at least one number")
    .required("Password is required"),
});

export default function Signup() {
  const router = useRouter();

  async function handleSignup(values, { setSubmitting, setStatus }) {
    setStatus({ message: "Creating your account...", type: "info" });

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus({ message: data.message || "Signup failed", type: "error" });
        setSubmitting(false);
        return;
      }

      setStatus({ message: "Account created! Redirecting...", type: "success" });
      setTimeout(() => router.push(`/customer-auth/verify?email=${values.email}`), 1200);
    } catch (err) {
      setStatus({ message: "Connection error. Try again.", type: "error" });
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Stitch and design your masterpiece"
      heroTitle={<>Join the <br /><span className="text-gold-gradient">Fashion Revolution</span></>}
      heroSubtitle="Create your account today to start designing bespoke leather jackets that define who you are."
      heroImage="https://images.unsplash.com/photo-1551488852-d814c937c191?q=80&w=2952&auto=format&fit=crop"
    >
      <Formik
        initialValues={{
          firstName: "",
          lastName: "",
          email: "",
          password: "",
        }}
        validationSchema={SignupSchema}
        onSubmit={handleSignup}
      >
        {({ isSubmitting, status }) => (
          <Form className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">First Name</label>
                <Field
                  name="firstName"
                  placeholder="First"
                  className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
                />
                <ErrorMessage name="firstName">
                  {(msg) => <div className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">⚠️ {msg}</div>}
                </ErrorMessage>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">Last Name</label>
                <Field
                  name="lastName"
                  placeholder="Last"
                  className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
                />
                <ErrorMessage name="lastName">
                  {(msg) => <div className="mt-1 text-xs font-semibold text-rose-600 flex items-center gap-1">⚠️ {msg}</div>}
                </ErrorMessage>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">Email Address</label>
              <Field
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
              <label className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">Password</label>
              <Field
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
              />
              <ErrorMessage name="password">
                {(msg) => <div className="mt-1.5 p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in"><span className="text-lg">⚠️</span> {msg}</div>}
              </ErrorMessage>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>

            {status?.message && (
              <div
                className={`text-center text-sm py-4 px-4 rounded-xl font-bold font-medium animate-fade-in flex items-center justify-center gap-2 ${status.type === "success"
                  ? "bg-[var(--color-brand)] text-white border border-[var(--color-gold)]"
                  : status.type === "error"
                    ? "bg-rose-50 text-[var(--color-error)] border border-rose-100"
                    : "bg-blue-50 text-blue-600"
                  }`}
              >
                {status.type === 'error' && <span>🚫</span>}
                {status.type === 'success' && <span className="text-[var(--color-gold)]">✓</span>}
                {status.message}
              </div>
            )}

            <div className="pt-2 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Already have an account?{" "}
                <Link href="/customer-auth/login" className="text-[var(--color-accent-orange)] font-bold hover:underline transition-all">
                  Log in
                </Link>
              </p>
            </div>
          </Form>
        )}
      </Formik>
    </AuthLayout>
  );
}
