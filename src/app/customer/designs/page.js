"use client";
import React, { useEffect, useState } from "react";
import { FolderHeart, Clock, ArrowRight, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * @file page.js
 * @description Saved Designs Gallery.
 * Displays a grid of user's saved customizations.
 * Allows opening designs in the editor or deleting them.
 */

const getUserIdFromToken = () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem("token");
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.userId;
    } catch (e) {
        return null;
    }
};

export default function DesignsPage() {
    const [savedDesigns, setSavedDesigns] = useState([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            // Maybe redirect or show empty? 
            return;
        }

        fetch('/api/customer/designs', {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (res.status === 401) {
                    router.push('/customer-auth/login');
                    return [];
                }
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) setSavedDesigns(data);
            })
            .catch(err => console.error("Failed to load designs", err));
    }, []);

    const [toastMessage, setToastMessage] = useState("");

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;

        const token = localStorage.getItem("token");
        fetch(`/api/customer/designs?id=${itemToDelete}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setSavedDesigns(prev => prev.filter(d => d.id !== itemToDelete));

                    // SYNC: Remove from Cart if present
                    try {
                        const userId = getUserIdFromToken();
                        const cartKey = userId ? `cart_${userId}` : 'cart';
                        const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
                        const updatedCart = cart.filter(c => c.designId !== itemToDelete);
                        if (cart.length !== updatedCart.length) {
                            localStorage.setItem(cartKey, JSON.stringify(updatedCart));
                            window.dispatchEvent(new Event('cartUpdated'));
                        }
                    } catch (e) {
                        console.error("Cart sync failed", e);
                    }

                    showToast("Design deleted permanently");
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                } else {
                    showToast('Failed to delete design');
                }
            })
            .catch(err => console.error("Search failed", err));
    };

    // NO CHANGE NEEDED TO THIS FILE AS IT DOESNT SHOW BADGE
    // Logic is handled in Customize Page now.

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-10">
                    <div className="w-14 h-14 bg-[#ff6b00] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20">
                        <FolderHeart className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">SAVED DESIGNS</h1>
                        <p className="text-slate-500 font-medium">Your collection of custom jackets</p>
                    </div>
                </div>

                {savedDesigns.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-16 text-center shadow-sm border border-slate-200">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FolderHeart className="w-10 h-10 text-slate-400 opacity-50" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">No Designs Yet</h2>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">
                            Start customizing your perfect jacket and save your progress to see it here.
                        </p>
                        <Link
                            href="/customer/customize"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-[#18181b] hover:bg-black text-white font-bold rounded-xl transition-all hover:scale-105 shadow-xl"
                        >
                            Start Customizing <ArrowRight size={18} />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedDesigns.map((design) => (
                            <div key={design.id} className="bg-white rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all group border border-slate-200 flex flex-col">
                                <div className="h-64 bg-slate-50 relative p-6 flex items-center justify-center">

                                    <img
                                        src={design.previewImage || design.preview}
                                        alt={design.name}
                                        className="w-full h-full object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-x-0 bottom-4 px-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link href={`/customer/customize?id=${design.id}`} className="bg-[#ff6b00] text-white px-5 py-2 rounded-xl font-bold font-mono text-xs shadow-lg hover:bg-[#e66000] transition-colors">
                                            OPEN EDITOR
                                        </Link>
                                        <button
                                            onClick={() => {
                                                setItemToDelete(design.id);
                                                setIsDeleteModalOpen(true);
                                            }}
                                            className="bg-white text-red-500 p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-all shadow-lg border border-slate-100"
                                            title="Delete Design"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6 bg-white relative z-10 flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2">{design.name}</h3>
                                        <div className="flex gap-2 mb-4">
                                            <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-500 uppercase tracking-wide">
                                                {design.color} Leather
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                                        <div>
                                            <div className="text-xs font-medium text-slate-400">ID: {design.id.slice(0, 8)}...</div>
                                            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                <Clock size={10} />
                                                {(() => {
                                                    try {
                                                        const date = new Date(design.createdAt || design.created_at);
                                                        return isNaN(date.getTime()) ? 'Just now' : date.toLocaleString();
                                                    } catch (e) {
                                                        return 'Just now';
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">Custom</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Delete Modal */}
            <AnimatePresence>
                {isDeleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white border border-slate-200 p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl"
                        >
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Design?</h3>
                            <p className="text-slate-500 mb-8">Are you sure you want to delete this design? This action cannot be undone.</p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 py-3 px-6 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-3 px-6 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-900/10"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 right-6 bg-white text-slate-900 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-200 z-50"
                    >
                        <Trash2 className="w-5 h-5 text-red-500" />
                        <span className="font-bold text-sm tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
