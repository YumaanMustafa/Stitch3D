"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from "yup";
import { AlertCircle, Lock, RefreshCw } from "lucide-react";
import B2BAuthLayout from "../../components/B2BAuthLayout";

/**
 * @file page.js
 * @description Vendor Reset Password - Simplified Text.
 */

const ResetSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email").required("Required"),
    code: Yup.string().matches(/^[0-9]{6}$/, "Must be 6 digits").required("Required"),
    newPassword: Yup.string().min(8, "Min 8 chars").required("Required"),
    confirmPassword: Yup.string().oneOf([Yup.ref('newPassword'), null], "Doesn't match").required("Required"),
});

function VendorResetPasswordContent() {
    const router = useRouter();
    const params = useSearchParams();
    const emailFromQuery = params?.get("email") ?? "";

    const [serverMessage, setServerMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [resending, setResending] = useState(false);

    const handleReset = async (values, { setSubmitting }) => {
        setServerMessage("");
        setIsSuccess(false);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email, code: values.code, newPassword: values.newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setIsSuccess(true);
                setServerMessage("Password updated! Redirecting...");
                setTimeout(() => router.push("/vendor-auth/login"), 2000);
            } else {
                setServerMessage(data.message || "Failed.");
            }
        } catch (err) {
            setServerMessage("Error. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <B2BAuthLayout
            title="RESET"
            subtitle="Security Update"
            heroTitle={<>RECOVER <br/> YOUR <br/> <span className="text-[#F97316]">ACCESS</span></>}
            heroSubtitle="Choose a new secure password to regain access to your vendor dashboard."
        >
            <Formik
                initialValues={{ email: emailFromQuery, code: "", newPassword: "", confirmPassword: "" }}
                validationSchema={ResetSchema}
                onSubmit={handleReset}
                enableReinitialize
            >
                {({ isSubmitting, values }) => (
                    <Form className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Email Address</label>
                            <Field name="email" type="email" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                            <ErrorMessage name="email" component="div" className="text-rose-500 text-[8px] font-black uppercase px-1" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Reset Code</label>
                            <Field name="code" maxLength={6} placeholder="000000" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black uppercase tracking-[0.5em] outline-none transition-all text-center" />
                            <ErrorMessage name="code" component="div" className="text-rose-500 text-[8px] font-black uppercase px-1" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">New Password</label>
                                <Field name="newPassword" type="password" placeholder="••••••••" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Confirm</label>
                                <Field name="confirmPassword" type="password" placeholder="••••••••" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-[#F97316] transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? "Updating..." : "Update Password"}
                        </button>

                        {serverMessage && (
                            <div className={`p-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-center border ${isSuccess ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                                {serverMessage}
                            </div>
                        )}

                        <div className="text-center pt-2">
                           <Link href="/vendor-auth/login" className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-[#F97316]">
                              ← Back to Login
                           </Link>
                        </div>
                    </Form>
                )}
            </Formik>
        </B2BAuthLayout>
    );
}

export default function VendorResetPassword() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>}>
            <VendorResetPasswordContent />
        </Suspense>
    );
}
