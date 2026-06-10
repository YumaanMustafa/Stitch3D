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
 */

export default function SupplierLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [userInitial, setUserInitial] = useState("S");
  const [supplierName, setSupplierName] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    requests: 0,
    inventory: 0
  });

  useEffect(() => {
    const token = localStorage.getItem("supplierToken");
    if (!token) {
      router.push("/supplier-auth/login");
      return;
    }
    
    // Fetch profile from role-specific settings
    fetch("/api/supplier/settings", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.name) {
          setSupplierName(data.name);
          setUserInitial(data.name.charAt(0).toUpperCase());
        }
      })
      .catch(() => {});

    const checkUnread = async () => {
      try {
        if (!token) return;
        const resN = await fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
        if (resN.ok) {
          const notifs = await resN.json();
          const unread = notifs.filter(n => !n.is_read);
          setUnreadCounts({
            messages: unread.filter(n => n.type === 'message').length,
            requests: unread.filter(n => n.type === 'request' || n.type === 'order').length,
            inventory: unread.filter(n => n.type === 'inventory').length
          });
        }
      } catch { }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("supplierToken");
    router.push("/supplier-auth/login");
  };

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
                   <item.icon size={18} className={`flex-shrink-0 ${isActive ? "text-white" : "text-slate-600 group-hover:text-[#F97316]"}`} />
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
