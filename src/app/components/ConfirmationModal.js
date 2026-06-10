"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, X } from "lucide-react";

/**
 * @file ConfirmationModal.js
 * @description Reusable Modal for confirmation actions (e.g., Delete, Approve) or Alerts.
 * Supports destructive actions with red styling and success actions with emerald styling.
 */

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
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={24} />;
            default: return <AlertTriangle size={24} />;
        }
    };

    const getColorClass = () => {
        if (isDestructive) return 'bg-red-50 text-red-600';
        if (type === 'success') return 'bg-emerald-50 text-emerald-600';
        return 'bg-slate-100 text-slate-600';
    };

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" style={{ maxHeight: '100dvh' }}>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[85dvh]"
                >
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-xl shrink-0 ${getColorClass()}`}>
                                {getIcon()}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                                <p className="text-sm text-slate-500 mt-1">{message}</p>
                            </div>
                        </div>

                        <div className={`flex gap-3 justify-end mt-6 ${hideCancel ? 'sm:justify-center' : ''}`}>
                            {!hideCancel && (
                                <button
                                    onClick={onClose}
                                    className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    {cancelText}
                                </button>
                            )}
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

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
}
