"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "../context/CartContext";
import {
  ShoppingCart,
  Sun,
  Moon,
  Bell,
  User,
  LogOut,
  Settings,
  Menu,
  X,
  Home,
  Shirt,
  Heart,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import UserAvatarMenu from "./AppUserAvatar";
import NotificationBell from "./NotificationBell";

/**
 * @file Header.js
 * @description Main Navigation Header.
 * Adapts to user role (Customer, Vendor, Admin) and handles mobile menu, profile dropdown, and cart count.
 * Fetches user profile on mount to display name/avatar.
 */

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  // State management
  const { cartCount } = useCart(); // Use Global Cart State
  const [notificationCount, setNotificationCount] = useState(3);
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [userRole, setUserRole] = useState("customer");
  const [loading, setLoading] = useState(true);

  // Refs
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Navigation links by user role
  const navLinks = {
    customer: [
      { name: "Dashboard", href: "/customer/dashboard", icon: Home },
      { name: "Customize", href: "/customer/customize", icon: Shirt },
      { name: "Shop", href: "/customer/shop", icon: ShoppingCart },
      { name: "Saved Designs", href: "/customer/designs", icon: Heart },
      { name: "Messages", href: "/customer/messages", icon: MessageSquare },
    ],
    vendor: [
      { name: "Dashboard", href: "/vendor/dashboard", icon: Home },
      { name: "Products", href: "/vendor/products", icon: Shirt },
      { name: "Orders", href: "/vendor/orders", icon: ShoppingCart },
      { name: "Settings", href: "/vendor/settings", icon: Settings },
      // { name: "Analytics", href: "/vendor/analytics", icon: Heart }, // Coming Soon
      // { name: "Messages", href: "/vendor/messages", icon: MessageSquare }, // Coming Soon
    ],
    supplier: [
      { name: "Dashboard", href: "#", icon: Home }, // Coming Soon
      { name: "Materials", href: "#", icon: Shirt },
      { name: "Requests", href: "#", icon: ShoppingCart },
      { name: "Orders", href: "#", icon: Heart },
    ],
    admin: [
      { name: "Dashboard", href: "/admin/dashboard", icon: Home },
      { name: "Users", href: "/admin/users", icon: User },
      { name: "Vendors", href: "/admin/vendors", icon: Shirt },
      { name: "Reports", href: "#", icon: Heart }, // Coming Soon
    ],
  };

  // Load profile on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : "customer";
    setUserRole(role || "customer");
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch user profile
  const fetchProfile = async (token) => {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          firstName: data.first_name || data.firstName || "",
          lastName: data.last_name || data.lastName || "",
          email: data.email || "",
          profileImage: data.profile_image || null,
        });
      } else {
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    } finally {
      setLoading(false);
    }
  };
  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.warn("Logout network error:", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      setProfile(null);
      router.replace("/customer-auth/login");
    }
  };

  // Check if route is active
  const isActive = (href) => pathname === href;

  // Get user initials
  const initials = profile?.firstName?.[0]?.toUpperCase() || "N";

  // Get current nav links based on role
  const currentNavLinks = navLinks[userRole] || navLinks.customer;

  if (loading) {
    return (
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-4"
          >
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative w-10 h-10 flex items-center justify-center bg-[#1E293B] rounded-xl overflow-hidden shadow-lg group-hover:shadow-orange-500/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F97316] to-[#D4AF37] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 text-white font-black text-xl italic tracking-tighter">S</span>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-white/20 backdrop-blur-sm rounded-tl-lg" />
              </div>
              <div className="flex flex-col">
                <div className="text-xl font-black tracking-tighter flex items-center gap-0.5">
                  <span className="text-[#1E293B]">Stitch</span>
                </div>
                <div className="h-0.5 w-0 bg-[#F97316] group-hover:w-full transition-all duration-500" />
              </div>
            </Link>

            {profile && (
              <div className="hidden sm:block h-8 w-px bg-slate-200 mx-2" />
            )}

            {profile && (
              <Link 
                href={`/${userRole}/dashboard`}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-[#F97316] rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-transparent hover:border-orange-100 shadow-sm"
              >
                <Home size={14} />
                Dashboard
              </Link>
            )}
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {currentNavLinks.map(({ name, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${isActive(href)
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-gray-700 hover:bg-gray-50"
                  }`}
              >
                <Icon size={16} />
                {name}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search (Desktop only) */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-sm text-gray-600 placeholder-gray-500 outline-none w-32"
              />
            </div>

            {/* Notifications */}
            <NotificationBell 
                role={userRole} 
                tokenKey={userRole === 'customer' ? 'token' : userRole === 'vendor' ? 'vendorToken' : userRole === 'admin' ? 'adminToken' : 'supplierToken'} 
            />

            {/* Shopping Cart (Customer only) */}
            {userRole === "customer" && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href="/customer/cart"
                  className="relative p-2 rounded-xl hover:bg-gray-100 transition inline-block"
                >
                  <ShoppingCart size={20} className="text-gray-600" />
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </Link>
              </motion.div>
            )}

            {/* Theme Toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setDarkMode(!isDarkMode)}
              className="p-2 rounded-xl hover:bg-gray-100 transition hidden sm:block"
              aria-label="Toggle theme"
            >
              {isDarkMode ? (
                <Sun size={20} className="text-gray-600" />
              ) : (
                <Moon size={20} className="text-gray-600" />
              )}
            </motion.button>

            {/* Profile Menu (Desktop) */}
            <div className="hidden sm:block">
              <UserAvatarMenu
                initials={initials}
                profileImage={profile?.profileImage}
                isOpen={isProfileMenuOpen}
                onToggle={() => setProfileMenuOpen(!isProfileMenuOpen)}
                onLogout={handleLogout}
              />
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              ref={mobileMenuRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden mt-4 space-y-2 border-t border-gray-100 pt-4"
            >
              {currentNavLinks.map(({ name, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${isActive(href)
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-gray-700 hover:bg-gray-50"
                    }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={18} />
                  {name}
                </Link>
              ))}

              {/* Mobile Profile Section */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <Link
                  href={`/${userRole}/profile`}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={18} />
                  Profile
                </Link>
                <Link
                  href={`/${userRole}/settings`}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings size={18} />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}