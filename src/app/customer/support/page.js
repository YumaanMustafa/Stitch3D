"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, MessageCircle, Mail, ChevronDown, ChevronUp,
    Package, RefreshCcw, FileText, User, ShoppingBag, Truck,
    ArrowRight, ShieldCheck, MapPin, Zap, X
} from "lucide-react";
import Modal from "../../components/Modal";

const SUPPORT_CATEGORIES = [
    {
        id: "orders",
        title: "Orders & Shipping",
        icon: Truck,
        description: "Track packages, edit orders, or shipping info.",
        faqs: [
            { q: "Where is my order?", a: "You can track your order status in real-time from your Order History page. Tracking numbers are updated as soon as they ship." },
            { q: "Can I cancel my order?", a: "Yes, you can cancel your order within 1 hour of placement directly from the Orders page." },
            { q: "Do you ship internationally?", a: "Yes, we ship to over 100 countries. Shipping rates are calculated at checkout." }
        ]
    },
    {
        id: "returns",
        title: "Returns & Refunds",
        icon: RefreshCcw,
        description: "Return policies, labels, and refund status.",
        faqs: [
            { q: "What is your return policy?", a: "We offer a 30-day return policy for all unworn items in original packaging." },
            { q: "How do I print a return label?", a: "Go to your Order History, select the item, and click 'Return Item' to generate a prepaid label." },
            { q: "When will I get my refund?", a: "Refunds are processed within 5-7 business days after we receive your return." }
        ]
    },
    {
        id: "products",
        title: "Product & Sizing",
        icon: ShoppingBag,
        description: "Size guides, fabrics, and care instructions.",
        faqs: [
            { q: "How do I find my size?", a: "Check our detailed Size Guide available on every product page for accurate measurements." },
            { q: "Are the leather jackets real leather?", a: "Yes, we use 100% premium full-grain leather for all our signature jackets." }
        ]
    },
    {
        id: "account",
        title: "Account & Security",
        icon: ShieldCheck,
        description: "Login helper, safety, and profile settings.",
        faqs: [
            { q: "I forgot my password", a: "Use the 'Forgot Password' link on the login page to receive a reset link via email." },
            { q: "How do I change my email?", a: "You can update your email address in the Profile Settings section." }
        ]
    }
];

export default function SupportPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("orders");
    const [openFaqIndex, setOpenFaqIndex] = useState(null);
    const [popup, setPopup] = useState(null);
    const [isComplaintFormOpen, setIsComplaintFormOpen] = useState(false);
    const [complaintData, setComplaintData] = useState({ type: "order", subject: "", message: "", orderId: "" });
    const [submitting, setSubmitting] = useState(false);

    const showFeaturePopup = (feature) => {
        setPopup(`${feature} feature coming soon!`);
        setTimeout(() => setPopup(null), 4000);
    };

    const toggleFaq = (idx) => {
        setOpenFaqIndex(openFaqIndex === idx ? null : idx);
    };

    // Filter logic: If searching, search ALL FAQs. If not, show active category.
    const displayedFaqs = searchTerm
        ? SUPPORT_CATEGORIES.flatMap(c => c.faqs.map(f => ({ ...f, category: c.title }))).filter(f =>
            f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.a.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : SUPPORT_CATEGORIES.find(c => c.id === activeCategory)?.faqs || [];

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

            {/* --- POPUP NOTIFICATION --- */}
            <AnimatePresence>
                {popup && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="fixed bottom-10 right-10 z-[300] bg-white text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-100"
                    >
                        <div className="w-2 h-2 bg-[#F97316] rounded-full animate-pulse shadow-[0_0_10px_rgba(249,115,22,0.3)]"></div>
                        <span className="font-bold text-sm tracking-wide">{popup}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- HERO SECTION --- */}
            <section className="relative bg-white pt-24 pb-32 overflow-hidden rounded-b-[40px] shadow-sm border-b border-slate-100">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-[0.03] pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-[#F97316] rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#F97316] rounded-full blur-[100px]"></div>
                </div>

                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-[#F97316] text-xs font-bold uppercase tracking-widest mb-6 border border-orange-100"
                    >
                        <Zap size={12} /> Support Center
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-black text-[#1E293B] mb-6 leading-tight tracking-tight"
                    >
                        How can we <span className="text-[#F97316]">help you?</span>
                    </motion.h1>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative max-w-2xl mx-auto group"
                    >
                        <div className="absolute inset-0 bg-[#F97316]/5 rounded-2xl blur-xl group-focus-within:bg-[#F97316]/10 transition-all"></div>
                        <div className="relative bg-white border border-slate-200 rounded-2xl p-2 flex items-center shadow-lg shadow-slate-200/50">
                            <Search className="text-slate-400 ml-4 w-6 h-6" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search for answers (e.g., 'return policy')"
                                className="w-full bg-transparent border-none text-slate-900 placeholder-slate-400 px-4 py-3 focus:outline-none text-lg font-medium"
                            />
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* --- QUICK CATEGORIES --- */}
            <section className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {SUPPORT_CATEGORIES.map((cat, idx) => {
                        const isActive = activeCategory === cat.id && !searchTerm;
                        return (
                            <motion.button
                                key={cat.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + idx * 0.1 }}
                                onClick={() => {
                                    setSearchTerm("");
                                    setActiveCategory(cat.id);
                                    setOpenFaqIndex(null);
                                }}
                                className={`text-left p-6 rounded-3xl border transition-all duration-300 group
                  ${isActive
                                        ? "bg-white border-[#F97316] shadow-xl shadow-orange-500/10 ring-4 ring-orange-500/5 translate-y-[-5px]"
                                        : "bg-white border-slate-100 shadow-md hover:border-orange-200 hover:shadow-xl"
                                    }`}
                            >
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
                  ${isActive ? "bg-[#F97316] text-white rotate-6" : "bg-slate-50 text-slate-400 group-hover:bg-orange-50 group-hover:text-[#F97316]"}
                `}>
                                    <cat.icon size={28} />
                                </div>
                                <h3 className={`text-lg font-bold mb-2 ${isActive ? "text-slate-900" : "text-slate-600"}`}>{cat.title}</h3>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">{cat.description}</p>
                            </motion.button>
                        )
                    })}
                </div>
            </section>

            {/* --- FAQ SECTION --- */}
            <section className="max-w-4xl mx-auto px-6 py-24">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-black text-[#1E293B] mb-4">
                        {searchTerm ? `Results for "${searchTerm}"` : `Common questions about ${SUPPORT_CATEGORIES.find(c => c.id === activeCategory)?.title}`}
                    </h2>
                    <p className="text-slate-500 font-medium">Everything you need to know to get the most out of Stitch.</p>
                </div>

                <motion.div layout className="space-y-4">
                    {displayedFaqs.length > 0 ? (
                        displayedFaqs.map((faq, idx) => {
                            const isOpen = openFaqIndex === idx;
                            return (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    key={idx}
                                    className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-orange-200 shadow-lg ring-4 ring-orange-50' : 'border-slate-100 hover:border-orange-100 shadow-sm'}`}
                                >
                                    <button
                                        onClick={() => toggleFaq(idx)}
                                        className="w-full flex items-center justify-between p-6 text-left"
                                    >
                                        <div>
                                            {searchTerm && <span className="text-xs font-bold text-[#F97316] uppercase tracking-wider mb-1 block">{faq.category}</span>}
                                            <span className={`font-bold text-lg transition-colors ${isOpen ? 'text-[#F97316]' : 'text-slate-700'}`}>{faq.q}</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'rotate-180 bg-orange-100 text-[#F97316]' : 'bg-slate-50 text-slate-400'}`}>
                                            <ChevronDown size={18} />
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                            >
                                                <div className="px-6 pb-6 pt-0 text-slate-600 font-medium leading-relaxed border-t border-slate-50 mt-2 pt-4">
                                                    {faq.a}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )
                        })
                    ) : (
                        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                <Search size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">No results found</h3>
                            <p className="text-slate-500 font-medium">Try adjusting your search terms.</p>
                        </div>
                    )}
                </motion.div>
            </section>

            {/* --- CONTACT CTA --- */}
            <section className="px-6 pb-12">
                <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] p-8 md:p-16 text-center shadow-xl border border-slate-100 relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 opacity-50"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2 opacity-50"></div>

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-black text-[#1E293B] mb-6 tracking-tight">Still can't find what you're looking for?</h2>
                        <p className="text-slate-500 text-lg mb-10 max-w-2xl mx-auto font-medium">
                            Our expert support team is here to help you with any technical implementation or account issues.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button
                                onClick={() => setIsComplaintFormOpen(true)}
                                className="w-full sm:w-auto px-10 py-4 bg-[#1E293B] text-white rounded-2xl font-bold hover:bg-[#0F172A] transition-all flex items-center justify-center gap-2 group shadow-xl hover:shadow-[#1E293B]/20"
                            >
                                <FileText size={20} className="group-hover:scale-110 transition-transform" />
                                Generate Complaint
                            </button>
                            <button
                                onClick={() => showFeaturePopup("Live Chat")}
                                className="w-full sm:w-auto px-10 py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold hover:border-orange-200 hover:bg-orange-50 hover:text-[#F97316] transition-all flex items-center justify-center gap-2 group shadow-sm"
                            >
                                <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                                Start Live Chat
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- COMPLAINT FORM MODAL --- */}
            <Modal
                isOpen={isComplaintFormOpen}
                onClose={() => setIsComplaintFormOpen(false)}
                title="New Support Complaint"
                maxWidth="max-w-xl"
            >

                <form className="space-y-6" onSubmit={async (e) => {
                    e.preventDefault();
                    setSubmitting(true);
                    try {
                        const token = localStorage.getItem("token");
                        const res = await fetch("/api/customer/complaints", {
                            method: "POST",
                            headers: { 
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify(complaintData)
                        });
                        if (res.ok) {
                            setPopup("Complaint submitted successfully!");
                            setIsComplaintFormOpen(false);
                            setComplaintData({ type: "order", subject: "", message: "", orderId: "" });
                        } else {
                            throw new Error("Failed to submit complaint");
                        }
                    } catch (err) {
                        setPopup("Error submitting complaint. Please try again.");
                    } finally {
                        setSubmitting(false);
                    }
                }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Issue Type</label>
                            <select 
                                value={complaintData.type}
                                onChange={(e) => setComplaintData({...complaintData, type: e.target.value})}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all cursor-pointer appearance-none"
                            >
                                <option value="order">Order Issue</option>
                                <option value="vendor">Vendor/Seller</option>
                                <option value="technical">Technical Error</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Order ID (Optional)</label>
                            <input 
                                type="text"
                                placeholder="e.g. ORD-123"
                                value={complaintData.orderId}
                                onChange={(e) => setComplaintData({...complaintData, orderId: e.target.value})}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Subject</label>
                            <input 
                                type="text"
                                required
                                placeholder="Brief summary of the issue"
                                value={complaintData.subject}
                                onChange={(e) => setComplaintData({...complaintData, subject: e.target.value})}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all"
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Description</label>
                            <textarea 
                                required
                                rows={4}
                                placeholder="Please provide details about your concern..."
                                value={complaintData.message}
                                onChange={(e) => setComplaintData({...complaintData, message: e.target.value})}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 placeholder-slate-400 outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button 
                            type="button"
                            onClick={() => setIsComplaintFormOpen(false)}
                            className="px-6 py-3 rounded-2xl text-slate-400 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={submitting}
                            className="px-8 py-3 rounded-2xl bg-[#F97316] text-white font-bold text-sm hover:bg-[#e66000] shadow-lg shadow-orange-500/20 transition-all disabled:opacity-70 flex items-center gap-2 group"
                        >
                            {submitting ? "Submitting..." : "Send Complaint"}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
