"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft, Filter, Sparkles, ChevronRight, ShoppingBag, Star } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Button from "@/app/components/ui/Button";

/**
 * @file page.js
 * @description Browse/Shop Page.
 * Displays a grid of available products with search and category filtering.
 * Fetches products from `/api/public/products`.
 */

export default function ShopPage() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                // Fetch all products once for instant client-side filtering
                const res = await fetch(`/api/public/products`);
                const data = await res.json();
                setProducts(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const filteredProducts = products.filter(p => {
        const matchesSearch = !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.category && p.category.toLowerCase().includes(search.toLowerCase())) ||
            (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

        const matchesCategory = filter === "All" || p.category === filter;

        return matchesSearch && matchesCategory;
    });

    const categories = ["All", ...new Set(products.map(p => p.category))].slice(0, 6);

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-20">

            <div className="max-w-7xl mx-auto px-6 py-10">

                {/* Title & Stats */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 text-orange-600 font-bold text-xs uppercase tracking-widest mb-2"
                        >
                            <Sparkles size={14} /> Premium Selection
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl font-black text-slate-900"
                        >
                            Explore Designs
                        </motion.h1>
                    </div>
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative group w-full md:w-80"
                    >
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search custom jackets..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
                        />
                    </motion.div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-10 overflow-x-auto pb-4 scrollbar-hide">
                    {categories.map((cat, idx) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${filter === cat
                                ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                {loading ? (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm h-96 flex flex-col p-3">
                                <div className="relative aspect-[4/5] bg-slate-100 rounded-[1.5rem] overflow-hidden mb-4 animate-pulse-shimmer"></div>
                                <div className="px-2 pb-2 mt-auto space-y-3">
                                    <div className="h-5 bg-slate-100 animate-pulse-shimmer rounded-md w-3/4"></div>
                                    <div className="h-4 bg-slate-100 animate-pulse-shimmer rounded-md w-1/4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {filteredProducts.map((product, idx) => (
                            <motion.div
                                key={product.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => router.push(`/customer/shop/${product.id}`)}
                                className="group bg-white rounded-[2rem] p-3 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                            >
                                <div className="relative aspect-[4/5] bg-slate-100 rounded-[1.5rem] overflow-hidden mb-4">
                                    <Image
                                        src={product.image || '/assets/placeholder-jacket.png'}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                                        className="object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    {/* Overlay Badge */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                                        <span className="bg-white/90 backdrop-blur text-slate-900 text-[10px] font-extrabold uppercase tracking-wide px-3 py-1.5 rounded-full shadow-sm">
                                            {product.category}
                                        </span>
                                    </div>
                                    {/* Hover Actions */}
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                                        <span className="bg-white/95 backdrop-blur-md text-slate-900 font-bold text-xs py-2.5 px-6 rounded-full shadow-xl flex items-center gap-2">
                                            View Details <ChevronRight size={14} />
                                        </span>
                                    </div>
                                </div>

                                <div className="px-2 pb-2 mt-auto">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight group-hover:text-orange-600 transition-colors">{product.name}</h3>

                                    {/* Dynamic Rating */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    size={10}
                                                    className={s <= Math.round(product.average_rating || 0) ? "text-amber-400" : "text-slate-200"}
                                                    fill={s <= Math.round(product.average_rating || 0) ? "currentColor" : "none"}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">({product.total_reviews || 0})</span>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Price</span>
                                            <span className="text-lg font-black text-slate-900">Rs {Number(product.price).toFixed(2)}</span>
                                        </div>
                                        <button className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                                            <ShoppingBag size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-lg mx-auto">
                        <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6 text-orange-500 shadow-inner">
                            <Search size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3">No matching designs found</h3>
                        <p className="text-slate-500 mb-8 leading-relaxed">We couldn't find any jackets matching your current search or filters. Try removing some filters or search for something else.</p>
                        <Button variant="solid" onClick={() => { setSearch(""); setFilter("All"); }}>
                            Clear All Filters
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
}
