"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

const VendorSignupSchema = Yup.object().shape({
    businessName: Yup.string().min(2, "Too short").required("Required"),
    email: Yup.string().email("Invalid email").required("Required"),
    phone: Yup.string().matches(/^\+?[0-9\s-]{10,}$/, "Invalid format").required("Required"),
    password: Yup.string().min(8, "Min 8 chars").matches(/[a-zA-Z]/, "Need letter").matches(/[0-9]/, "Need number").required("Required"),
    confirmPassword: Yup.string().oneOf([Yup.ref('password'), null], "Passwords must match").required("Required"),
});

export default function VendorSignup() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (values, { setSubmitting }) => {
    setServerMessage("");
    try {
      const res = await fetch("/api/auth/vendor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        setIsSuccess(true);
        setServerMessage(data.message || "Account created! Verifying email...");
        setTimeout(() => {
          router.push(`/vendor-auth/verify?email=${encodeURIComponent(values.email)}`);
        }, 1500);
      } else {
        setServerMessage(data.message || "Registration failed.");
        setIsSuccess(false);
      }
    } catch (err) {
      setServerMessage("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#F97316] selection:text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#F97316]/5 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-slate-200/40">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 bg-[#F97316] rounded-2xl mx-auto flex items-center justify-center shadow-[0_10px_30px_rgba(249,115,22,0.2)] mb-8 transform rotate-3">
               <Building2 className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic mb-3">Register</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Become a partner</p>
          </div>

          <Formik
            initialValues={{ businessName: "", email: "", phone: "", password: "", confirmPassword: "" }}
            validationSchema={VendorSignupSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Business Name</label>
                     <Field name="businessName" placeholder="Business Name" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                     <ErrorMessage name="businessName" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                     <Field name="phone" placeholder="+1 (555) 000-0000" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                     <ErrorMessage name="phone" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                  <Field name="email" type="email" placeholder="email@example.com" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                  <ErrorMessage name="email" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Password</label>
                     <Field name="password" type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                     <ErrorMessage name="password" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Confirm Password</label>
                     <Field name="confirmPassword" type="password" placeholder="••••••••" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-widest outline-none transition-all" />
                     <ErrorMessage name="confirmPassword" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                   </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#F97316] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#EA580C] transition-all shadow-xl shadow-[#F97316]/20"
                >
                  {isSubmitting ? "Creating Account..." : "Sign Up"}
                </button>

                {serverMessage && (
                  <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                    {serverMessage}
                  </div>
                )}

                <div className="text-center pt-4">
                  <Link href="/vendor-auth/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#F97316]">
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
