"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart2,
  Users,
  Store,
  Eye,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Shield,
  FileText,
  Factory,
  Lock,
  X
} from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import { motion, AnimatePresence } from "framer-motion";
import NotificationBell from "@/app/components/NotificationBell";

/**
 * @file layout.js
 * @description Admin Layout - Professional Dashboard Interface.
 * This file acts as the main wrapper for all admin pages. It provides the sidebar menu 
 * and the top navigation bar across all admin screens.
 */

export default function AdminLayout({ children }) {
  // State to manage whether the sidebar is collapsed (thin) or expanded (wide)
  const [collapsed, setCollapsed] = useState(false);
  // State to store the currently logged-in admin's profile data
  const [admin, setAdmin] = useState(null);
  // State to track if we are still verifying the admin's login status
  const [loadingComponent, setLoadingComponent] = useState(true);
  // State to control whether the logout confirmation popup is visible
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // State to control a popup explaining that certain features (like Suppliers) are locked for now
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);
  
  // Tool to get the current page URL path so we can highlight the active menu item
  const pathname = usePathname();
  // Tool to navigate the user to different pages programmatically
  const router = useRouter();

  // The list of links that appear in the admin sidebar menu
  const menuItems = [
    { name: "Dashboard", icon: <BarChart2 size={20} />, path: "/admin/dashboard" },
    { name: "Users", icon: <Users size={20} />, path: "/admin/users" },
    { name: "Vendors", icon: <Store size={20} />, path: "/admin/vendors" },
    {
      name: "Suppliers",
      icon: <Factory size={20} />,
      path: "/admin/suppliers",
      isLocked: false // Indicates if this feature is currently disabled
    },
    { name: "Complaints", icon: <FileText size={20} />, path: "/admin/complaints" },
    { name: "Settings", icon: <Settings size={20} />, path: "/admin/settings" },
  ];

  // 🔹 Fetch admin info when logged in
  useEffect(() => {
    // Function to check if the admin is logged in and fetch their details
    const fetchProfile = async () => {
      // Check if the admin token exists in the browser's storage
      const token = localStorage.getItem("adminToken");
      if (!token) {
        console.warn("No admin token found, redirecting to login.");
        // If no token, redirect to the login page immediately
        router.push("/admin-login");
        setLoadingComponent(false); // Stop the loading spinner
        return;
      }

      try {
        // Ask the server for the admin's profile data using the token
        const res = await fetch("/api/admin/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        // If the server says the token is invalid (401 or 403), throw an error
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Unauthorized");
          }
          throw new Error(`Request failed with status ${res.status}`);
        }

        // Convert the server response into a JavaScript object
        const data = await res.json();
        if (data && data.email) {
          // If valid data is returned, save it to the state
          setAdmin(data);
        } else {
          throw new Error("Invalid profile data received");
        }
      } catch (err) {
        console.error("Admin Profile Fetch Error:", err);
        // If anything went wrong (like token expired), clear storage and force login
        localStorage.removeItem("adminToken");
        router.push("/admin-login");
      } finally {
        // Always stop the loading spinner, whether success or failure
        setLoadingComponent(false);
      }
    };

    fetchProfile(); // Execute the function when the component loads
  }, [router]);

  // Function called when the admin clicks the logout button
  const handleLogout = () => {
    // Erase all admin-related data from the browser
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminName");
    localStorage.removeItem("adminEmail");
    // Send them back to the login page
    router.push("/admin-login");
  };

  if (loadingComponent) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside
        className={`relative flex flex-col transition-all duration-300 border-r border-slate-200 bg-white shadow-sm z-20 ${collapsed ? "w-20" : "w-64"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 mb-2">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Shield size={18} fill="currentColor" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Stitch
              </h2>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            {collapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {menuItems.map((item, idx) => {
            if (item.isLocked) {
              return (
                <button
                  key={idx}
                  onClick={() => setIsLockedModalOpen(true)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative hover:bg-slate-50 text-slate-500 hover:text-slate-800 opacity-70`}
                  title={collapsed ? item.name : ""}
                >
                  <div className="text-slate-400 group-hover:text-slate-600 transition">
                    {item.icon}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm">{item.name}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  )}
                </button>
              );
            }
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${pathname === item.path
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "hover:bg-slate-50 text-slate-500 hover:text-slate-800"
                  }`}
                title={collapsed ? item.name : ""}
              >
                <div className={`${pathname === item.path ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"} transition`}>
                  {item.icon}
                </div>
                {!collapsed && <span className="text-sm">{item.name}</span>}

                {/* Active Indicator Line */}
                {pathname === item.path && !collapsed && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-600 rounded-l-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {!collapsed ? (
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="w-9 h-9 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm shadow-sm">
                {admin?.name?.charAt(0).toUpperCase() || "A"}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{admin?.name}</p>
                <p className="text-xs text-slate-500 truncate">{admin?.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-indigo-600 text-xs shadow-sm">
                {admin?.name?.charAt(0).toUpperCase() || "A"}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowLogoutModal(true)}
            className={`flex items-center justify-center w-full gap-2 py-2.5 rounded-lg transition-all duration-200 ${collapsed
              ? "text-red-500 hover:bg-red-50"
              : "bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 shadow-sm"
              }`}
          >
            <LogOut size={16} /> {!collapsed && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 relative overflow-y-auto flex flex-col h-screen">
        {/* Header bar */}
        <header className="flex items-center justify-between bg-white px-8 py-4 border-b border-slate-200 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">
            {menuItems.find(i => i.path === pathname)?.name || "Admin Panel"}
          </h1>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> System Operational
            </div>
            <NotificationBell role="admin" tokenKey="adminToken" />
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-slate-50">
              {admin?.name?.charAt(0).toUpperCase() || "A"}
            </div>
          </div>
        </header>

        <div className="p-8 animate-fade-in flex-1">
          {children}
        </div>
      </main>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out of the admin panel?"
        confirmText="Log Out"
        cancelText="Stay Logged In"
        isDestructive={true}
      />

      <AnimatePresence>
        {isLockedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl relative"
            >
              <button
                onClick={() => setIsLockedModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
              <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Feature Locked</h3>
              <p className="text-slate-500 mb-6">Suppliers Management coming in FYP 2</p>
              <button
                onClick={() => setIsLockedModalOpen(false)}
                className="w-full py-3 px-6 rounded-xl font-bold bg-slate-900 text-white hover:bg-black transition-colors"
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
