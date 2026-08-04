"use client";
// Import hooks for managing component state and side effects
import { useEffect, useState } from "react";
// createPortal allows rendering this modal outside the normal DOM tree, directly into document.body
import { createPortal } from "react-dom";
// Import animation utilities for smooth open and close transitions
import { motion, AnimatePresence } from "framer-motion";
// Import the X icon used for the close button
import { X } from "lucide-react";

/**
 * File: Modal.js
 * Description: A reusable dialog modal component.
 * Uses React Portal to render the modal above all other page content.
 * Accepts a title, content (children), and an onClose callback.
 */

// Modal component accepts these props:
// isOpen: whether the modal should be visible
// onClose: function to call when user closes the modal
// title: text shown in the modal header
// children: any content placed inside the modal body
// maxWidth: Tailwind class controlling the max width of the modal box
export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = "max-w-md"
}) {
    // mounted tracks whether the component has been fully loaded in the browser
    // This prevents portal rendering on the server side where document.body does not exist
    const [mounted, setMounted] = useState(false);

    // Effect hook that runs when isOpen changes
    useEffect(() => {
        // Mark the component as mounted after first render
        setMounted(true);
        if (isOpen) {
            // Prevent the page behind from scrolling while modal is open
            document.body.style.overflow = 'hidden';
        } else {
            // Restore normal scrolling when modal closes
            document.body.style.overflow = 'unset';
        }
        // Cleanup: always restore scrolling when this component unmounts
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // Do not render anything if modal is closed or component is not yet mounted in browser
    if (!isOpen || !mounted) return null;

    // Render the modal directly into document.body using a React Portal
    return createPortal(
        <AnimatePresence>
            {/* Full-screen overlay container centered both vertically and horizontally */}
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6" style={{ maxHeight: '100dvh' }}>
                {/* Semi-transparent dark backdrop that covers the page behind the modal */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
                />

                {/* The actual white modal card that slides in from below */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className={`relative z-10 bg-white rounded-2xl shadow-xl w-full ${maxWidth} overflow-hidden flex flex-col max-h-[85dvh]`}
                >
                    {/* Modal Header: shows title and close button */}
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                        {/* Close button in top-right corner */}
                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Modal Body: renders whatever content was passed as children */}
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body  // Attach the modal to document.body directly using Portal
    );
}
