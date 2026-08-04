"use client";
import { useState, useEffect } from "react";
import {
   TrendingUp, ShoppingBag, DollarSign, Package,
   ArrowUpRight, ArrowDownRight, Activity, Plus,
   ChevronRight, Calendar, MessageSquare, Settings
} from "lucide-react";
import {
   LineChart, Line, XAxis, YAxis, CartesianGrid,
   Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";

/**
 * @file page.js
 * @description Vendor Dashboard - Simplified Text & Modern Light Theme.
 * This is the main landing page for vendors after they log in.
 */

export default function VendorDashboard() {
   // State variable to hold the statistics shown at the top of the dashboard
   const [stats, setStats] = useState({
      totalSales: "0",
      activeOrders: 0,
      totalProducts: 0,
      revenue: "0",
      growth: "+12.5%"
   });
   // State variable to track whether data is still loading from the server
   const [loading, setLoading] = useState(true);
   // State variable to store today's date formatted nicely as a string
   const [todayStr, setTodayStr] = useState("June 09, 2026");

   // This effect runs once when the dashboard first loads
   useEffect(() => {
      try {
         // Format the current date using the standard browser date formatter
         const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles", // Display in PST timezone
            month: "long",
            day: "2-digit",
            year: "numeric"
         });
         // Update the state variable with today's formatted date
         setTodayStr(formatter.format(new Date()));
      } catch (e) {
         console.error("Failed to format date in PST:", e);
      }

      // Asynchronous function to fetch vendor statistics from the backend database
      const fetchData = async () => {
         try {
            // Get the vendor's secure token from local browser storage
            const token = localStorage.getItem("vendorToken");
            // Call the vendor dashboard stats API endpoint, passing the secure token
            const res = await fetch("/api/vendor/dashboard/stats", {
               headers: { Authorization: `Bearer ${token}` }
            });
            
            // If the server responds with a success status (200 OK)
            if (res.ok) {
               // Convert the response to JSON and update the stats state
               const data = await res.json();
               setStats(data);
            }
         } catch (err) {
            // If there's a network error, log it to the console
            console.error("Fetch error:", err);
         } finally {
            // Stop the loading animation regardless of success or failure
            setLoading(false);
         }
      };
      
      // Execute the fetch function we just defined
      fetchData();
   }, []); // The empty array [] means this effect only runs once on load

   const chartData = [
      { name: "MON", value: 400 },
      { name: "TUE", value: 300 },
      { name: "WED", value: 600 },
      { name: "THU", value: 800 },
      { name: "FRI", value: 500 },
      { name: "SAT", value: 900 },
      { name: "SUN", value: 1000 },
   ];

   return (
      <div className="space-y-12 pb-20 animate-fade-in">
         {/* Welcome Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
               <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Welcome Back</h2>
               <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Overview</h1>
               <p className="text-sm font-medium text-slate-500 mt-2">Here's what's happening with your store today.</p>
            </div>
            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
               <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <Calendar size={18} />
               </div>
               <div className="pr-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Today</p>
                  <p className="text-[11px] font-black text-slate-900 uppercase mt-1">{todayStr}</p>
               </div>
            </div>
         </div>

         {/* Stats Grid */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
               { label: "Total Revenue", value: `Rs ${stats.revenue}`, icon: DollarSign, trend: "+8.2%", color: "emerald" },
               { label: "PendingOrders", value: stats.activeOrders, icon: ShoppingBag, trend: "+12", color: "orange" },
               { label: "Products", value: stats.totalProducts, icon: Package, trend: "0", color: "slate" },
               { label: "Sales Growth", value: stats.growth, icon: TrendingUp, trend: "Up", color: "emerald" },
            ].map((item, idx) => (
               <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 hover:border-[#F97316] transition-all group shadow-2xl shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-6">
                     <div className={`w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-[#F97316] group-hover:text-white transition-all`}>
                        <item.icon size={22} />
                     </div>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${item.trend.includes('-') ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {item.trend}
                     </span>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{item.value}</h3>
               </div>
            ))}
         </div>

         {/* Main Sections */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sales Chart */}
            <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl shadow-slate-200/50">
               <div className="flex items-center justify-between mb-10">
                  <div>
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sales Performance</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Weekly summary</p>
                  </div>
                  <Activity className="text-[#F97316]" size={20} />
               </div>
               <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs>
                           <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#F97316" stopOpacity={0.1} />
                              <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis
                           dataKey="name"
                           axisLine={false}
                           tickLine={false}
                           tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }}
                           dy={10}
                        />
                        <YAxis hide />
                        <Tooltip
                           contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: '900' }}
                        />
                        <Area
                           type="monotone"
                           dataKey="value"
                           stroke="#F97316"
                           strokeWidth={4}
                           fillOpacity={1}
                           fill="url(#colorValue)"
                        />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20">
               <h3 className="text-sm font-black uppercase tracking-widest mb-10">Quick Actions</h3>
               <div className="space-y-4">
                  {[
                     { label: "Add New Product", icon: Plus, href: "/vendor/products" },
                     { label: "View Messages", icon: MessageSquare, href: "/vendor/messages" },
                     { label: "Pending Orders", icon: ShoppingBag, href: "/vendor/orders" },
                     { label: "Account Settings", icon: Settings, href: "/vendor/settings" },
                  ].map((action, idx) => (
                     <button
                        key={idx}
                        onClick={() => window.location.href = action.href}
                        className="w-full flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-[#F97316] hover:border-[#F97316] transition-all group"
                     >
                        <div className="flex items-center gap-4">
                           <action.icon size={18} className="text-[#F97316] group-hover:text-white transition-all" />
                           <span className="text-[10px] font-black uppercase tracking-widest">{action.label}</span>
                        </div>
                        <ArrowUpRight size={16} className="text-white/20 group-hover:text-white transition-all" />
                     </button>
                  ))}
               </div>

               <div className="mt-12 p-8 bg-white/5 rounded-3xl border border-white/5">
                  <p className="text-[9px] font-black text-[#F97316] uppercase tracking-[0.3em] mb-2">Store Tip</p>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed">
                     Keeping your product descriptions detailed helps customers find exactly what they need.
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
}
