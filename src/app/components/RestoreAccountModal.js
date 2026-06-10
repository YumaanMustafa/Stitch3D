"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, X, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * @file RestoreAccountModal.js
 * @description Modal for restoring an account that is pending deletion.
 */

export default function RestoreAccountModal({ isOpen, onClose, onRestore }) {
    const [restoring, setRestoring] = useState(false);

    const handleRestore = async () => {
        setRestoring(true);
        await onRestore();
        setRestoring(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
                    >
                        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Account Recovery</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Your account is currently scheduled for deletion. Would you like to restore it and cancel the deletion process?
                        </p>

                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={handleRestore}
                                disabled={restoring}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={restoring ? "animate-spin" : ""} />
                                {restoring ? "Restoring Account..." : "Restore Account Now"}
                            </button>
                            <button 
                                onClick={onClose}
                                disabled={restoring}
                                className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all"
                            >
                                Continue to Dashboard (Keep Pending)
                            </button>
                        </div>
                        
                        <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Grace period ends in less than 72 hours
                        </p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
