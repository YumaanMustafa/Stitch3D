"use client";
import { useState } from "react";
import Link from "next/link";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";

export default function VendorForgotPassword() {
  const [serverMessage, setServerMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setServerMessage("Reset link sent! Please check your email.");
      } else {
        setServerMessage(data.message || "Request failed.");
        setIsSuccess(false);
      }
    } catch (err) {
      setServerMessage("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#F97316] selection:text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#F97316]/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 md:p-14 shadow-2xl shadow-slate-200/50">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center shadow-sm mb-8 border border-slate-200">
               <KeyRound className="text-[#F97316]" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Forgot Password</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Reset your password</p>
          </div>

          <Formik
            initialValues={{ email: "" }}
            validationSchema={Yup.object({
              email: Yup.string().email("Invalid email").required("Required"),
            })}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                  <Field name="email" type="email" placeholder="email@example.com" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                  <ErrorMessage name="email" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#F97316] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#EA580C] transition-all shadow-xl shadow-[#F97316]/20"
                >
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>

                {serverMessage && (
                  <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    {serverMessage}
                  </div>
                )}

                <div className="text-center pt-4">
                   <Link href="/vendor-auth/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#F97316]">
                     ← Back to Login
                   </Link>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </motion.div>
    </div>
  );
}
