"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShoppingCart,
    Zap,
    Package,
    Clock,
    Heart,
    Settings,
    HelpCircle,
    LogOut,
    Menu,
    X,
    Sun,
    Moon
} from "lucide-react";
import { useTheme } from "next-themes";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Footer from "@/app/components/AppFooter";
import { useCart } from "@/app/context/CartContext";
import { ToastProvider } from "@/app/context/ToastContext";

const getUserIdFromToken = () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.userId;
    } catch (e) {
        return null;
    }
};

export default function CustomerLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const { cartCount } = useCart(); // Use Global Cart Context
    const [profile, setProfile] = useState(null);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem("token");
            if (!token) {
                router.push('/customer-auth/login');
                return;
            }

            try {
                const res = await fetch("/api/auth/profile", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error("Failed to fetch profile");

                const data = await res.json();
                setProfile({
                    firstName: data.first_name || data.firstName || "User",
                    lastName: data.last_name || data.lastName || "",
                    email: data.email || "",
                });
            } catch (err) {
                console.error(err);
                localStorage.removeItem("token");
                router.push('/customer-auth/login');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();

        const token = localStorage.getItem("token");
        const checkUnread = async () => {
            try {
                if (!token) return;
                const res = await fetch("/api/chat/unread", { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.unread);
                }
            } catch { }
        };
        checkUnread();
        const interval = setInterval(checkUnread, 5000);
        return () => clearInterval(interval);
    }, [router]);

    // Handle outside click for profile menu
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        if (isProfileMenuOpen) document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [isProfileMenuOpen]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { theme, setTheme } = useTheme();

    const handleLogout = async () => {
        localStorage.removeItem("token");
        router.replace("/customer-auth/login");
    };

    if (loading) return null;

    const initials = profile?.firstName ? profile.firstName[0].toUpperCase() : "C";

    return (
        <ToastProvider>
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans text-[var(--text-primary)]">
                {/* Header */}
                <header className="sticky top-0 z-50 border-b border-slate-100 bg-[rgba(255,255,255,0.85)] backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-accent)] rounded-lg transition-colors"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                            <Link href="/" className="flex items-center gap-2 group">
                                <div className="relative w-9 h-9 flex items-center justify-center bg-[#1E293B] rounded-xl overflow-hidden shadow-lg group-hover:shadow-orange-500/20 transition-all">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#F97316] to-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                    <span className="relative z-10 text-white font-black text-lg italic tracking-tighter">S</span>
                                </div>
                                <div className="flex flex-col">
                                    <div className="text-lg font-black tracking-tighter flex items-center gap-0.5">
                                        <span className="text-[#1E293B]">Stitch</span>
                                    </div>
                                </div>
                            </Link>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Cart */}
                            <Link href="/customer/cart" className="relative p-2 rounded-full hover:bg-[var(--bg-accent)] transition-colors text-[var(--text-secondary)] hover:text-[var(--color-brand)]">
                                <ShoppingCart className="w-5 h-5" />
                                {cartCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 bg-[var(--color-brand)] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold shadow-sm">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>

                            {/* Profile Dropdown */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                    className="w-10 h-10 rounded-full border border-slate-200 bg-[var(--bg-secondary)] flex items-center justify-center text-sm font-bold text-[var(--color-brand)] shadow-sm hover:shadow-md transition-all"
                                >
                                    {initials}
                                </button>

                                <AnimatePresence>
                                    {isProfileMenuOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl border border-slate-200 bg-white overflow-hidden"
                                        >
                                            <div className="px-5 py-4 border-b border-slate-50">
                                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">{profile?.firstName} {profile?.lastName}</p>
                                                <p className="text-xs text-[var(--text-secondary)] truncate font-medium">{profile?.email}</p>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                <Link href="/customer/profile" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-accent)] rounded-xl transition-colors">
                                                    <Settings className="w-4 h-4" /> Profile Settings
                                                </Link>
                                                <Link href="/customer/support" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-accent)] rounded-xl transition-colors">
                                                    <HelpCircle className="w-4 h-4" /> Help & Support
                                                </Link>
                                            </div>
                                            <div className="border-t border-slate-50 p-2">
                                                <button onClick={() => setShowLogoutModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors">
                                                    <LogOut className="w-4 h-4" /> Sign Out
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-8 flex gap-8">
                    {/* Sidebar (Desktop) */}
                    <aside className="hidden lg:block w-72 shrink-0">
                        <div className="sticky top-28 space-y-6">
                            {/* Navigation Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
                                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-50">
                                    <div className="w-12 h-12 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center font-bold text-lg shadow-md">
                                        {initials}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-primary)] text-sm">{profile?.firstName}</h3>
                                        <p className="text-[10px] font-black text-[#F97316] uppercase tracking-widest mt-0.5">Designer</p>
                                    </div>
                                </div>

                                <nav className="space-y-1">
                                    <NavLink href="/customer/dashboard" icon={<Package className="w-5 h-5" />} label="Dashboard" />
                                    <NavLink href="/customer/orders" icon={<Clock className="w-5 h-5" />} label="My Orders" />
                                    <NavLink href="/customer/designs" icon={<Heart className="w-5 h-5" />} label="Saved Designs" />
                                    <NavLink href="/customer/messages" icon={<div className="relative">{unreadCount > 0 && <span className="absolute -top-1 -right-2 w-4 h-4 flex justify-center items-center text-[10px] text-white font-bold bg-rose-500 rounded-full">{unreadCount}</span>}<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></div>} label="Messages" />
                                </nav>
                            </div>

                            {/* CTA */}
                            {pathname === '/customer/dashboard' && (
                                <div className="relative overflow-hidden rounded-2xl p-6 text-slate-900 shadow-sm border border-orange-200 mt-2">
                                    <div className="absolute inset-0 bg-orange-50"></div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200 opacity-20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                    <div className="relative z-10 text-center">
                                        <Zap className="w-8 h-8 mx-auto mb-3 text-orange-500" />
                                        <h4 className="font-bold mb-2">Create New Design</h4>
                                        <p className="text-xs text-slate-500 mb-5 leading-relaxed">Unleash your creativity and build a custom jacket.</p>
                                        <button onClick={() => router.push('/customer/customize')} className="w-full py-2.5 bg-[#F97316] text-white rounded-lg font-bold text-xs hover:bg-[#e66000] transition-colors shadow-sm">
                                            Start Studio
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Mobile Menu Overlay */}
                    <AnimatePresence>
                        {isMobileMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -300 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -300 }}
                                className="fixed inset-0 z-50 lg:hidden flex"
                            >
                                <div className="w-72 bg-white h-full shadow-2xl p-6 flex flex-col relative z-50">
                                    <div className="flex justify-between items-center mb-10">
                                        <Link href="/" className="flex items-center gap-2 group">
                                            <div className="relative w-8 h-8 flex items-center justify-center bg-[#1E293B] rounded-xl overflow-hidden">
                                                <span className="text-white font-black text-sm italic tracking-tighter">S</span>
                                            </div>
                                            <div className="text-lg font-black tracking-tighter">
                                                <span className="text-[#1E293B]">Stitch</span>
                                            </div>
                                        </Link>
                                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors"><X size={20} className="text-slate-500" /></button>
                                    </div>
                                    <nav className="space-y-2 flex-1">
                                        <NavLink href="/customer/dashboard" icon={<Package className="w-5 h-5" />} label="Dashboard" onClick={() => setIsMobileMenuOpen(false)} />
                                        <NavLink href="/customer/orders" icon={<Clock className="w-5 h-5" />} label="My Orders" onClick={() => setIsMobileMenuOpen(false)} />
                                        <NavLink href="/customer/designs" icon={<Heart className="w-5 h-5" />} label="Saved Designs" onClick={() => setIsMobileMenuOpen(false)} />
                                        <NavLink href="/customer/messages" icon={<div className="w-5 h-5" />} label="Messages" onClick={() => setIsMobileMenuOpen(false)} />
                                        <div className="pt-6 mt-6 border-t border-slate-100">
                                            <NavLink href="/customer/customize" icon={<Zap className="w-5 h-5 text-[var(--color-brand)]" />} label="Start Designing" onClick={() => setIsMobileMenuOpen(false)} />
                                        </div>
                                    </nav>
                                </div>
                                <div className="flex-1 bg-[var(--color-brand)]/20 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Page Content */}
                    <main className="flex-1 min-w-0">
                        {children}
                    </main>
                </div>

                <Footer />
                <ConfirmationModal
                    isOpen={showLogoutModal}
                    onClose={() => setShowLogoutModal(false)}
                    onConfirm={handleLogout}
                    title="Confirm Sign Out"
                    message="Are you sure you want to sign out?"
                    confirmText="Sign Out"
                    cancelText="Cancel"
                    isDestructive={true}
                />
            </div>
        </ToastProvider>
    );
}

function NavLink({ href, icon, label, onClick }) {
    const pathname = usePathname();
    const isActive = pathname === href || pathname?.startsWith(href + '/');

    return (
        <Link
            href={href}
            onClick={onClick}
            className={`group flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all ${isActive
                ? "bg-orange-50 text-[#F97316] font-bold"
                : "font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-accent)] hover:text-[var(--color-brand)]"
                }`}
        >
            <span className={`transition-colors [&>svg]:transition-colors ${isActive ? "text-orange-700 [&>svg]:stroke-orange-700" : "text-[var(--text-muted)] [&>svg]:stroke-[var(--text-muted)] group-hover:text-[var(--color-brand)] group-hover:[&>svg]:stroke-[var(--color-brand)]"}`}>{icon}</span>
            {label}
        </Link>
    );
}
