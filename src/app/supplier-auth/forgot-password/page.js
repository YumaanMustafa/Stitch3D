"use client";
import { useState } from "react";
import Link from "next/link";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import { KeySquare } from "lucide-react";

export default function SupplierForgotPassword() {
  const [serverMessage, setServerMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#F97316] selection:text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-[#F97316]/5 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 md:p-14 shadow-2xl shadow-slate-200/50 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center shadow-sm mb-8 border border-slate-200">
            <KeySquare className="text-[#F97316]" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Forgot Password</h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Reset your password</p>

          <Formik
            initialValues={{ email: "" }}
            validationSchema={Yup.object({ email: Yup.string().email("Invalid email").required("Required") })}
            onSubmit={async (v, { setSubmitting }) => {
              setSubmitting(false);
              setServerMessage("Reset link sent! Please check your email.");
              setIsSuccess(true);
            }}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                  <Field name="email" type="email" placeholder="email@example.com" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                  <ErrorMessage name="email" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#F97316] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#EA580C] transition-all shadow-xl shadow-[#F97316]/20">
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
                {serverMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${isSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
                    {serverMessage}
                  </motion.div>
                )}
                <div className="pt-4">
                  <Link href="/supplier-auth/login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#F97316]">
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
