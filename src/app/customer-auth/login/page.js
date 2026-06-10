// File: app/customer-auth/login/page.js
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Link from "next/link";
import AuthLayout from "../../components/AuthLayout";
import RestoreAccountModal from "../../components/RestoreAccountModal";
import { Eye, EyeOff } from "lucide-react";

/**
 * @file page.js
 * @description Customer Login Page.
 * Handles user authentication via email/password.
 * Redirects to dashboard (Customer/Supplier) upon success.
 */

const LoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Enter a valid email")
    .matches(/^[^\s@]+@[^\s@]+\.(com|pk|org|uk)$/i, "Email must end with .com, .pk, .org, or .uk")
    .required("Email is required"),
  password: Yup.string().required("Password is required"),
});

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [loginData, setLoginData] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(values, { setSubmitting, setStatus }) {
    setLoading(true);
    setStatus({ message: "Signing in...", type: "info" });

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ message: data.message || "Invalid credentials", type: "error" });
        setSubmitting(false);
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      
      if (data.pending_deletion) {
        setLoginData(data);
        setShowRestoreModal(true);
        setLoading(false);
        return;
      }

      setStatus({ message: "Login successful", type: "success" });

      setTimeout(() => {
        if (data.role === "customer") {
          router.push("/customer/dashboard");
        } else if (data.role === "supplier") {
          router.push("/supplier/dashboard");
        } else {
          router.push("/customer-auth/login"); // Or home if preferred, but usually login pushes to dashboard
        }
      }, 500);
    } catch (err) {
      console.error("Login error", err);
      setStatus({ message: "Connection error. Please try again.", type: "error" });
      setSubmitting(false);
      setLoading(false);
    }
  }

  async function handleRestoreConfirm() {
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${loginData.token}`
        },
        body: JSON.stringify({ action: "cancel_deletion" }),
      });

      if (res.ok) {
        setShowRestoreModal(false);
        router.push(loginData.role === "customer" ? "/customer/dashboard" : "/supplier/dashboard");
      }
    } catch (err) {
      console.error("Restore error", err);
    }
  }

  return (
    <>
      <RestoreAccountModal 
        isOpen={showRestoreModal} 
        onClose={() => {
          setShowRestoreModal(false);
          router.push(loginData.role === "customer" ? "/customer/dashboard" : "/supplier/dashboard");
        }}
        onRestore={handleRestoreConfirm}
      />
      <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
      heroTitle={<>Your Style, <span className="text-gold-gradient">Your Identity</span></>}
      heroSubtitle="Log in to access your saved designs, track your bespoke orders, and continue your journey with Stitch."
      heroImage="https://images.unsplash.com/photo-1544642899-f0d6e5f6ed6f?q=80&w=2787&auto=format&fit=crop"
    >
      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={LoginSchema}
        onSubmit={handleLogin}
      >
        {({ isSubmitting, status }) => (
          <Form className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[var(--color-brand)] mb-1.5">
                  Email Address
                </label>
                <Field
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full px-4 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
                />
                <ErrorMessage name="email">
                  {(msg) => <div className="mt-1.5 p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in"><span className="text-lg">⚠️</span> {msg}</div>}
                </ErrorMessage>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-semibold text-[var(--color-brand)]">
                    Password
                  </label>
                  <Link href='/customer-auth/forgot-password' className="text-xs font-bold text-[var(--color-accent-orange)] hover:text-[#d97706] transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Field
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className="w-full pl-4 pr-12 py-3.5 bg-white rounded-xl text-[var(--text-primary)] placeholder-slate-400 input-premium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <ErrorMessage name="password">
                  {(msg) => <div className="mt-1.5 p-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in"><span className="text-lg">⚠️</span> {msg}</div>}
                </ErrorMessage>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full py-4 bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white font-bold rounded-xl shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting || loading ? "Signing in..." : "Log In"}
            </button>

            {status && status.message && (
              <div
                className={`text-center text-sm py-4 px-4 rounded-xl font-bold shadow-md animate-fade-in flex items-center justify-center gap-2 ${status.type === "success"
                  ? "bg-[var(--color-brand)] text-white border border-[var(--color-gold)]" // Premium Dark Success
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
                Don't have an account?{" "}
                <Link href="/customer-auth/signup" className="text-[var(--color-accent-orange)] font-bold hover:underline transition-all">
                  Sign up free
                </Link>
              </p>
            </div>
          </Form>
        )}
      </Formik>
    </AuthLayout>
    </>
  );
}
