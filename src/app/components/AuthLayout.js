"use client";
// Import Link from Next.js for navigation links between pages
import Link from "next/link";
// Import motion for smooth animation effects on the form panel
import { motion } from "framer-motion";
// Import icons used in the layout
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

/**
 * File: AuthLayout.js
 * Description: Layout wrapper used by all customer authentication pages (login, signup, forgot password).
 * Creates a split-screen design with a decorative hero image on the left side
 * and the actual form content on the right side.
 */

// AuthLayout wraps authentication form pages with a consistent visual structure
// Props:
// children: the form content (login form, signup form, etc.) to display on the right
// title: main heading shown above the form
// subtitle: smaller description text shown below the title
// heroTitle: big headline shown on the left image panel
// heroSubtitle: description text shown below the headline on the left panel
// heroImage: URL of the background image shown on the left panel
export default function AuthLayout({ children, title, subtitle, heroTitle, heroSubtitle, heroImage }) {

    // Use the provided hero image, or fall back to a default Unsplash photo
    const bgImage = heroImage || "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=2952&auto=format&fit=crop";

    return (
        // Full-screen container split into two side-by-side panels
        <div className="min-h-screen w-full flex bg-[#F8F9FA] text-[#0F172A]">

            {/* Left Panel - decorative visual shown only on large screens (desktop) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#1E293B] items-center justify-center">
                {/* Background hero image shown at low opacity for a subtle effect */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay transition-all duration-1000"
                    style={{ backgroundImage: `url('${bgImage}')` }}
                ></div>
                {/* Dark gradient overlay to give the panel a premium dark look */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] opacity-95"></div>

                {/* Subtle dot grid pattern layered on top for texture */}
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

                {/* Hero text content: headline and description */}
                <div className="relative z-10 p-12 text-white max-w-lg">
                    {/* Animate in with a slight fade and slide from below */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                    >
                        {/* Large heading shown on the left panel */}
                        <h1 className="text-5xl font-bold mb-6 tracking-tight leading-tight">
                            {heroTitle || <>Craft Your <span className="text-gold-gradient">Signature Style</span></>}
                        </h1>
                        {/* Supporting subtitle text */}
                        <p className="text-lg text-slate-300 leading-relaxed font-light">
                            {heroSubtitle || "Experience the art of bespoke leather jackets. Design, visualize, and wear your unique creation with Stitch."}
                        </p>
                    </motion.div>
                </div>

                {/* Gradient fade at the bottom of the left panel for a polished look */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0F172A] to-transparent"></div>
            </div>

            {/* Right Panel - contains the actual form (login, signup, etc.) */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
                {/* Centered form container with max width */}
                <div className="w-full max-w-md relative z-10">
                    {/* Animate in the form panel when the page loads */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Page title and subtitle shown above the form */}
                        <div className="mb-10 text-center lg:text-left">
                            <h2 className="text-3xl font-bold text-[#1E293B] mb-2 tracking-tight">{title}</h2>
                            {/* Only show subtitle if it was provided */}
                            {subtitle && <p className="text-slate-500">{subtitle}</p>}
                        </div>

                        {/* Render whatever form page (login/signup/etc.) was passed in as children */}
                        {children}

                    </motion.div>
                </div>
            </div>
        </div>
    );
}
