"use client";
import React, { useEffect, useState } from "react";
import { Star, MessageSquare, Send, User, Package, Search, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * @file page.js
 * @description Vendor Product Reviews - Simplified Text & Modern Light Theme.
 */

export default function VendorReviewsPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [submittingReply, setSubmittingReply] = useState(false);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchReviews = async () => {
        try {
            const token = localStorage.getItem("vendorToken");
            const res = await fetch("/api/vendor/reviews", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setReviews(await res.json());
        } catch (err) {} finally { setLoading(false); }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleReply = async (reviewId) => {
        setSubmittingReply(true);
        try {
            const token = localStorage.getItem("vendorToken");
            const res = await fetch("/api/vendor/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ reviewId, replyText })
            });
            if (res.ok) {
                setReplyingTo(null);
                setReplyText("");
                fetchReviews();
            }
        } catch (err) {} finally { setSubmittingReply(false); }
    };

    const filteredReviews = reviews.filter(r => {
        const matchesFilter = filter === "all" || (filter === "pending" && !r.vendor_reply) || (filter === "replied" && r.vendor_reply);
        const matchesSearch = r.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.comment || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                   <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Feedback</h2>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Customer Reviews</h1>
                   <p className="text-sm font-medium text-slate-500 mt-2">See what your customers think about your products.</p>
                </div>
            </div>

            {/* Control Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input
                     type="text"
                     placeholder="SEARCH REVIEWS..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-[#F97316] transition-all"
                   />
                </div>
                <div className="flex items-center gap-3">
                   <div className="relative">
                      <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        className="appearance-none pl-6 pr-10 py-3 bg-slate-100 border-none rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:bg-slate-200 transition-all"
                      >
                        <option value="all">Filter: ALL</option>
                        <option value="pending">PENDING REPLY</option>
                        <option value="replied">REPLIED</option>
                      </select>
                   </div>
                </div>
            </div>

            {/* Reviews Grid */}
            <div className="grid grid-cols-1 gap-8">
                {loading ? (
                    <div className="py-20 text-center animate-pulse text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Loading Reviews...</div>
                ) : filteredReviews.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 border border-slate-200 text-center flex flex-col items-center">
                       <MessageSquare size={48} className="text-slate-200 mb-6" />
                       <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">No reviews yet</h2>
                    </div>
                ) : (
                    filteredReviews.map((review) => (
                        <motion.div 
                            key={review.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] border border-slate-200 p-10 hover:border-[#F97316] transition-all shadow-xl shadow-slate-200/40"
                        >
                            <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
                                <div className="flex gap-6">
                                    <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-[#F97316] font-black shadow-lg">
                                        {review.first_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">{review.first_name} {review.last_name?.charAt(0)}.</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={12} className={s <= review.rating ? "text-[#F97316] fill-[#F97316]" : "text-slate-200"} />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                                        <Package size={14} className="text-[#F97316]" />
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{review.product_name}</span>
                                    </div>
                                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] border border-emerald-100 px-3 py-1 rounded-full">Verified Buyer</span>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-8 rounded-[1.8rem] border border-slate-50 mb-8">
                                <p className="text-slate-600 text-sm font-medium leading-relaxed italic">"{review.comment || "No comment."}"</p>
                            </div>

                            <AnimatePresence>
                                {replyingTo === review.id ? (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-col items-end gap-4 mt-6">
                                        <textarea 
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="WRITE A REPLY..."
                                            className="w-full p-6 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none focus:border-[#F97316] focus:bg-white transition-all min-h-[120px]"
                                        />
                                        <div className="flex gap-4">
                                            <button onClick={() => setReplyingTo(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
                                            <button onClick={() => handleReply(review.id)} disabled={submittingReply || !replyText.trim()} className="px-8 py-3 bg-[#F97316] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#F97316]/20">
                                                Post Reply
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : review.vendor_reply ? (
                                    <div className="bg-slate-900 p-8 rounded-[1.8rem] text-white ml-10 relative">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 bg-[#F97316] rounded-full" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#F97316]">My Response</span>
                                            </div>
                                            <button onClick={() => { setReplyingTo(review.id); setReplyText(review.vendor_reply); }} className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white">Edit</button>
                                        </div>
                                        <p className="text-sm font-medium text-slate-300 leading-relaxed italic">{review.vendor_reply}</p>
                                    </div>
                                ) : (
                                    <div className="flex justify-end">
                                        <button onClick={() => setReplyingTo(review.id)} className="px-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2">
                                            <MessageSquare size={14} /> Reply to Review
                                        </button>
                                    </div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
