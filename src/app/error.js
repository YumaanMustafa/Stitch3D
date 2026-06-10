"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Application Error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
            <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 text-center shadow-2xl border border-slate-200 animate-fade-in">
                <div className="w-20 h-20 bg-rose-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <AlertTriangle className="text-rose-500 w-10 h-10" />
                </div>
                
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                    Oops! Something broke.
                </h1>
                
                <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                    We've encountered an unexpected error. Don't worry, our team has been notified. 
                    Please try refreshing or head back to the homepage.
                </p>

                <div className="space-y-4">
                    <button
                        onClick={() => reset()}
                        className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-200 hover:bg-[#F97316] transition-all flex items-center justify-center gap-3 active:scale-95"
                    >
                        <RefreshCw size={18} />
                        Try Again
                    </button>
                    
                    <Link href="/" className="block w-full py-4 bg-white border-2 border-slate-100 text-slate-500 font-black uppercase tracking-widest rounded-2xl hover:border-slate-300 hover:text-slate-900 transition-all active:scale-95">
                        Return Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
