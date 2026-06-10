"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Shield, Mail, Lock, Loader, ArrowRight } from "lucide-react";

/**
 * @file page.js
 * @description Admin Login Portal.
 * Dedicated login page for administrators.
 * Authenticates via `/api/admin/login` and stores token in localStorage.
 */

const AdminLoginSchema = Yup.object().shape({
  email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Email is required."),
  password: Yup.string()
    .required("Password is required."),
});

export default function AdminLogin() {
  const router = useRouter();

  const handleLogin = async (values, { setSubmitting, setStatus }) => {
    setStatus(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminName", data.admin.name);
        router.push("/admin/dashboard");
      } else {
        setStatus(data.message || "Invalid credentials");
      }
    } catch {
      setStatus("Unable to connect to server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden">

      {/* Decorative Background Mesh */}
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-100 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-10 relative z-10 animate-fade-in-up">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-200 transform rotate-3 hover:rotate-0 transition-all duration-300">
            <Shield className="text-white w-7 h-7" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Admin Portal</h1>
          <p className="text-slate-500 mt-2 text-sm">Secure access for Stitch administrators</p>
        </div>

        {/* Formik Wrapper */}
        <Formik
          initialValues={{ email: "", password: "" }}
          validationSchema={AdminLoginSchema}
          onSubmit={handleLogin}
        >
          {({ isSubmitting, status }) => (
            <Form className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Mail size={18} />
                  </div>
                  <Field
                    name="email"
                    type="email"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                    placeholder="Admin@Example.com"
                  />
                  <ErrorMessage name="email" component="div" className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Lock size={18} />
                  </div>
                  <Field
                    name="password"
                    type="password"
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                    placeholder="••••••••••••"
                  />
                  <ErrorMessage name="password" component="div" className="text-red-500 text-[10px] font-bold mt-1 ml-1 uppercase" />
                </div>
              </div>

              {status && (
                <div className="space-y-2">
                  {status && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 border border-red-100 text-sm flex items-center gap-2 animate-fade-in">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      {status}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#1E293B] hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-slate-900/10 transition-all transform hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader size={18} className="animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Sign In <ArrowRight size={18} />
                  </>
                )}
              </button>
            </Form>
          )}
        </Formik>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Subject to the Privacy Policy and Terms of Service.
          </p>
        </div>

      </div>

      <div className="mt-8 text-center text-slate-400 text-sm font-medium">
        &copy; {new Date().getFullYear()} Stitch Platform
      </div>

    </div>
  );
}
