import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { User, Shield, Bell, CreditCard, Trash2, LogOut, Lock, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AccountLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab");
    const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);

    const sidebarItems = [
        {
            label: "Profile Information",
            icon: User,
            isActive: pathname === "/customer/profile",
            onClick: () => router.push("/customer/profile")
        },
        {
            label: "Security",
            icon: Shield,
            isActive: pathname === "/customer/settings" && (currentTab === "security" || !currentTab), // Default settings tab
            onClick: () => router.push("/customer/settings?tab=security")
        },
        {
            label: "Notifications",
            icon: Bell,
            isActive: pathname === "/customer/settings" && currentTab === "notifications",
            onClick: () => router.push("/customer/settings?tab=notifications")
        },
        {
            label: "Payment Methods",
            icon: CreditCard,
            isActive: pathname === "/customer/settings" && currentTab === "payment",
            onClick: () => router.push("/customer/settings?tab=payment")
        },
        {
            label: "Account Management",
            icon: Trash2,
            isActive: pathname === "/customer/settings" && currentTab === "account",
            onClick: () => router.push("/customer/settings?tab=account")
        }
    ];

    return (
        <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-[#1E293B] mb-2 tracking-tight">Account Settings</h1>
                <p className="text-slate-500 font-medium">Manage your personal information, security, and preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Shared Sidebar */}
                <aside className="lg:col-span-3">
                    <nav className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 space-y-1 sticky top-28">
                        {sidebarItems.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={item.onClick}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${item.isActive
                                    ? "bg-orange-50 text-[#F97316] shadow-sm ring-1 ring-orange-500/10"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-[#1E293B]"
                                    } ${item.isLocked ? "opacity-70" : ""}`}
                            >
                                <item.icon className={`w-5 h-5 ${item.isActive ? "text-[#F97316]" : "text-slate-400"}`} />
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.isLocked && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Page Content */}
                <div className="lg:col-span-9 space-y-6">
                    {children}
                </div>
            </div>

            <AnimatePresence>
                {isLockedModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl relative border border-slate-100"
                        >
                            <button
                                onClick={() => setIsLockedModalOpen(false)}
                                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
                                <Lock size={32} />
                            </div>
                            <h3 className="text-2xl font-black text-[#1E293B] mb-2 tracking-tight">Feature Locked</h3>
                            <p className="text-slate-500 mb-8 font-medium">Implementation in FYP 2</p>
                            <button
                                onClick={() => setIsLockedModalOpen(false)}
                                className="w-full py-4 px-6 rounded-2xl font-bold bg-[#1E293B] text-white hover:bg-black transition-all shadow-lg hover:shadow-[#1E293B]/20"
                            >
                                Got it
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
