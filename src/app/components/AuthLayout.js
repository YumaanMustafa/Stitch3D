"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";

/**
 * @file AuthLayout.js
 * @description Layout wrapper for Authentication pages.
 * Provides a split-screen design with a hero image on the left and form content on the right.
 */

export default function AuthLayout({ children, title, subtitle, heroTitle, heroSubtitle, heroImage }) {

    const bgImage = heroImage || "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?q=80&w=2952&auto=format&fit=crop";

    return (
        <div className="min-h-screen w-full flex bg-[#F8F9FA] text-[#0F172A]">

            {/* Link to Home - Absolute */}
            <div className="absolute top-6 left-6 z-20">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#F97316] transition-colors"
                >
                    <ArrowLeft size={18} />
                    Back to Home
                </Link>
            </div>

            {/* Left Panel - Visual (Desktop only) */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#1E293B] items-center justify-center">
                {/* Background Image with Overlay */}
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 mix-blend-overlay transition-all duration-1000"
                    style={{ backgroundImage: `url('${bgImage}')` }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] opacity-95"></div>

                {/* Subtle Pattern */}
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>

                <div className="relative z-10 p-12 text-white max-w-lg">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                    >
                        <h1 className="text-5xl font-bold mb-6 tracking-tight leading-tight">
                            {heroTitle || <>Craft Your <span className="text-gold-gradient">Signature Style</span></>}
                        </h1>
                        <p className="text-lg text-slate-300 leading-relaxed font-light">
                            {heroSubtitle || "Experience the art of bespoke leather jackets. Design, visualize, and wear your unique creation with Stitch."}
                        </p>
                    </motion.div>
                </div>

                {/* Decor Bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0F172A] to-transparent"></div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative overflow-hidden">
                {/* Subtle Background Watermark */}
                {/* Subtle Background Watermark Removed based on user feedback */}

                <div className="w-full max-w-md relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="mb-10 text-center lg:text-left">
                            <h2 className="text-3xl font-bold text-[#1E293B] mb-2 tracking-tight">{title}</h2>
                            {subtitle && <p className="text-slate-500">{subtitle}</p>}
                        </div>

                        {children}

                    </motion.div>
                </div>
            </div>
        </div>
    );
}
