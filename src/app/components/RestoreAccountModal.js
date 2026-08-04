"use client";
// Import React and useState to manage the restoring loading state
import React, { useState } from "react";
// Import animation utilities for smooth fade and scale transitions
import { motion, AnimatePresence } from "framer-motion";
// Import icons for visual indicators inside the modal
import { RefreshCw, X, CheckCircle, AlertTriangle } from "lucide-react";

/**
 * File: RestoreAccountModal.js
 * Description: Modal popup shown when a user logs into an account that is scheduled for deletion.
 * Gives the user the option to restore their account or continue to dashboard while deletion is still pending.
 */

// RestoreAccountModal receives:
// isOpen: whether the modal should be visible
// onClose: function to dismiss the modal (user chooses to continue to dashboard)
// onRestore: async function to call when user confirms account restoration
export default function RestoreAccountModal({ isOpen, onClose, onRestore }) {
    // Track whether the restore action is currently in progress to show loading state
    const [restoring, setRestoring] = useState(false);

    // Called when user clicks the Restore button
    // Shows loading state while the restore API call runs
    const handleRestore = async () => {
        setRestoring(true);
        // Wait for the parent-provided restore function to complete
        await onRestore();
        setRestoring(false);
    };

    return (
        // AnimatePresence allows the modal to animate out smoothly when isOpen becomes false
        <AnimatePresence>
            {isOpen && (
                // Full-screen centered overlay container
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Semi-transparent dark backdrop that closes the modal when clicked */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />
                    {/* White modal card that scales and fades in from below */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center"
                    >
                        {/* Warning icon at the top of the modal */}
                        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>
                        
                        {/* Modal heading */}
                        <h3 className="text-2xl font-black text-slate-900 mb-2">Account Recovery</h3>
                        {/* Explanation text for the user */}
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            Your account is currently scheduled for deletion. Would you like to restore it and cancel the deletion process?
                        </p>

                        {/* Action buttons stacked vertically */}
                        <div className="flex flex-col gap-3">
                            {/* Restore button: calls handleRestore and shows spinning icon while loading */}
                            <button 
                                onClick={handleRestore}
                                disabled={restoring}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {/* Spin the icon while restore is in progress */}
                                <RefreshCw size={18} className={restoring ? "animate-spin" : ""} />
                                {restoring ? "Restoring Account..." : "Restore Account Now"}
                            </button>
                            {/* Continue button: lets user skip restoration and go to dashboard */}
                            <button 
                                onClick={onClose}
                                disabled={restoring}
                                className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl transition-all"
                            >
                                Continue to Dashboard (Keep Pending)
                            </button>
                        </div>
                        
                        {/* Small warning message about grace period */}
                        <p className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Grace period ends in less than 72 hours
                        </p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
