"use client";
import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Search, RefreshCw, Box, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * @file page.js
 * @description Vendor-Supplier Inbox - Simplified Text & Modern Light Theme.
 */

export default function VendorSupplierMessagesPage() {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchContacts();
    }, []);

    useEffect(() => {
        if (selectedContact) {
            fetchMessages(selectedContact.id);
            const interval = setInterval(() => fetchMessages(selectedContact.id, true), 5000);
            return () => clearInterval(interval);
        }
    }, [selectedContact]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchContacts = async () => {
        const token = localStorage.getItem("vendorToken");
        try {
            const res = await fetch("/api/chat/contacts-supplier", { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) setContacts(await res.json());
        } catch (err) {} finally { setLoading(false); }
    };

    const fetchMessages = async (contactId, isPolling = false) => {
        const token = localStorage.getItem("vendorToken");
        try {
            const res = await fetch(`/api/chat/messages?contactId=${contactId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                if (!isPolling && data.length > 0) {
                    setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unread_count: 0 } : c));
                }
            }
        } catch (err) {}
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;
        const token = localStorage.getItem("vendorToken");
        setSending(true);
        try {
            const res = await fetch("/api/chat/send", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ receiver_id: selectedContact.id, content: newMessage })
            });
            if (res.ok) {
                const newMsg = await res.json();
                setMessages(prev => [...prev, { ...newMsg, receiver_id: selectedContact.id }]);
                setNewMessage("");
            }
        } catch (err) {} finally { setSending(false); }
    };

    const filteredContacts = contacts.filter(c => 
        (c.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (c.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.company_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-[calc(100vh-160px)] animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                   <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Suppliers</h2>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Supplier Chat</h1>
                   <p className="text-sm font-medium text-slate-500 mt-2">Chat with your materials suppliers and partners.</p>
                </div>
            </div>

            <div className="flex flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                {/* Contact List */}
                <div className="w-80 md:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50">
                    <div className="p-8 border-b border-slate-100 bg-white">
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                           <input 
                               type="text" 
                               placeholder="SEARCH SUPPLIERS..." 
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-[#F97316] transition-all"
                           />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                        {loading ? (
                            <div className="p-12 text-center animate-pulse"><RefreshCw className="w-6 h-6 animate-spin text-slate-300 mx-auto" /></div>
                        ) : filteredContacts.length === 0 ? (
                            <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">No suppliers found</div>
                        ) : (
                            filteredContacts.map(contact => (
                                <button
                                    key={contact.id}
                                    onClick={() => setSelectedContact(contact)}
                                    className={`w-full p-6 flex items-center gap-4 transition-all border-b border-slate-50 relative group ${selectedContact?.id === contact.id ? 'bg-white shadow-xl z-10' : 'hover:bg-white/60'}`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-lg transition-transform group-hover:scale-105 ${selectedContact?.id === contact.id ? 'bg-slate-900' : 'bg-[#F97316]'}`}>
                                        <Truck size={18} />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <h3 className={`text-xs font-black uppercase tracking-tighter italic truncate transition-colors ${selectedContact?.id === contact.id ? 'text-[#F97316]' : 'text-slate-900'}`}>
                                            {contact.company_name || contact.email.split('@')[0]}
                                        </h3>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Supplier</p>
                                    </div>
                                    {contact.unread_count > 0 && (
                                        <div className="w-5 h-5 bg-[#F97316] rounded-full flex items-center justify-center text-[9px] font-black text-white">
                                            {contact.unread_count}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-white">
                    <AnimatePresence mode="wait">
                        {selectedContact ? (
                            <motion.div key={selectedContact.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col h-full">
                                <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-[#F97316] font-black shadow-lg">
                                            <Box size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                                                {selectedContact.company_name || selectedContact.email.split('@')[0]}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Active</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-10 space-y-6 bg-slate-50/30 scrollbar-hide">
                                    {messages.map(msg => {
                                        const isMe = String(msg.sender_id) !== String(selectedContact.id);
                                        return (
                                            <div key={msg.message_id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[60%] rounded-[1.8rem] px-8 py-5 shadow-sm transition-all hover:shadow-md ${isMe ? 'bg-slate-900 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-900 rounded-bl-none'}`}>
                                                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                                                    <div className={`text-[8px] font-black uppercase tracking-widest mt-3 flex items-center gap-2 ${isMe ? 'text-slate-400 justify-end' : 'text-slate-300'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form onSubmit={sendMessage} className="p-8 border-t border-slate-100 flex gap-4">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="TYPE A MESSAGE..."
                                        className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] px-8 py-4 focus:outline-none focus:border-[#F97316] focus:bg-white transition-all text-[11px] font-black uppercase tracking-widest text-slate-900"
                                    />
                                    <button type="submit" disabled={!newMessage.trim() || sending} className="w-16 h-16 bg-[#F97316] text-white rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-[#F97316]/20 hover:bg-[#EA580C] transition-all disabled:opacity-50">
                                        <Send size={20} />
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-slate-100">
                                    <Box size={40} className="text-[#F97316] opacity-30" />
                                </div>
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] mb-2">No Chat Selected</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest">Select a supplier to start chatting</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
