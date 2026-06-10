"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { motion } from "framer-motion";
import { Package, Eye, EyeOff } from "lucide-react";

const SupplierLoginSchema = Yup.object().shape({
  email: Yup.string().email("Invalid email").required("Required"),
  password: Yup.string().required("Required"),
});

export default function SupplierLogin() {
  const router = useRouter();
  const [serverMessage, setServerMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (values, { setSubmitting }) => {
    setServerMessage("");
    try {
      const res = await fetch("/api/auth/supplier/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("supplierToken", data.token);
        setIsSuccess(true);
        setServerMessage("Login successful! Redirecting...");
        setTimeout(() => router.push("/supplier/dashboard"), 1000);
      } else {
        setServerMessage(data.message || "Invalid email or password");
        setIsSuccess(false);
      }
    } catch (err) {
      setServerMessage("Connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-[#F97316] selection:text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#F97316]/5 blur-[150px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 md:p-14 shadow-2xl shadow-slate-200/50">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center shadow-sm mb-8 border border-slate-200">
              <Package className="text-[#F97316]" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">Supplier Login</h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Secure portal access</p>
          </div>

          <Formik
            initialValues={{ email: "", password: "" }}
            validationSchema={SupplierLoginSchema}
            onSubmit={handleLogin}
          >
            {({ isSubmitting, touched, errors }) => (
              <Form className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                  <Field name="email" type="email" placeholder="email@example.com" autoCapitalize="none" autoCorrect="off" className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-[11px] font-black text-slate-900 tracking-widest outline-none transition-all ${touched.email && errors.email ? 'border-rose-500/50' : 'border-slate-100 focus:border-[#F97316] focus:bg-white'}`} />
                  <ErrorMessage name="email" component="div" className="text-[8px] text-rose-500 font-black uppercase px-1" />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Password</label>
                  <div className="relative">
                    <Field name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" autoCapitalize="none" autoCorrect="off" className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl text-[11px] font-black text-slate-900 tracking-widest outline-none transition-all ${touched.password && errors.password ? 'border-rose-500/50' : 'border-slate-100 focus:border-[#F97316] focus:bg-white'}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="text-right px-1">
                    <Link href="/supplier-auth/forgot-password" title="Forgot Password" className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#F97316]">
                      Forgot Password?
                    </Link>
                  </div>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-[#F97316] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-[#EA580C] transition-all shadow-xl shadow-[#F97316]/20 disabled:opacity-50">
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </button>

                {serverMessage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${isSuccess ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"}`}>
                    {serverMessage}
                  </motion.div>
                )}

                <div className="text-center pt-4">
                  <Link href="/supplier-auth/signup" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#F97316]">
                    New supplier? <span className="text-[#F97316]">Create an account</span>
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
