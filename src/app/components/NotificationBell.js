"use client";

// Import React hooks needed for tracking component state, side effects, and references
import React, { useState, useEffect, useRef } from "react";
// Import various icons from lucide-react used to represent different notification types
import { Bell, Check, Clock, AlertCircle, ShoppingBag, MessageSquare, Info } from "lucide-react";
// Import Framer Motion for smooth opening/closing animations of the notification panel
import { motion, AnimatePresence } from "framer-motion";
// Import Next.js router to navigate the user to the correct page when they click a notification
import { useRouter } from "next/navigation";

/**
 * File: NotificationBell.js
 * Description: Notification bell component used in the top navigation bar.
 * It polls the server for new notifications, displays an unread count badge,
 * and shows a dropdown menu with a list of recent alerts.
 * Also shows small toast popups in the bottom corner for new notifications.
 */

// NotificationBell accepts two props:
// role: "customer", "vendor", "supplier", or "admin"
// tokenKey: The name of the key used to store the authentication token in localStorage (e.g. 'vendorToken')
export default function NotificationBell({ role, tokenKey }) {
    const router = useRouter(); // Tool to change pages

    // ==========================================
    // STATE MANAGEMENT
    // ==========================================
    const [isOpen, setIsOpen] = useState(false);             // Controls if the dropdown panel is open
    const [notifications, setNotifications] = useState([]);  // List of all notifications fetched from server
    const [unreadCount, setUnreadCount] = useState(0);       // Number shown in the red badge on the bell
    const [popups, setPopups] = useState([]);                // Temporary floating notifications (toasts) shown at the bottom
    const [mounted, setMounted] = useState(false);           // Prevents rendering issues before component is fully loaded on client

    // ==========================================
    // REFS
    // ==========================================
    const bellRef = useRef(null);                            // Reference to the bell icon button itself
    const lastNotifRef = useRef(null);                       // Stores the ID of the most recent notification to detect new ones

    // ==========================================
    // FUNCTION: FETCH NOTIFICATIONS
    // ==========================================
    // Calls the backend API to get the latest notifications for the logged-in user
    const fetchNotifications = async () => {
        try {
            // Get the security token from browser storage
            const token = localStorage.getItem(tokenKey);
            if (!token) return; // If not logged in, stop here

            // Call the API endpoint
            const res = await fetch("/api/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                
                // If there are any notifications, check if any of them are brand new
                if (data.length > 0) {
                    const latestId = data[0].id; // The newest notification is always first

                    // If this ID is newer than the last one we saw, it means new alerts just arrived
                    if (lastNotifRef.current !== null && latestId > lastNotifRef.current) {
                        // Filter out only the brand new ones
                        const newNotifs = data.filter(n => n.id > lastNotifRef.current);
                        
                        // For each new notification, trigger a popup toast at the bottom of the screen
                        newNotifs.forEach(n => {
                            const popupId = Date.now() + Math.random(); // Generate a unique ID for the popup
                            setPopups(prev => [...prev, { ...n, popupId }]);
                            
                            // Automatically hide the popup after 5 seconds
                            setTimeout(() => {
                                setPopups(prev => prev.filter(p => p.popupId !== popupId));
                            }, 5000);
                        });
                    }
                    // Update our memory of the newest notification ID
                    lastNotifRef.current = latestId;
                }

                // Update the state with the full list and count how many are unread
                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    // ==========================================
    // EFFECT: START POLLING
    // ==========================================
    // Runs when the component loads. Fetches notifications immediately, then sets up a timer
    // to check for new ones every 10 seconds.
    useEffect(() => {
        setMounted(true);
        fetchNotifications();
        
        // setInterval runs the function repeatedly every 10000 milliseconds (10 seconds)
        const interval = setInterval(fetchNotifications, 10000); 
        
        // Cleanup function: stops the timer when the user leaves the page
        return () => clearInterval(interval);
    }, [tokenKey]);

    // ==========================================
    // FUNCTION: MARK AS READ
    // ==========================================
    // Tells the database that the user has seen a specific notification (or all of them)
    const markAsRead = async (id = null) => {
        try {
            const token = localStorage.getItem(tokenKey);
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                },
                // If id is provided, marks just that one. If id is null, marks all as read.
                body: JSON.stringify({ id, markAllAsRead: !id })
            });
            // Refresh the list to update the unread count
            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark read:", err);
        }
    };

    // ==========================================
    // HELPER: GET ICON
    // ==========================================
    // Returns a different visual icon based on the type of notification
    const getIcon = (type) => {
        switch (type) {
            case 'order': return <ShoppingBag size={14} className="text-indigo-500" />;
            case 'message': return <MessageSquare size={14} className="text-blue-500" />;
            case 'alert': return <AlertCircle size={14} className="text-rose-500" />;
            default: return <Info size={14} className="text-slate-400" />;
        }
    };

    // ==========================================
    // HELPER: GET ROUTE
    // ==========================================
    // Analyzes the notification text/type and decides which page the user should go to when they click it
    const getNotificationRoute = (n) => {
        const type = (n.type || "").toLowerCase();
        const title = (n.title || "").toLowerCase();

        // Vendor Routing logic
        if (role === "vendor") {
            if (title.includes("quote") || title.includes("request") || title.includes("material") || title.includes("quotation") || type === "request") {
                return "/vendor/material-requests";
            }
            if (type === "order") return "/vendor/orders";
            if (title.includes("review")) return "/vendor/reviews";
            if (title.includes("message") || type === "message") return "/vendor/messages";
        } 
        // Supplier Routing logic
        else if (role === "supplier") {
            if (type === "request" || type === "order" || title.includes("request") || title.includes("material") || title.includes("quotation")) {
                return "/supplier/vendor-requests";
            }
            if (title.includes("message") || type === "message") return "/supplier/messages";
        } 
        // Customer Routing logic
        else if (role === "customer") {
            if (type === "order" || type === "status") return "/customer/orders";
            if (title.includes("complaint")) return "/customer/complaints";
        } 
        // Admin Routing logic
        else if (role === "admin") {
            if (title.includes("complaint")) return "/admin/complaints";
        }
        
        // Default fallback: just go to their dashboard
        return `/${role}/dashboard`;
    };

    // ==========================================
    // ACTION: HANDLE CLICK
    // ==========================================
    // Called when the user clicks a specific notification in the dropdown
    const handleNotificationClick = async (n) => {
        // If it's unread, mark it as read first
        if (!n.is_read) {
            await markAsRead(n.id);
        }
        setIsOpen(false); // Close the dropdown menu
        const route = getNotificationRoute(n); // Figure out where to send them
        window.location.href = route; // Navigate to that page
    };

    // ==========================================
    // RENDER COMPONENT
    // ==========================================
    return (
        <div className="relative" ref={bellRef}>
            {/* The Bell Icon Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
                <Bell size={20} />
                {/* Red unread count badge (only shows if there are unread notifications) */}
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Menu Panel with Animations */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Invisible backdrop that closes the menu if you click outside of it */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[2px]" 
                            onClick={() => setIsOpen(false)} 
                        />
                        
                        {/* The actual dropdown white box */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden"
                        >
                            {/* Dropdown Header */}
                            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Notifications</h3>
                                {/* "Mark all as read" button */}
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={() => markAsRead()}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tight"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            {/* Scrollable list of notifications */}
                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                {/* Empty State: shown if list is empty */}
                                {notifications.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                            <Bell size={20} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                                    </div>
                                ) : (
                                    // List of actual notifications
                                    <div className="divide-y divide-slate-50">
                                        {/* Loop through each notification and render a clickable row */}
                                        {notifications.map((n) => (
                                            <div 
                                                key={n.id} 
                                                onClick={() => handleNotificationClick(n)}
                                                // Change background color slightly if it's unread
                                                className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                                            >
                                                {/* Notification Icon */}
                                                <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                                                
                                                {/* Notification Text */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm leading-tight mb-1 ${!n.is_read ? 'font-bold text-slate-900' : 'text-slate-600 font-medium'}`}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2 font-medium">
                                                        {n.message}
                                                    </p>
                                                    
                                                    {/* Timestamp showing when it was received */}
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        <Clock size={10} />
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                {/* Small blue dot indicator for unread messages */}
                                                {!n.is_read && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            {/* Dropdown Footer */}
                            <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stitch Alerts</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ==========================================
                FLOATING TOAST POPUPS (BOTTOM RIGHT)
                ========================================== */}
            {mounted && (
                <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                    <AnimatePresence>
                        {/* Loop through any active temporary popups and show them */}
                        {popups.map(p => (
                            <motion.div
                                key={p.popupId}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => handleNotificationClick(p)}
                                className="bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl p-4 w-80 pointer-events-auto flex gap-3 items-start cursor-pointer hover:bg-slate-50 transition-all"
                            >
                                <div className="shrink-0 mt-0.5 bg-indigo-50 p-2 rounded-full">
                                    {getIcon(p.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">New: {p.title}</h4>
                                    <p className="text-xs text-slate-600 font-medium line-clamp-2">{p.message}</p>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
