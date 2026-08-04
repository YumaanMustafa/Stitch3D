"use client";
// Import React core and hooks needed for context, state, and memoized callbacks
import React, { createContext, useContext, useState, useCallback } from "react";
// Import framer-motion for animated entry and exit of toast notifications
import { motion, AnimatePresence } from "framer-motion";
// Import icons from lucide-react to show different icons based on toast type
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

// Create the Toast Context which will hold the showToast function
// Any component wrapped inside ToastProvider can call showToast
const ToastContext = createContext(null);

// ToastProvider wraps the whole app and provides the toast system to all child components
export function ToastProvider({ children }) {
  // State array that holds all currently visible toast notifications
  const [toasts, setToasts] = useState([]);

  // showToast function: creates a new toast notification and adds it to the list
  // message: the text to display, type: 'success', 'error', or 'info', duration: how long it shows in ms
  const showToast = useCallback((message, type = "success", duration = 3000) => {
    // Use current timestamp as unique ID so each toast can be identified and removed later
    const id = Date.now().toString();
    // Add the new toast to the existing list of toasts
    setToasts((prev) => [...prev, { id, message, type }]);

    // Automatically remove this toast after the specified duration
    if (duration > 0) {
      setTimeout(() => {
        // Filter out the toast with this specific ID to remove it from the list
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  // removeToast function: manually removes a toast from the screen when user clicks X button
  const removeToast = useCallback((id) => {
    // Remove the toast that matches the given ID from the list
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    // Provide showToast to all children so any component can trigger a toast notification
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Fixed container pinned to the bottom right corner of the screen */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {/* AnimatePresence handles smooth animated entry and exit for each toast */}
        <AnimatePresence>
          {/* Loop through all current toasts and render each one */}
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Toast component: renders a single toast notification card on screen
function Toast({ toast, onClose }) {
  // Map of icon components for each type of toast notification
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    // Animated card that slides up and fades in when appearing, fades out when leaving
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="bg-white border border-slate-100 shadow-xl rounded-2xl p-4 flex items-start gap-3 pointer-events-auto min-w-[300px] max-w-sm"
    >
      {/* Icon on the left side indicating success, error, or info */}
      <div className="mt-0.5 shrink-0">{icons[toast.type] || icons.info}</div>
      {/* Toast message text */}
      <div className="flex-1">
        <p className="text-sm font-bold text-slate-900">{toast.message}</p>
      </div>
      {/* Close button that manually dismisses the toast when clicked */}
      <button
        onClick={onClose}
        className="p-1 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-slate-600 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// useToast hook: lets any component easily call showToast without importing context directly
export function useToast() {
  const context = useContext(ToastContext);
  // Throw an error if this hook is used outside of ToastProvider
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
