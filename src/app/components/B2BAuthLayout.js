"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck } from "lucide-react";

/**
 * @file B2BAuthLayout.js
 * @description Specialized layout for B2B (Vendor/Supplier) authentication.
 * Light theme, industrial aesthetic, high contrast.
 */

export default function B2BAuthLayout({ children, title, subtitle, heroTitle, heroSubtitle, heroImage }) {
  return (
    <div className="min-h-screen w-full flex bg-slate-50 text-slate-900 font-sans selection:bg-[#F97316] selection:text-white">
      {/* Absolute Home Link */}
      <div className="absolute top-8 left-8 z-50">
        <Link href="/" className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#F97316] transition-all group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Site
        </Link>
      </div>

      {/* Left Panel - Hero (Desktop only) */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden bg-slate-900 items-center justify-center">
        {/* Background Decor */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #F97316 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#F97316]/10 blur-[150px] rounded-full" />
        
        {/* Content */}
        <div className="relative z-10 p-20 max-w-xl">
           <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="w-20 h-20 bg-[#F97316] rounded-3xl mb-12 flex items-center justify-center shadow-2xl shadow-[#F97316]/20 transform -rotate-3">
                 <ShieldCheck className="text-white" size={40} />
              </div>
              <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.9] mb-8">
                 {heroTitle || <>Scale Your <br/> <span className="text-[#F97316]">Production</span></>}
              </h1>
              <p className="text-lg font-medium text-slate-400 leading-relaxed uppercase tracking-wider text-sm">
                 {heroSubtitle || "Join the global network of professional garment producers and raw material suppliers."}
              </p>
           </motion.div>
        </div>

        {/* Brand Footer */}
        <div className="absolute bottom-12 left-20">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Stitch Industrial Network</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-20 relative">
        <div className="w-full max-w-md">
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-12">
                 <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">{subtitle || "Identity Validation"}</h2>
                 <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{title || "Verify"}</h3>
              </div>
              
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl shadow-slate-200/50">
                 {children}
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
}
