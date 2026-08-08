"use client";
// Import React core library
import React from "react";
// Import Link for navigation between pages
import Link from "next/link";
// Import motion for entrance animations
import { motion } from "framer-motion";
// Import icons used on the left panel and navigation
import { ArrowLeft, ShieldCheck } from "lucide-react";

/**
 * File: B2BAuthLayout.js
 * Description: Layout used by Vendor and Supplier authentication pages.
 * PRIVILEGE CONTEXT: This layout is specifically for Business-to-Business (B2B) 
 * users (Vendors & Suppliers) who have elevated privileges compared to standard customers.
 * It uses a bold industrial aesthetic to differentiate the professional portal.
 */

// B2BAuthLayout wraps authentication pages for business users (vendors and suppliers)
// Props:
// children: the form content to display on the right side
// title: main heading above the form
// subtitle: small label shown above the title
// heroTitle: large heading text displayed on the dark left panel
// heroSubtitle: description shown below the hero heading on the left panel
// heroImage: optional background image URL (not used in current design)
export default function B2BAuthLayout({ children, title, subtitle, heroTitle, heroSubtitle, heroImage }) {
  return (
    // Full-screen layout split into left and right panels
    <div className="min-h-screen w-full flex bg-slate-50 text-slate-900 font-sans selection:bg-[#F97316] selection:text-white">

      {/* Left Panel - hero area shown only on desktop screens */}
      <div className="hidden lg:flex w-[45%] relative overflow-hidden bg-slate-900 items-center justify-center">
        {/* Decorative orange dot grid pattern overlaid on the dark background */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #F97316 1px, transparent 0)', backgroundSize: '30px 30px' }}></div>
        {/* Soft orange glow in the top left corner for visual depth */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-[#F97316]/10 blur-[150px] rounded-full" />
        
        {/* Left panel hero content (icon, headline, and description) */}
        <div className="relative z-10 p-20 max-w-xl">
           {/* Animate content up from below when the page loads */}
           <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              {/* Orange brand icon box */}
              <div className="w-20 h-20 bg-[#F97316] rounded-3xl mb-12 flex items-center justify-center shadow-2xl shadow-[#F97316]/20 transform -rotate-3">
                 <ShieldCheck className="text-white" size={40} />
              </div>
              {/* Large headline on the left panel */}
              <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.9] mb-8">
                 {heroTitle || <>Scale Your <br/> <span className="text-[#F97316]">Production</span></>}
              </h1>
              {/* Supporting description text */}
              <p className="text-lg font-medium text-slate-400 leading-relaxed uppercase tracking-wider text-sm">
                 {heroSubtitle || "Join the global network of professional garment producers and raw material suppliers."}
              </p>
           </motion.div>
        </div>

        {/* Brand footer label at the bottom of the left panel */}
        <div className="absolute bottom-12 left-20">
           <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Stitch Industrial Network</p>
        </div>
      </div>

      {/* Right Panel - contains the actual form (login, signup, etc.) */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-20 relative">
        <div className="w-full max-w-md">
           {/* Animate the form in when the page loads */}
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {/* Title and subtitle shown above the white form card */}
              <div className="mb-12">
                 {/* Small orange label above the main title */}
                 <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">{subtitle || "Identity Validation"}</h2>
                 {/* Main page title */}
                 <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">{title || "Verify"}</h3>
              </div>
              
              {/* White rounded card that wraps the form content */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl shadow-slate-200/50">
                 {/* Render the actual form passed in as children */}
                 {children}
              </div>
           </motion.div>
        </div>
      </div>
    </div>
  );
}
