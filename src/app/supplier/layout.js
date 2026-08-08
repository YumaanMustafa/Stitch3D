"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, Truck, Settings, LogOut, Menu, X, MessageSquare, ShieldCheck, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import NotificationBell from "@/app/components/NotificationBell";

/**
 * @file layout.js
 * @description Supplier Layout - 2-Tone Professional Design (Midnight Sidebar & Orange Accents).
 * This file acts as the main wrapper for all supplier pages. It provides the sidebar menu 
 * and the top navigation bar across all supplier screens.
 */

export default function SupplierLayout({ children }) {
  // State to manage whether the mobile sidebar is open or closed
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // State to manage whether the desktop sidebar is collapsed (thin) or expanded (wide)
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Tool to get the current page URL path so we can highlight the active menu item
  const pathname = usePathname();
  // Tool to navigate the user to different pages programmatically
  const router = useRouter();
  
  // State variables for storing supplier profile info
  const [userInitial, setUserInitial] = useState("S"); // Used for the avatar circle
  const [supplierName, setSupplierName] = useState(""); // Displayed in header
  // State to control whether the logout confirmation popup is visible
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // State to track notification counts (like unread messages) for the sidebar badges
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    requests: 0,
    inventory: 0
  });

  // This effect runs automatically when the layout loads to check login status and load initial data
  useEffect(() => {
    // STEP 1: Verify Supplier Identity
    // We look for a special "supplierToken" in local storage. This is the supplier's digital ID card.
    const token = localStorage.getItem("supplierToken");
    if (!token) {
      // If no token is found, they are not logged in. We kick them back to the login screen immediately.
      router.push("/supplier-auth/login");
      return;
    }
    
    // STEP 2: Fetch Supplier Profile Details
    // We send a request to our backend API to get this specific supplier's data (like their company name)
    fetch("/api/supplier/settings", {
      // We attach the token in the headers so the server knows exactly who is asking
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject()) // If successful, convert to JSON. If not, reject the promise.
      .then(data => {
        // If we successfully get the supplier's name back, we update our React state variables
        if (data.name) {
          setSupplierName(data.name); // This updates the name shown in the top header bar
          // We set the avatar initial to the first letter of their name, converted to uppercase
          setUserInitial(data.name.charAt(0).toUpperCase());
        }
      })
      .catch(() => {
        // If the fetch fails (e.g., bad internet), we just silently fail and keep default values
      });

    // STEP 3: Check for Unread Notifications
    // We define an asynchronous function that checks if this supplier has any new alerts (messages, orders, etc.)
    const checkUnread = async () => {
      try {
        if (!token) return; // Safety check
        // Ask the backend for all notifications belonging to this supplier
        const resN = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
        
        if (resN.ok) {
          const notifs = await resN.json();
          // Filter the list to only include notifications that have NOT been read yet
          const unread = notifs.filter(n => !n.is_read);
          
          // We update our `unreadCounts` state by categorizing the unread notifications
          // This allows us to put red number badges next to the correct menu items in the sidebar!
          setUnreadCounts({
            // Count how many are chat messages
            messages: unread.filter(n => n.type === 'message').length,
            // Count how many are new custom requests or official orders
            requests: unread.filter(n => n.type === 'request' || n.type === 'order').length,
            // Count how many are inventory alerts (like low stock)
            inventory: unread.filter(n => n.type === 'inventory').length
          });
        }
      } catch { 
        // Silently ignore errors to prevent spamming the console
      }
    };
    
    // Check for unread notifications immediately when the page loads
    checkUnread();
    
    // STEP 4: Set up Polling
    // We create a background timer that automatically runs the `checkUnread` function every 10 seconds (10,000 milliseconds).
    // This makes the notification badges update in "real-time" without the user having to refresh the page.
    const interval = setInterval(checkUnread, 10000);
    
    // STEP 5: Cleanup
    // When the user leaves this layout, React will run this return function.
    // We clear the timer so it doesn't keep running in the background and wasting computer memory.
    return () => clearInterval(interval);
  }, [router]);

  // Function called when user confirms they want to log out
  const handleLogout = () => {
    // Remove their token from browser storage so they are no longer logged in
    localStorage.removeItem("supplierToken");
    // Send them back to the login page
    router.push("/supplier-auth/login");
  };

  // The list of links that appear in the sidebar menu
  const navItems = [
    { name: "Dashboard", href: "/supplier/dashboard", icon: LayoutDashboard },
    { name: "Requests", href: "/supplier/vendor-requests", icon: Truck },
    { name: "Inventory", href: "/supplier/inventory", icon: Package },
    { name: "Messages", href: "/supplier/messages", icon: MessageSquare },
    { name: "Settings", href: "/supplier/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 font-sans transition-all duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar - 2-Tone DARK SIDEBAR */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen bg-[#0F172A] transition-all duration-300 z-50 flex flex-col shadow-2xl
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "w-24" : "w-72"}`}
      >
        <div className="p-6 h-full flex flex-col">
           {/* Logo Area */}
           <div className={`flex items-center gap-3 mb-12 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="flex-shrink-0 w-11 h-11 bg-[#F97316] rounded-xl flex items-center justify-center shadow-[0_10px_20px_rgba(249,115,22,0.3)] transform -rotate-2 hover:rotate-0 transition-transform cursor-pointer">
                 <ShieldCheck className="text-white" size={22} />
              </div>
              {!isCollapsed && (
                <div className="animate-fade-in whitespace-nowrap">
                   <h1 className="text-lg font-black tracking-tighter italic uppercase text-white leading-none">Stitch</h1>
                   <p className="text-[8px] font-black uppercase tracking-[0.4em] text-[#F97316] mt-1">Supplier Portal</p>
                </div>
              )}
              <button className="lg:hidden ml-auto text-slate-500" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
           </div>

           {/* Navigation */}
           <nav className="space-y-1.5 flex-1 overflow-y-auto scrollbar-hide pr-1">
             {navItems.map((item) => {
               const isActive = pathname === item.href;
               const Icon = item.icon;
               return (
                 <Link
                   key={item.name}
                   href={item.href}
                   onClick={() => setSidebarOpen(false)}
                   className={`group flex items-center gap-4 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 relative
                     ${isCollapsed ? 'justify-center px-0' : 'px-5'}
                     ${isActive 
                       ? "bg-[#F97316] text-white shadow-lg shadow-orange-900/20" 
                       : "text-slate-500 hover:text-white hover:bg-white/5"
                     }`}
                   title={isCollapsed ? item.name : ""}
                 >
                   <Icon size={18} className={`flex-shrink-0 ${isActive ? "text-white" : "text-slate-600 group-hover:text-[#F97316]"}`} />
                   {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">{item.name}</span>}
                   
                   {/* Badge */}
                   {unreadCounts[item.name.toLowerCase()] > 0 && (
                     <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black 
                        ${isCollapsed ? 'absolute top-2 right-2' : 'ml-auto'}
                        ${isActive ? 'bg-white text-[#F97316]' : 'bg-[#F97316] text-white'}`}
                      >
                       {unreadCounts[item.name.toLowerCase()]}
                     </span>
                   )}
                 </Link>
               );
             })}
           </nav>

           {/* Footer */}
           <div className="mt-auto space-y-4 pt-6 border-t border-white/5">
              <button 
                onClick={() => setShowLogoutModal(true)} 
                className={`flex items-center gap-4 px-5 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] text-slate-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all w-full ${isCollapsed ? 'justify-center' : ''}`}
              >
                 <LogOut size={18} className="flex-shrink-0" />
                 {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Log Out</span>}
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 h-20 px-8 lg:px-12 flex items-center justify-between sticky top-0 z-30 transition-all">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu /></button>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="hidden lg:flex p-2 text-slate-400 hover:text-[#F97316] transition-all"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>

            <div className="flex flex-col">
               <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Identity</h2>
               <p className="text-sm font-black text-slate-900 uppercase italic truncate max-w-[200px]">{supplierName || "Supplier Account"}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationBell role="supplier" tokenKey="supplierToken" />
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-[#F97316] font-black text-base shadow-xl shadow-slate-200 group cursor-pointer hover:bg-[#F97316] hover:text-white transition-all">
              {userInitial}
            </div>
          </div>
        </header>

        <div className="p-8 lg:p-12 max-w-[1600px] mx-auto w-full flex-1">
          {children}
        </div>
      </main>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Confirm"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
}
