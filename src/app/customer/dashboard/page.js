// File: app/customer/dashboard/page.js
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Package,
  Clock,
  Heart,
  ArrowUpRight,
  Star,
  Zap,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import Image from "next/image";

/**
 * @file page.js
 * @description Customer Dashboard.
 * Central hub for customers to view stats, active orders, and trending designs.
 * Fetches user profile, order stats, and trending products.
 */

export default function Dashboard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("Designer");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.json()).then(data => {
        if (data.first_name || data.firstName) setFirstName(data.first_name || data.firstName);
      }).catch(err => console.error(err));
    }
  }, []);

  /* ===== Context ===== */
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const handleAddToCart = (jacket) => {
    addToCart({
      id: jacket.id,
      title: jacket.title,
      img: jacket.img,
      price: String(jacket.price).replace(/[^\d]/g, ""),
      quantity: 1,
    });

    showToast(`✓ ${jacket.title} added to cart`, "success");
  };

  /* ===== Trending State ===== */
  const [trendingJackets, setTrendingJackets] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    setLoadingTrending(true);
    fetch('/api/public/products/trending')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTrendingJackets(data.map(p => ({
            id: p.id,
            title: p.name,
            price: p.price,
            rating: p.average_rating || 0,
            reviews: p.total_reviews || 0,
            trend: "Hot",
            img: p.image,
            badge: "Premium"
          })));
        }
      })
      .catch(e => console.error(e))
      .finally(() => setLoadingTrending(false));
  }, []);

  /* ===== Stats State ===== */
  const [statsData, setStatsData] = useState({
    orders: 0,
    inProgress: 0,
    savedDesigns: 0,
    spent: 0
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchData = async () => {
      try {
        const ordersRes = await fetch('/api/customer/orders/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        let ordersCount = 0;
        let inProgressCount = 0;
        let totalSpent = 0;

        if (ordersRes.ok) {
          const orders = await ordersRes.json();
          if (Array.isArray(orders)) {
            ordersCount = orders.length;
            inProgressCount = orders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
            totalSpent = orders.reduce((sum, o) => sum + Number(o.total), 0);
          }
        }

        const designsRes = await fetch('/api/customer/designs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        let designsCount = 0;
        if (designsRes.ok) {
          const designs = await designsRes.json();
          if (Array.isArray(designs)) {
            designsCount = designs.length;
          }
        }

        setStatsData({
          orders: ordersCount,
          inProgress: inProgressCount,
          savedDesigns: designsCount,
          spent: totalSpent
        });

      } catch (e) {
        console.error("Dashboard stats fetch error", e);
      }
    };

    fetchData();
  }, []);

  const stats = [
    { label: "Total Orders", value: statsData.orders.toString(), icon: Package, growth: "+2%", color: "brand" },
    { label: "Active Orders", value: statsData.inProgress.toString(), icon: Clock, growth: "on track", color: "blue" },
    { label: "Saved Designs", value: statsData.savedDesigns.toString(), icon: Heart, growth: "new", color: "rose" },
    { label: "Total Invested", value: `Rs ${statsData.spent.toLocaleString()}`, icon: ShieldCheck, growth: "+0%", color: "emerald" },
  ];

  /* ===== Animation Variants ===== */
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  };
  const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.2, 0.65, 0.3, 0.9] } } };

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Banner - More Compact & Refined */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative overflow-hidden rounded-3xl bg-[#1E293B] p-8 md:p-10 shadow-xl group"
      >
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-orange-500/15 transition-colors"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-orange-400 text-[9px] font-black uppercase tracking-[0.2em] mb-4"
            >
              <Zap size={10} fill="currentColor" /> Premium Atelier
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
              Creative Hub, <span className="text-orange-400">{firstName}</span>
            </h1>
            <p className="text-slate-400 max-w-lg text-base font-medium leading-relaxed mx-auto md:mx-0">
              Your bespoke journey continues. Manage your active orders, refine your saved masterpieces, or start a new design.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={() => router.push("/customer/customize")}
                className="px-8 py-3.5 bg-[#F97316] hover:bg-[#e66000] text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
              >
                <Zap className="w-4 h-4" fill="currentColor" /> Start Studio
              </button>
              <button
                onClick={() => router.push("/customer/orders")}
                className="px-8 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all"
              >
                History
              </button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl rotate-3">
              <Image src="/dashboard-hero.png" alt="Featured Masterpiece" fill className="object-cover" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Section - Minimal & Integrated */}
      <motion.section initial="hidden" animate="visible" variants={containerVariants}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                    ${idx === 0 ? "bg-orange-50 text-[#F97316]" : ""}
                    ${idx === 1 ? "bg-blue-50 text-blue-600" : ""}
                    ${idx === 2 ? "bg-rose-50 text-rose-600" : ""}
                    ${idx === 3 ? "bg-emerald-50 text-emerald-600" : ""}
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-black text-[#1E293B] tracking-tight">{stat.value}</p>
                      {stat.growth && (
                        <span className={`text-[9px] font-black truncate
                          ${stat.growth.startsWith('+') ? "text-emerald-500" : "text-slate-400"}
                        `}>
                          {stat.growth}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* Trending Section - Elegant Vertical Cards */}
      <motion.section initial="hidden" animate="visible" variants={containerVariants}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-8 bg-[#1E293B] rounded-full"></div>
            <h2 className="text-2xl font-black text-[#1E293B] tracking-tight uppercase">Hot Collections</h2>
          </div>
          <button onClick={() => router.push('/customer/shop')} className="group flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-[#F97316] transition-colors uppercase tracking-[0.2em]">
            Explore All <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {loadingTrending ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-[2.5rem] bg-white border border-slate-100 h-[500px] p-5 space-y-5 shadow-sm">
                <div className="h-80 w-full animate-pulse-shimmer rounded-[2rem] bg-slate-50" />
                <div className="space-y-4 px-2">
                  <div className="h-6 animate-pulse-shimmer rounded-full w-3/4 bg-slate-50" />
                  <div className="h-4 animate-pulse-shimmer rounded-full w-1/2 bg-slate-50" />
                </div>
              </div>
            ))
          ) : (
            trendingJackets.slice(0, 4).map((jacket) => (
              <motion.div
                key={jacket.id}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
                onClick={() => router.push(`/customer/shop/${jacket.id}`)}
                className="group relative bg-white rounded-[2.5rem] transition-all duration-500 cursor-pointer"
              >
                {/* Image Wrapper - Taller Proportions */}
                <div className="relative h-[380px] overflow-hidden rounded-[2.5rem] bg-slate-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500">
                  <Image
                    src={jacket.img}
                    alt={jacket.title}
                    fill
                    className="object-cover transform group-hover:scale-105 transition-transform duration-1000 ease-out"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />

                  {/* Premium Badge */}
                  <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur-md text-[9px] font-black text-[#F97316] rounded-full shadow-sm uppercase tracking-widest border border-white/20">
                    {jacket.badge}
                  </div>

                  {/* Elegant Price & Action Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-6 translate-y-6 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <div className="bg-[#1E293B]/90 backdrop-blur-xl p-4 rounded-[1.5rem] flex items-center justify-between shadow-2xl border border-white/10">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Price</p>
                        <p className="text-sm font-black text-white">Rs. {Number(jacket.price).toLocaleString()}</p>
                      </div>
                      <div className="w-10 h-10 bg-[#F97316] text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-white hover:text-[#F97316] transition-colors">
                        <Package className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content Area - Clean & High End */}
                <div className="mt-6 px-2">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-black text-xl text-[#1E293B] leading-tight group-hover:text-[#F97316] transition-colors tracking-tight">
                      {jacket.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          fill={s <= Math.round(jacket.rating) ? "#FBBF24" : "none"}
                          className={s <= Math.round(jacket.rating) ? "text-amber-400" : "text-slate-200"}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {jacket.reviews} Reviews
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.section>
    </div>
  );
}
