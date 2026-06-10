"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingBag, Truck, Settings, LogOut, Menu, X, MessageSquare, Star, ShieldCheck, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import NotificationBell from "@/app/components/NotificationBell";

export default function VendorLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [userInitial, setUserInitial] = useState("V");
  const [vendorName, setVendorName] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    messages: 0,
    suppliers: 0,
    orders: 0,
    requests: 0
  });

  useEffect(() => {
    const token = localStorage.getItem("vendorToken");
    if (!token) {
      router.push("/vendor-auth/login");
      return;
    }

    fetch("/api/vendor/settings", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.name) {
          setVendorName(data.name);
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
            messages: unread.filter(n => n.type === 'message' && n.message.toLowerCase().includes('customer')).length,
            suppliers: unread.filter(n => n.type === 'message' && n.message.toLowerCase().includes('supplier')).length,
            orders: unread.filter(n => n.type === 'order').length,
            requests: unread.filter(n => n.type === 'material').length
          });
        }
      } catch { }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("vendorToken");
    router.push("/vendor-auth/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/vendor/dashboard", icon: LayoutDashboard },
    { name: "Messages", href: "/vendor/messages", icon: MessageSquare },
    { name: "Suppliers", href: "/vendor/supplier-messages", icon: MessageSquare },
    { name: "Requests", href: "/vendor/material-requests", icon: Truck },
    { name: "Products", href: "/vendor/products", icon: ShoppingBag },
    { name: "Reviews", href: "/vendor/reviews", icon: Star },
    { name: "Orders", href: "/vendor/orders", icon: Truck },
    { name: "Settings", href: "/vendor/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans transition-all duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 transition-all duration-300 z-50 flex flex-col 
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "w-24" : "w-72"}`}
      >
        <div className="p-6 h-full flex flex-col">
           {/* Logo Area */}
           <div className={`flex items-center gap-3 mb-10 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="flex-shrink-0 w-12 h-12 bg-[#F97316] rounded-2xl flex items-center justify-center shadow-[0_10px_25px_rgba(249,115,22,0.25)] transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
                 <ShieldCheck className="text-white" size={24} />
              </div>
              {!isCollapsed && (
                <div className="animate-fade-in whitespace-nowrap">
                   <h1 className="text-xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">Stitch</h1>
                   <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#F97316]">Vendor Hub</p>
                </div>
              )}
              <button className="lg:hidden ml-auto text-slate-400" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
           </div>

           {/* Navigation */}
           <nav className="space-y-2 flex-1 overflow-y-auto scrollbar-hide pr-1">
             {navItems.map((item) => {
               const isActive = pathname === item.href;
               return (
                 <Link
                   key={item.name}
                   href={item.href}
                   onClick={() => setSidebarOpen(false)}
                   className={`group flex items-center gap-4 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 relative
                     ${isCollapsed ? 'justify-center px-0' : 'px-5'}
                     ${isActive 
                       ? "bg-[#F97316] text-white shadow-[0_10px_20px_rgba(249,115,22,0.15)]" 
                       : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                     }`}
                   title={isCollapsed ? item.name : ""}
                 >
                   <item.icon size={18} className={`flex-shrink-0 ${isActive ? "text-white" : "text-slate-300 group-hover:text-[#F97316]"}`} />
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
           <div className="mt-auto space-y-4 pt-6 border-t border-slate-100">
              <button 
                onClick={() => setShowLogoutModal(true)} 
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-rose-500 hover:bg-rose-50 transition-all w-full ${isCollapsed ? 'justify-center' : ''}`}
              >
                 <LogOut size={18} className="flex-shrink-0" />
                 {!isCollapsed && <span className="animate-fade-in whitespace-nowrap">Log Out</span>}
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-20 px-8 lg:px-12 flex items-center justify-between sticky top-0 z-30 transition-all">
          <div className="flex items-center gap-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu /></button>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="hidden lg:flex p-2 text-slate-400 hover:text-slate-900 transition-all"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>

            <div className="flex flex-col">
               <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Vendor</h2>
               <p className="text-sm font-black text-slate-900 uppercase italic truncate max-w-[200px]">{vendorName || "Vendor Account"}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationBell role="vendor" tokenKey="vendorToken" />
            <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-[#F97316] font-black text-lg shadow-xl shadow-slate-200 group cursor-pointer hover:bg-[#F97316] hover:text-white transition-all">
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
