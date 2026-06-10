"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Check, ShoppingBag, ShoppingCart, CheckCircle, Ruler, Info, X, Star, User, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/app/context/CartContext";

export default function ProductDetailPage() {
    const router = useRouter();
    const { id } = useParams();
    const { addToCart } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toastMessage, setToastMessage] = useState("");
    const [activeModal, setActiveModal] = useState(null); // 'size' or 'material'
    
    // Review State
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ averageRating: 0, reviewCount: 0 });
    const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);
    const [submittingReview, setSubmittingReview] = useState(false);
    const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
    const [customerId, setCustomerId] = useState(null);

    useEffect(() => {
        if (!id) return;
        
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/public/products/${id}`);
                if (!res.ok) throw new Error("Product not found");
                const data = await res.json();
                setProduct(data);
                
                // Fetch Reviews & Stats
                const revRes = await fetch(`/api/public/reviews/${id}`);
                if (revRes.ok) {
                    const revData = await revRes.json();
                    setReviews(revData.reviews || []);
                    setReviewStats(revData.stats || { averageRating: 0, reviewCount: 0 });
                }

                // Check if Verified Buyer (only if logged in)
                const token = localStorage.getItem("token");
                if (token) {
                    const orderRes = await fetch(`/api/customer/orders/my`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (orderRes.ok) {
                        const orders = await orderRes.json();
                        // Find if any delivered order has this product
                        const hasPurchased = orders.some(o => 
                            (o.status === 'delivered' || o.status === 'completed') && 
                            o.items.some(item => item.design_id == id)
                        );
                        setIsVerifiedBuyer(hasPurchased);
                    }

                    // Also fetch profile for customerId to handle "already reviewed" state
                    const profileRes = await fetch("/api/customer/profile", {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (profileRes.ok) {
                        const profileData = await profileRes.json();
                        setCustomerId(profileData.customer_id);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    // Populate existing review for editing
    useEffect(() => {
        if (reviews.length > 0 && customerId) {
            const existing = reviews.find(r => r.customer_id === customerId);
            if (existing) {
                setNewReview({ rating: existing.rating, comment: existing.comment });
            }
        }
    }, [reviews, customerId]);

    const existingUserReview = reviews.find(r => r.customer_id === customerId);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        const token = localStorage.getItem("token");
        
        try {
            const res = await fetch('/api/customer/reviews', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: id,
                    rating: newReview.rating,
                    reviewText: newReview.comment
                })
            });

            const data = await res.json();
            if (res.ok) {
                setToastMessage(existingUserReview ? "Review updated! Thank you." : "Review submitted! Thank you.");
                // We don't reset the form if it's an update, so they can see their edited text.
                if (!existingUserReview) {
                    setNewReview({ rating: 5, comment: "" });
                }
                // Refresh reviews
                const revRes = await fetch(`/api/public/reviews/${id}`);
                const revData = await revRes.json();
                setReviews(revData.reviews || []);
                setReviewStats(revData.stats || { averageRating: 0, reviewCount: 0 });
            } else {
                setToastMessage(data.message || data.error || "Failed to submit review");
                setTimeout(() => setToastMessage(""), 3000);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSubmittingReview(false);
        }
    };

    const handleAddToCart = () => {
        if (!product) return;
        addToCart({
            id: `ready_${product.id}`, 
            rawId: product.id,
            title: product.name,
            price: Number(product.price),
            image: product.image,
            color: "Standard",
            material: "Leather",
            isCustom: false
        });

        setToastMessage(`${product.name} added to cart!`);
        setTimeout(() => setToastMessage(""), 3000);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
    );

    if (!product) return <div className="p-10 text-center">Product not found.</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

            <div className="max-w-6xl mx-auto px-6 pt-6">
                <button
                    onClick={() => router.push('/customer/shop')}
                    className="flex items-center gap-2 text-slate-500 hover:text-orange-600 font-bold text-sm transition-colors mb-8 group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Shop
                </button>

                <div className="grid md:grid-cols-2 gap-12 lg:gap-16">

                    {/* Left: Product Image */}
                    <div className="space-y-6">
                        <div className="aspect-[4/5] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative shadow-sm">
                            <img
                                src={product.image || '/assets/placeholder-jacket.png'}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-4 py-2 rounded-lg text-xs font-bold shadow-sm text-slate-900 border border-slate-200">
                                Ready to Ship
                            </div>
                        </div>
                    </div>

                    {/* Right: Product Info */}
                    <div className="py-2">
                        <div className="mb-8">
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">{product.category} Collection</div>
                            <h1 className="text-4xl font-black text-slate-900 mb-4">{product.name}</h1>
                            
                            {/* Dynamic Rating Summary */}
                            <div className="flex items-center gap-3 mb-6">
                               <div className="flex gap-0.5">
                                   {[1, 2, 3, 4, 5].map((s) => (
                                       <Star 
                                           key={s} 
                                           size={14} 
                                           className={s <= Math.round(reviewStats.averageRating) ? "text-amber-400" : "text-slate-200"} 
                                           fill={s <= Math.round(reviewStats.averageRating) ? "currentColor" : "none"} 
                                       />
                                   ))}
                               </div>
                               <span className="text-xs font-bold text-slate-900">{reviewStats.averageRating}</span>
                               <span className="text-slate-300">|</span>
                               <span className="text-xs font-medium text-slate-500 underline underline-offset-4 cursor-pointer" onClick={() => {
                                   document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                               }}>{reviewStats.reviewCount} Reviews</span>
                            </div>

                            <div className="flex items-center gap-4 mb-8">
                                <span className="text-3xl font-bold text-slate-900">Rs. {Number(product.price).toLocaleString("en-PK")}</span>
                                {product.stock > 0 ? (
                                    <span className="text-emerald-700 px-3 py-1 bg-emerald-50 rounded-full text-xs font-bold border border-emerald-100">In Stock</span>
                                ) : (
                                    <span className="text-red-600 px-3 py-1 bg-red-50 rounded-full text-xs font-bold border border-red-100">Out of Stock</span>
                                )}
                            </div>

                            <p className="text-slate-500 leading-relaxed text-lg">
                                {product.description || "Experience the pinnacle of craftsmanship with this pure leather masterwork. Designed for durability, style, and a perfect fit directly from our collection."}
                            </p>
                        </div>

                        {/* Guides Section */}
                        <div className="flex gap-4 mb-8">
                            <button
                                onClick={() => setActiveModal('size')}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                            >
                                <Ruler size={16} /> Size Chart
                            </button>
                            <button
                                onClick={() => setActiveModal('material')}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-orange-300 hover:text-orange-600 transition-all shadow-sm"
                            >
                                <Info size={16} /> Material Guide
                            </button>
                        </div>

                        {/* Action Area */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm">
                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <ShoppingBag size={18} /> Purchase Options
                            </h4>
                            <div className="space-y-3">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={product.stock <= 0}
                                    className="w-full py-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-3"
                                >
                                    <ShoppingCart size={20} /> Add to Cart
                                </button>
                                <p className="text-center text-xs text-slate-400 pt-2">
                                    * This item is pre-designed and cannot be customized.
                                </p>
                            </div>
                        </div>

                        {/* Simple Features List */}
                        <div className="space-y-4 pt-4 border-t border-slate-200">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                                    <Check size={16} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-sm text-slate-900">Premium Leather</h5>
                                    <p className="text-xs text-slate-500">100% Authentic Full-Grain</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                                    <Check size={16} />
                                </div>
                                <div>
                                    <h5 className="font-bold text-sm text-slate-900">Fast Shipping</h5>
                                    <p className="text-xs text-slate-500">Dispatched within 24 hours</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dynamic Reviews Section */}
            <div id="reviews-section" className="max-w-6xl mx-auto px-6 mt-24">
               <div className="border-t border-slate-200 pt-16">
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 mb-16">
                       <div className="md:w-1/3">
                           <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Customer Reviews</h2>
                           <div className="flex items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-200 mb-6 shadow-sm">
                               <div className="text-left">
                                   <p className="text-4xl font-black text-slate-900 leading-none">{reviewStats.averageRating}</p>
                                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Aggregated Rating</p>
                               </div>
                               <div className="flex gap-0.5">
                                   {[1, 2, 3, 4, 5].map((s) => (
                                       <Star 
                                           key={s} 
                                           size={18} 
                                           className={s <= Math.round(reviewStats.averageRating) ? "text-amber-400" : "text-slate-200"} 
                                           fill={s <= Math.round(reviewStats.averageRating) ? "currentColor" : "none"} 
                                       />
                                   ))}
                               </div>
                           </div>
                           <p className="text-slate-500 text-sm font-medium leading-relaxed italic">
                               "Real feedback from verified Stitch owners. We maintain high integrity through verified-buyer only reviews."
                           </p>
                       </div>

                       {/* Review Submission Form (Verified Buyers Only) */}
                       <div className="flex-1">
                           {isVerifiedBuyer ? (
                               <div className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-100 shadow-sm">
                                   <h3 className="text-xl font-black text-orange-900 mb-6 flex items-center gap-2">
                                       <CheckCircle size={20} className="text-orange-600" /> Share Your Experience
                                   </h3>
                                   <form onSubmit={handleSubmitReview} className="space-y-6">
                                       <div>
                                           <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-3">Rating</label>
                                           <div className="flex gap-2">
                                               {[1, 2, 3, 4, 5].map((s) => (
                                                   <button
                                                       key={s}
                                                       type="button"
                                                       onClick={() => setNewReview({ ...newReview, rating: s })}
                                                       className={`p-2 rounded-xl transition-all border ${newReview.rating >= s ? 'bg-orange-600 text-white shadow-lg border-orange-600' : 'bg-white text-orange-200 border-orange-100'}`}
                                                   >
                                                       <Star size={20} fill={newReview.rating >= s ? "currentColor" : "none"} />
                                                   </button>
                                               ))}
                                           </div>
                                       </div>
                                       <div>
                                            <label className="block text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-3">Written Feedback</label>
                                            <textarea
                                                value={newReview.comment}
                                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                                placeholder="What did you love about the fit, material, or finish?"
                                                className="w-full bg-white border border-orange-100 rounded-2xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all min-h-[120px]"
                                                required
                                            />
                                        </div>
                                       <button
                                           type="submit"
                                           disabled={submittingReview}
                                           className="w-full py-4 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-black rounded-xl shadow-xl hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-3"
                                       >
                                           {submittingReview ? <div className="w-5 h-5 border-2 border-zinc-800/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                                           {existingUserReview ? "Update Verified Review" : "Submit Verified Review"}
                                       </button>
                                   </form>
                               </div>
                           ) : (
                               <div className="h-full bg-slate-50 border border-dashed border-slate-300 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center">
                                   <ShieldCheck size={48} className="text-slate-300 mb-6" />
                                   <h4 className="text-lg font-bold text-slate-900 mb-2">Verified Reviews Only</h4>
                                   <p className="text-sm text-slate-500 max-w-sm">
                                       To ensure absolute authenticity, reviews are restricted to customers who have purchased and received this specific item.
                                   </p>
                               </div>
                           )}
                       </div>
                   </div>

                   {/* Review List */}
                   <div className="grid md:grid-cols-2 gap-6">
                       {reviews.length === 0 ? (
                           <div className="col-span-full py-20 text-center">
                               <MessageSquare size={32} className="mx-auto text-slate-300 mb-4" />
                               <p className="text-slate-500 font-medium italic">No reviews yet for this masterpiece. Be the first to share your thoughts!</p>
                           </div>
                       ) : (
                           reviews.map((r) => (
                               <div key={r.id} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                   <div className="flex justify-between items-start mb-6">
                                       <div className="flex items-center gap-3">
                                           <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-600 font-black">
                                               {(r.first_name || "C").charAt(0)}
                                           </div>
                                           <div>
                                               <p className="text-sm font-black text-slate-900">{r.first_name} {(r.last_name || "").charAt(0)}.</p>
                                               <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-full">
                                                   <CheckCircle size={10} /> Verified Purchase
                                               </div>
                                           </div>
                                       </div>
                                       <div className="flex gap-0.5">
                                           {[1, 2, 3, 4, 5].map((s) => (
                                               <Star 
                                                   key={s} 
                                                   size={12} 
                                                   className={s <= r.rating ? "text-amber-400" : "text-slate-200"} 
                                           fill={s <= r.rating ? "currentColor" : "none"} 
                                               />
                                           ))}
                                       </div>
                                   </div>
                                    <p className="text-slate-600 text-sm leading-relaxed mb-4 italic">
                                        "{r.comment || "No comment provided."}"
                                    </p>
                                    
                                    {r.vendor_reply && (
                                        <div className="mb-4 bg-orange-50/50 p-5 rounded-2xl border border-orange-100/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-[8px] font-black uppercase">V</div>
                                                <span className="text-[10px] font-black text-orange-900 uppercase tracking-widest">Artisan Response</span>
                                            </div>
                                            <p className="text-orange-800 text-xs leading-relaxed italic">
                                                {r.vendor_reply}
                                            </p>
                                        </div>
                                    )}

                                    <p className="text-[10px] font-bold text-slate-400">
                                        {new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                           ))
                       )}
                   </div>
               </div>
            </div>


            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 right-6 bg-white text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-200 z-50"
                    >
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="font-bold text-sm tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {activeModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200"
                        >
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    {activeModal === 'size' ? 'Universal Size Chart' : 'Premium Material Guide'}
                                </h3>
                                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <div className="p-8">
                                {activeModal === 'size' ? (
                                    <div className="space-y-6">
                                        <p className="text-sm text-slate-500">All measurements are in inches. For the best fit, measure yourself over a thin layer of clothing.</p>
                                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Size</th>
                                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Chest</th>
                                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Waist</th>
                                                        <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Sleeve</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {['S', 'M', 'L', 'XL', 'XXL'].map((size, i) => (
                                                        <tr key={size} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-4 font-bold text-slate-900">{size}</td>
                                                            <td className="p-4 text-slate-500 text-sm">{36 + i * 2}" - {38 + i * 2}"</td>
                                                            <td className="p-4 text-slate-500 text-sm">{30 + i * 2}" - {32 + i * 2}"</td>
                                                            <td className="p-4 text-slate-500 text-sm">{33 + i * 0.5}"</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex gap-6 items-start">
                                            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                                                <Info size={32} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 mb-2">100% Genuine Full-Grain Leather</h4>
                                                <p className="text-sm text-slate-500 leading-relaxed">
                                                    We use only the highest quality top-layer leather. It is durable, breathable, and develops a beautiful patina over time.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                <h5 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-3">Care Instructions</h5>
                                                <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
                                                    <li>Keep away from direct heat and moisture</li>
                                                    <li>Use a specialized leather conditioner every 6 months</li>
                                                    <li>Wipe with a soft, dry cloth only</li>
                                                </ul>
                                            </div>
                                            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                                <h5 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-3">Inner Lining</h5>
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    Soft viscose quilted lining for maximum comfort and warmth without the bulk.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                                >
                                    Got it, thanks!
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
