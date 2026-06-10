
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Eye, X, Scissors, Layers, ArrowLeft } from "lucide-react";
import UserAvatar from "@/app/components/AppUserAvatar";

export default function TrendingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [activeVibe, setActiveVibe] = useState("All");
  const [quickLookJacket, setQuickLookJacket] = useState(null);
  const [remixingJacket, setRemixingJacket] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [likes, setLikes] = useState({});

  const vibes = ["All", "Streetwear", "Varsity", "Minimalist", "Cyberpunk", "Heritage", "Avant-Garde"];


  const [jackets, setJackets] = useState([]);

  useEffect(() => {
    fetch('/api/public/products/trending')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Map to UI format
          const formatted = data.map(p => ({
            id: p.id,
            name: p.name,
            creator: "Vendor",
            vibe: p.category || "All",
            uses: Math.floor(Math.random() * 500) + 100,
            materials: ["Premium Quality"],
            price: Number(p.price),
            img: p.image,
            tall: Math.random() > 0.5
          }));
          setJackets(formatted);
        }
      })
      .catch(err => console.error("Failed to load trending items", err));
  }, []);

  const filteredJackets = activeVibe === "All"
    ? jackets
    : jackets.filter(j => j.vibe === activeVibe);

  // Fetch profile - Fixed with proper error handling
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    (async () => {
      try {
        const res = await fetch("/api/auth/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (!res.ok) {
          console.warn("Profile fetch failed:", res.status);
          return;
        }

        const data = await res.json();
        setProfile({
          userId: data.user_id,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
        });
      } catch (err) {
        console.error("Profile fetch error:", err);
        // Don't redirect, just continue without profile
      }
    })();
  }, []);

  // Spacebar trigger for Quick Look
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        const hoveredCard = document.querySelector('[data-jacket-card]:hover');
        if (hoveredCard) {
          const jacketId = parseInt(hoveredCard.dataset.jacketId);
          const jacket = jackets.find(j => j.id === jacketId);
          if (jacket) setQuickLookJacket(jacket);
        }
      }
      if (e.code === "Escape" && quickLookJacket) {
        setQuickLookJacket(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [quickLookJacket]);

  const handleRemix = (jacket) => {
    setRemixingJacket(jacket);

    const steps = [
      { delay: 400 },
      { delay: 600 },
      { delay: 500 },
      { delay: 400 }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setLoadingStep(currentStep);

      if (currentStep >= steps.length) {
        clearInterval(interval);
        setTimeout(() => {
          router.push(`/customer/customize?template=${jacket.id}`);
        }, 300);
      }
    }, steps[currentStep]?.delay || 500);
  };

  const toggleLike = (id) => {
    setLikes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-orange-50">

        {/* Vibe Filters Bar */}
        <div className="bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm sticky top-0 z-30 px-6 py-4">
          <div className="max-w-[1800px] mx-auto flex items-center gap-3 overflow-x-auto hide-scrollbar">
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mr-2 whitespace-nowrap">
              Filter by Vibe
            </span>
            {vibes.map(vibe => (
              <motion.button
                key={vibe}
                onClick={() => setActiveVibe(vibe)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeVibe === vibe
                  ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/30"
                  : "bg-white text-slate-400 hover:bg-slate-50 border border-slate-200 hover:border-[#F97316] hover:text-[#F97316]"
                  }`}
              >
                {vibe}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Masonry Grid */}
        <div className="max-w-[1800px] mx-auto px-12 py-12">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-[#1E293B] uppercase tracking-tight mb-2">Trending Designs</h2>
            <p className="text-slate-500 font-medium">Discover and remix jackets crafted by our community</p>
          </div>

          <motion.div
            layout
            className="grid grid-cols-3 gap-8 auto-rows-[400px]"
            style={{
              gridAutoFlow: "dense"
            }}
          >
            <AnimatePresence mode="popLayout">
              {filteredJackets.map((jacket, idx) => (
                <motion.article
                  key={jacket.id}
                  data-jacket-card
                  data-jacket-id={jacket.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: idx * 0.05,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                  className={`group relative bg-white rounded-[2.5rem] overflow-hidden cursor-pointer border border-slate-100 hover:border-[#F97316]/30 transition-all ${jacket.tall ? "row-span-2" : "row-span-1"
                    }`}
                  style={{
                    boxShadow: "0 8px 30px rgba(0,0,0,0.04)"
                  }}
                >
                  {/* Image Container */}
                  <div className="relative w-full h-full overflow-hidden bg-slate-50">
                    <motion.img
                      src={jacket.img}
                      alt={jacket.name}
                      className="w-full h-full object-cover"
                      whileHover={{
                        scale: 1.05,
                        transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                      }}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1E293B]/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Default State - Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent">
                    <h3 className="text-xl font-black text-[#1E293B] mb-1 tracking-tight">{jacket.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{jacket.creator}</p>
                  </div>

                  {/* Hover State - UI Reveal */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col justify-between p-6 opacity-0 group-hover:opacity-100"
                  >
                    {/* Top - Like & Quick Look */}
                    <div className="flex justify-between items-start">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLike(jacket.id);
                        }}
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/50 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                      >
                        <Heart
                          className={`w-5 h-5 ${likes[jacket.id] ? "fill-rose-500 text-rose-500" : "text-slate-400"}`}
                        />
                      </motion.button>

                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickLookJacket(jacket);
                        }}
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-md border border-slate-200/50 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                      >
                        <Eye className="w-5 h-5 text-slate-400" />
                      </motion.button>
                    </div>

                    {/* Bottom - Social Proof & CTA */}
                    <div>
                      <div className="mb-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white px-4 py-2 bg-[#1E293B]/60 backdrop-blur-md rounded-full w-fit">
                        <Layers className="w-3 h-3" />
                        <span>Used by {jacket.uses} designers</span>
                      </div>

                      <motion.button
                        onClick={() => handleRemix(jacket)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-4 bg-[#F97316] text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/40 hover:bg-[#e66000] transition-all"
                      >
                        Remix
                      </motion.button>
                    </div>
                  </motion.div>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Quick Look Modal */}
        <AnimatePresence>
          {quickLookJacket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-12"
              onClick={() => setQuickLookJacket(null)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-md" />

              {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white rounded-[2.5rem] overflow-hidden max-w-5xl w-full grid grid-cols-2 gap-12 p-12 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100"
              >
                {/* Close Button */}
                <button
                  onClick={() => setQuickLookJacket(null)}
                  className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors border border-slate-200"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>

                {/* Left - Image */}
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-50 shadow-inner">
                  <img
                    src={quickLookJacket.img}
                    alt={quickLookJacket.name}
                    className="w-full h-[600px] object-cover"
                  />
                </div>

                {/* Right - Info */}
                <div className="flex flex-col justify-between py-4">
                  <div>
                    <h2 className="text-4xl font-black text-[#1E293B] mb-2 tracking-tight uppercase">{quickLookJacket.name}</h2>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-10">by {quickLookJacket.creator}</p>

                    {/* Jacket DNA */}
                    <div className="mb-10">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Jacket DNA</h3>
                      <div className="space-y-3">
                        {quickLookJacket.materials.map((material, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                              <Scissors className="w-4 h-4 text-[#F97316]" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-[#1E293B]">{material}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="p-6 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#F97316] mb-2">Estimated Price</p>
                      <p className="text-4xl font-black text-[#1E293B] tracking-tight">Rs {quickLookJacket.price}</p>
                    </div>
                  </div>

                  {/* CTA */}
                  <motion.button
                    onClick={() => {
                      setQuickLookJacket(null);
                      handleRemix(quickLookJacket);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-5 bg-[#F97316] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-500/20 hover:shadow-2xl hover:shadow-orange-500/30 hover:bg-[#e66000] transition-all"
                  >
                    Remix This Masterpiece
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Smart Handoff Loading */}
        <AnimatePresence>
          {remixingJacket && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-white flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="mb-8 flex justify-center"
                >
                  <div className="w-24 h-24 rounded-[2rem] bg-orange-50 flex items-center justify-center">
                    <Scissors className="w-10 h-10 text-[#F97316]" />
                  </div>
                </motion.div>

                <motion.h2
                  key={loadingStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-3xl font-black text-[#1E293B] mb-3 tracking-tight uppercase"
                >
                  {
                    loadingStep === 0 ? "Loading Pattern…" :
                      loadingStep === 1 ? "Cutting Fabric…" :
                        loadingStep === 2 ? "Stitching Sleeves…" :
                          "Ready."
                  }
                </motion.h2>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Building your masterpiece</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Global Styles - Moved outside main to prevent hydration issues */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}