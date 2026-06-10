"use client";
import React, { useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, Clock, AlertCircle, ArrowRight,
  CheckCircle, XCircle, Package, PackageOpen, Zap,
  Activity, ChevronRight, ShieldAlert, FileText, RefreshCw, ShoppingBag
} from "lucide-react";
import Link from "next/link";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

/**
 * @file page.js
 * @description Supplier Dashboard - Simplified Text & Modern Light Theme.
 */

export default function SupplierDashboard() {
  const [data, setData] = useState({
    stats: { revenue: 0, orders: 0, pending: 0, growth: 0, inventoryAlerts: [], activityFeed: [] },
    chart: [],
    actions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("supplierToken");
        const res = await fetch("/api/supplier/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const result = await res.json();
          setData({
            stats: { ...result, inventoryAlerts: result.inventoryAlerts || [], activityFeed: result.activityFeed || [] },
            chart: result.chart || [],
            actions: result.actions || [],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = data.chart.length > 0 ? data.chart : [
    { name: "MON", revenue: 400 },
    { name: "TUE", revenue: 300 },
    { name: "WED", revenue: 600 },
    { name: "THU", revenue: 800 },
    { name: "FRI", revenue: 500 },
    { name: "SAT", revenue: 900 },
    { name: "SUN", revenue: 1000 },
  ];

  return (
    <div className="space-y-12 pb-20 animate-fade-in">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Supplier Portal</h2>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Operations Overview</h1>
           <p className="text-sm font-medium text-slate-500 mt-2">Managing fulfillments and supply chain performance.</p>
        </div>
        <Link
          href="/supplier/vendor-requests"
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all shadow-xl shadow-slate-200 flex items-center gap-3"
        >
          <Zap size={18} /> View Requests
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Total Revenue", value: `Rs ${data.stats.revenue}`, icon: DollarSign, trend: `+${data.stats.growth}%`, color: "emerald" },
          { label: "Total Orders", value: data.stats.orders, icon: ShoppingBag, trend: "+5%", color: "orange" },
          { label: "Pending Requests", value: data.stats.pending, icon: Clock, trend: "Active", color: "slate" },
          { label: "Supply Health", value: "Optimal", icon: Activity, trend: "Stable", color: "emerald" },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-200 hover:border-[#F97316] transition-all group shadow-2xl shadow-slate-200/50">
             <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 group-hover:bg-[#F97316] group-hover:text-white transition-all">
                   <item.icon size={22} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                   {item.trend}
                </span>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
             <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{item.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Revenue Chart */}
         <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-10">
               <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Revenue Flow</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Weekly performance</p>
               </div>
               <TrendingUp className="text-[#F97316]" size={20} />
            </div>
            <div className="h-[350px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#F97316" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} dy={10} />
                     <YAxis hide />
                     <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontSize: '10px', fontWeight: '900' }} />
                     <Area type="monotone" dataKey="revenue" stroke="#F97316" strokeWidth={4} fill="url(#colorRev)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Right Column: Inventory Risks & Activity */}
         <div className="space-y-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20">
               <h3 className="text-sm font-black uppercase tracking-widest mb-8">Stock Alerts</h3>
               <div className="space-y-6">
                  {data.stats.inventoryAlerts.length > 0 ? data.stats.inventoryAlerts.map((item, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-white/5 pb-4">
                       <div>
                          <p className="text-[11px] font-black uppercase tracking-widest text-white">{item.name}</p>
                          <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-1">Low Stock: {item.stock} left</p>
                       </div>
                       <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    </div>
                  )) : (
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">All levels optimal.</p>
                  )}
               </div>
               <Link href="/supplier/inventory" className="mt-10 flex items-center justify-between text-[9px] font-black text-[#F97316] uppercase tracking-widest hover:underline">
                  Manage Inventory <ChevronRight size={14} />
               </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-2xl shadow-slate-200/50">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Recent Events</h3>
               <div className="space-y-6">
                  {data.stats.activityFeed.length > 0 ? data.stats.activityFeed.map((item, i) => (
                    <div key={i} className="flex gap-4 items-start">
                       <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                          <Activity size={14} className="text-slate-400" />
                       </div>
                       <div>
                          <p className="text-[11px] font-medium text-slate-600 leading-tight">{item.text}</p>
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{item.time}</p>
                       </div>
                    </div>
                  )) : (
                    <div className="py-10 text-center">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No recent events.</p>
                    </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
