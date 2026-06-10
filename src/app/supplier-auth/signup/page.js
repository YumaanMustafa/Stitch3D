"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { motion, AnimatePresence } from "framer-motion";
import { Truck } from "lucide-react";

const SupplierSignupSchema = Yup.object().shape({
  companyName: Yup.string().min(2, "Too short").required("Required"),
  email: Yup.string().email("Invalid email").required("Required"),
  phone: Yup.string().required("Required"),
  address: Yup.string().min(10, "Provide full address").required("Required"),
  password: Yup.string().min(8, "Min 8 chars").required("Required"),
  confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], "Passwords must match").required("Required"),
});

export default function SupplierSignup() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [serverMessage, setServerMessage] = useState("");

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerMessage("");
    try {
      const res = await fetch("/api/auth/supplier/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        setServerMessage("Account created! Please verify your email.");
        setTimeout(() => router.push(`/supplier-auth/verify?email=${encodeURIComponent(values.email)}`), 1500);
      } else {
        setServerMessage(data.message || "Registration failed.");
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
        <div className="absolute bottom-0 left-0 w-full h-full bg-gradient-to-t from-[#F97316]/5 to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-slate-200/40">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#F97316] rounded-2xl mx-auto flex items-center justify-center shadow-2xl mb-8">
              <Truck className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Supplier Signup</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Apply to join our network</p>
          </div>

          <div className="flex justify-between mb-8 px-2">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full mx-1 transition-all duration-500 ${step >= s ? "bg-[#F97316]" : "bg-slate-200"}`} />
            ))}
          </div>

          <Formik
            initialValues={{ companyName: "", email: "", phone: "", address: "", password: "", confirmPassword: "" }}
            validationSchema={SupplierSignupSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <AnimatePresence mode="wait">
                  {step === 1 ? (
                    <motion.div
                      key="s1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Company Name</label>
                        <Field name="companyName" placeholder="Company Name" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                        <Field name="email" type="email" placeholder="email@example.com" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Business Address</label>
                        <Field name="address" placeholder="123 Business Rd" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                      </div>
                      <button type="button" onClick={() => setStep(2)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">
                        Next Step
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="s2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                        <Field name="phone" placeholder="+1 (555) 000-0000" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Password</label>
                        <Field name="password" type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Confirm Password</label>
                        <Field name="confirmPassword" type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                      </div>
                      <div className="flex gap-4">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">
                          Back
                        </button>
                        <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-[#F97316] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-[#EA580C] transition-all shadow-xl shadow-[#F97316]/20">
                          {isSubmitting ? "Creating Account..." : "Sign Up"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {serverMessage && (
                  <div className="p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                    {serverMessage}
                  </div>
                )}
                <div className="text-center pt-2">
                  <Link href="/supplier-auth/login" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#F97316]">
                    Already have an account? <span className="text-[#F97316]">Sign In</span>
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
