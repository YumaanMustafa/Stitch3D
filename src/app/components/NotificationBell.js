"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Clock, AlertCircle, ShoppingBag, MessageSquare, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * @file NotificationBell.js
 * @description Premium notification bell with popover for all roles.
 */

export default function NotificationBell({ role, tokenKey }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [popups, setPopups] = useState([]);
    const [mounted, setMounted] = useState(false);
    const bellRef = useRef(null);
    const lastNotifRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem(tokenKey);
            if (!token) return;

            const res = await fetch("/api/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                if (data.length > 0) {
                    const latestId = data[0].id;
                    if (lastNotifRef.current !== null && latestId > lastNotifRef.current) {
                        const newNotifs = data.filter(n => n.id > lastNotifRef.current);
                        newNotifs.forEach(n => {
                            const popupId = Date.now() + Math.random();
                            setPopups(prev => [...prev, { ...n, popupId }]);
                            setTimeout(() => {
                                setPopups(prev => prev.filter(p => p.popupId !== popupId));
                            }, 5000);
                        });
                    }
                    lastNotifRef.current = latestId;
                }

                setNotifications(data);
                setUnreadCount(data.filter(n => !n.is_read).length);
            }
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    useEffect(() => {
        setMounted(true);
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [tokenKey]);

    const markAsRead = async (id = null) => {
        try {
            const token = localStorage.getItem(tokenKey);
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ id, markAllAsRead: !id })
            });
            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark read:", err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'order': return <ShoppingBag size={14} className="text-indigo-500" />;
            case 'message': return <MessageSquare size={14} className="text-blue-500" />;
            case 'alert': return <AlertCircle size={14} className="text-rose-500" />;
            default: return <Info size={14} className="text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={bellRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop for closing with blur effect */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[2px]" 
                            onClick={() => setIsOpen(false)} 
                        />
                        
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden"
                        >
                            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={() => markAsRead()}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-tight"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>

                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                                            <Bell size={20} />
                                        </div>
                                        <p className="text-xs font-bold text-slate-400">No notifications yet</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {notifications.map((n) => (
                                            <div 
                                                key={n.id} 
                                                onClick={() => !n.is_read && markAsRead(n.id)}
                                                className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!n.is_read ? 'bg-indigo-50/30' : ''}`}
                                            >
                                                <div className="mt-1 shrink-0">{getIcon(n.type)}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm leading-tight mb-1 ${!n.is_read ? 'font-bold text-slate-900' : 'text-slate-600 font-medium'}`}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2 font-medium">
                                                        {n.message}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                        <Clock size={10} />
                                                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                {!n.is_read && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stitch Alerts</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Popups for new notifications */}
            {mounted && (
                <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
                    <AnimatePresence>
                        {popups.map(p => (
                            <motion.div
                                key={p.popupId}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="bg-white/95 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl p-4 w-80 pointer-events-auto flex gap-3 items-start"
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
