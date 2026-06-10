"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from "yup";
import { CheckCircle2, RefreshCw, MailOpen } from "lucide-react";
import B2BAuthLayout from "../../components/B2BAuthLayout";

/**
 * @file page.js
 * @description Vendor Email Verification - Simplified Text.
 */

function VendorVerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email");
    const [serverMessage, setServerMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (!email) {
            setServerMessage("No email provided. Please sign up first.");
        }
    }, [email]);

    const handleVerify = async (values, { setSubmitting }) => {
        setServerMessage("");
        setIsSuccess(false);

        try {
            const res = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: values.code }),
            });
            const data = await res.json();

            if (res.ok) {
                setIsSuccess(true);
                setServerMessage(data.message || "Email verified! Our team will review your account.");
            } else {
                setServerMessage(data.message || "Code is incorrect.");
                setIsSuccess(false);
            }
        } catch (err) {
            setServerMessage("Error. Try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;
        setResending(true);
        setServerMessage("Sending code...");
        try {
            const res = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (res.ok) setServerMessage("New code sent!");
            else setServerMessage("Failed to resend.");
        } catch (err) {
            setServerMessage("Failed to resend code");
        } finally {
            setResending(false);
        }
    };

    if (isSuccess) {
        return (
            <B2BAuthLayout
                title="SUBMITTED"
                subtitle="Verification Successful"
                heroTitle={<>REGISTRATION <br/> <span className="text-[#F97316]">PENDING</span></>}
                heroSubtitle="Your account is now being reviewed by our team. You'll get an email once approved."
            >
                <div className="text-center py-4">
                    <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-100">
                        <CheckCircle2 size={40} className="text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic mb-4">Request Sent</h3>
                    <p className="text-slate-500 mb-10 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                        We have received your application. Please wait 24-48 hours for account approval.
                    </p>
                    <Link
                        href="/vendor-auth/login"
                        className="inline-block w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-[#F97316] transition-all shadow-xl shadow-slate-200"
                    >
                        Back to Login
                    </Link>
                </div>
            </B2BAuthLayout>
        );
    }

    return (
        <B2BAuthLayout
            title="VERIFY"
            subtitle="Check Your Email"
            heroTitle={<>ACTIVATE <br/> YOUR <br/> <span className="text-[#F97316]">ACCOUNT</span></>}
            heroSubtitle="Please enter the 6-digit code we sent to your email to confirm your identity."
        >
            <div className="mb-10 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl mx-auto mb-4 flex items-center justify-center text-[#F97316]">
                   <MailOpen size={24} />
                </div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                    Code sent to: <br/>
                    <span className="text-slate-900">{email}</span>
                </p>
            </div>

            <Formik
                initialValues={{ code: "" }}
                validationSchema={Yup.object({
                    code: Yup.string().matches(/^[0-9]{6}$/, "Must be 6 digits").required("Required"),
                })}
                onSubmit={handleVerify}
            >
                {({ isSubmitting }) => (
                    <Form className="space-y-6">
                        <div>
                            <Field
                                name="code"
                                maxLength={6}
                                placeholder="000000"
                                className="w-full py-4 text-center text-3xl font-black tracking-[0.5em] bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-slate-900 outline-none transition-all"
                            />
                            <ErrorMessage name="code" component="div" className="text-rose-500 text-[8px] mt-2 font-black uppercase tracking-widest text-center" />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !email}
                            className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-[#F97316] transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? "Verifying..." : "Verify Email"}
                        </button>

                        {serverMessage && (
                            <div className={`p-4 rounded-xl text-[9px] font-black uppercase tracking-widest text-center border ${isSuccess ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}>
                                {serverMessage}
                            </div>
                        )}

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resending}
                                className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#F97316] transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={resending ? "animate-spin" : ""} /> {resending ? "Sending..." : "Resend Code"}
                            </button>
                        </div>
                    </Form>
                )}
            </Formik>
        </B2BAuthLayout>
    );
}

export default function VendorVerifyEmail() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>}>
            <VendorVerifyEmailContent />
        </Suspense>
    );
}
