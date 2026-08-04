"use client";
// Import hooks for tracking mounted state and running side effects
import { useEffect, useState } from "react";
// createPortal renders the modal outside the normal React tree, directly in document.body
import { createPortal } from "react-dom";
// Import animation libraries for smooth open and close transitions
import { motion, AnimatePresence } from "framer-motion";
// Import icons used inside the modal for visual context
import { AlertTriangle, CheckCircle, X } from "lucide-react";

/**
 * File: ConfirmationModal.js
 * Description: A reusable confirmation dialog modal.
 * Used before performing important actions like deleting or approving something.
 * Supports different visual styles based on the action type (warning, success).
 */

// ConfirmationModal component with the following props:
// isOpen: controls whether the modal is visible
// onClose: function called when the modal is dismissed
// onConfirm: function called when the user clicks the confirm button
// title: heading text shown at the top of the modal
// message: descriptive text explaining what will happen
// confirmText: label for the confirm button
// cancelText: label for the cancel button
// isDestructive: if true, styles the confirm button in red (for delete actions)
// type: visual style - 'warning', 'success', or 'info'
// hideCancel: if true, hides the cancel button (used for simple alerts)
export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmText = "Confirm",
    cancelText = "Cancel",
    isDestructive = false,
    type = "warning", // warning, success, info
    hideCancel = false
}) {
    // Track whether component has been mounted in the browser before rendering the portal
    const [mounted, setMounted] = useState(false);

    // Effect hook that runs whenever isOpen changes
    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            // Prevent background page from scrolling while the modal is open
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scrolling when modal is closed
            document.body.style.overflow = 'unset';
        }
        // Cleanup: restore scrolling when this component is removed from the screen
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Do not render if modal is closed or component has not yet been mounted
    if (!isOpen || !mounted) return null;

    // Helper function that returns the correct icon based on the modal type
    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={24} />;
            default: return <AlertTriangle size={24} />;
        }
    };

    // Helper function that returns the background and text color classes based on type
    const getColorClass = () => {
        if (isDestructive) return 'bg-red-50 text-red-600';      // Red for delete actions
        if (type === 'success') return 'bg-emerald-50 text-emerald-600'; // Green for success
        return 'bg-slate-100 text-slate-600';                    // Default neutral gray
    };

    // Render the confirmation modal into document.body using a Portal
    return createPortal(
        <AnimatePresence>
            {/* Full-screen centered overlay */}
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ maxHeight: '100dvh' }}>
                {/* Dark blurred backdrop behind the modal */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                />

                {/* White modal card that animates in from below */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85dvh]"
                >
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        {/* Icon and title row */}
                        <div className="flex items-center gap-4 mb-4">
                            {/* Colored icon indicating the type of action */}
                            <div className={`p-3 rounded-xl shrink-0 ${getColorClass()}`}>
                                {getIcon()}
                            </div>
                            <div>
                                {/* Modal title */}
                                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                                {/* Modal description message */}
                                <p className="text-sm text-slate-500 mt-1">{message}</p>
                            </div>
                        </div>

                        {/* Action buttons row */}
                        <div className={`flex gap-3 justify-end mt-6 ${hideCancel ? 'sm:justify-center' : ''}`}>
                            {/* Cancel button - only shown when hideCancel is false */}
                            {!hideCancel && (
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    {cancelText}
                                </button>
                            )}
                            {/* Confirm button - calls onConfirm then closes the modal */}
                            <button
                                onClick={() => {
                                    onConfirm();
                                    onClose();
                                }}
                                className={`px-5 py-2.5 rounded-xl text-white font-medium shadow-sm transition-transform active:scale-95 ${hideCancel ? 'w-full sm:w-auto min-w-[120px]' : ''} ${isDestructive
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#1E293B] hover:opacity-90'
                                    }`}
                            >
                                {confirmText}
                            </button>
                        </div>
                    </div>

                    {/* Close X button in the top-right corner */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body  // Mount modal directly to document.body
    );
}
