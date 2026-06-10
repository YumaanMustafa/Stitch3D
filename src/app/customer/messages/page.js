"use client";
import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, User, Search, RefreshCw } from "lucide-react";

export default function CustomerMessagesPage() {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    // Local user info
    const [myUserId, setMyUserId] = useState(null);

    const messagesEndRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setMyUserId(payload.userId || payload.user_id || payload.id);
            } catch (e) {}
        }
        fetchContacts();
    }, []);

    useEffect(() => {
        if (selectedContact) {
            fetchMessages(selectedContact.id);
            // Polling for new messages every 5 seconds
            const interval = setInterval(() => {
                fetchMessages(selectedContact.id, true);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [selectedContact]);

    useEffect(() => {
        // Auto-scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchContacts = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch("/api/chat/contacts", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setContacts(data);
            }
        } catch (err) {
            console.error("Failed to load contacts:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (contactId, isPolling = false) => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`/api/chat/messages?contactId=${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error("Failed to load messages:", err);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedContact) return;

        const token = localStorage.getItem("token");
        setSending(true);
        try {
            const res = await fetch("/api/chat/send", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    receiver_id: selectedContact.id,
                    content: newMessage
                })
            });

            if (res.ok) {
                const newMsg = await res.json();
                setMessages(prev => [...prev, {
                    message_id: newMsg.message_id,
                    sender_id: newMsg.sender_id,
                    receiver_id: selectedContact.id,
                    content: newMsg.content,
                    created_at: newMsg.created_at
                }]);
                setNewMessage("");
            }
        } catch (err) {
            console.error("Failed to send message:", err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-160px)] bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
            {/* Sidebar - Contacts List */}
            <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/50">
                <div className="p-6 border-b border-slate-100 bg-white">
                    <h2 className="text-xl font-black text-[#1E293B] tracking-tight uppercase mb-4">Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search conversations..." 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#F97316] transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-12 flex justify-center"><RefreshCw className="w-6 h-6 animate-spin text-orange-500" /></div>
                    ) : contacts.length === 0 ? (
                        <div className="p-12 text-center">
                            <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No conversations</p>
                        </div>
                    ) : (
                        contacts.map(contact => (
                            <button
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={`w-full p-5 flex items-center gap-4 transition-all border-b border-slate-50 hover:bg-white ${selectedContact?.id === contact.id ? 'bg-white shadow-[inset_4px_0_0_0_#F97316]' : ''}`}
                            >
                                <div className="relative shrink-0">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-[#F97316] flex items-center justify-center font-black text-lg">
                                        {contact.company_name?.[0]?.toUpperCase() || contact.first_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <h3 className={`font-bold truncate ${selectedContact?.id === contact.id ? 'text-[#F97316]' : 'text-[#1E293B]'}`}>
                                        {contact.company_name || `${contact.first_name} ${contact.last_name}`}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Official Vendor</p>
                                </div>
                                {contact.unread_count > 0 && (
                                    <div className="w-5 h-5 bg-[#F97316] rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0">
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
                {selectedContact ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#1E293B] text-white flex items-center justify-center font-black shadow-lg shadow-slate-200">
                                    {selectedContact.company_name?.[0]?.toUpperCase() || selectedContact.first_name?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-black text-[#1E293B] text-lg tracking-tight">
                                        {selectedContact.company_name || `${selectedContact.first_name} ${selectedContact.last_name}`}
                                    </h3>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active Now
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30 custom-scrollbar">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                        <MessageSquare size={32} className="opacity-20" />
                                    </div>
                                    <p className="text-sm font-bold uppercase tracking-widest">Start the conversation</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isMe = String(msg.sender_id) !== String(selectedContact.id);
                                    return (
                                        <div key={msg.message_id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                                                <div className={`rounded-2xl px-5 py-3 shadow-sm ${isMe 
                                                    ? 'bg-[#F97316] text-white rounded-tr-none shadow-orange-200/50' 
                                                    : 'bg-white border border-slate-100 text-[#1E293B] rounded-tl-none shadow-slate-100'}`}>
                                                    <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                                                </div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Form */}
                        <form onSubmit={sendMessage} className="p-6 bg-white border-t border-slate-100 flex gap-4">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Write your message..."
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:bg-white transition-all text-sm font-medium text-[#1E293B]"
                            />
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim() || sending}
                                className="w-14 h-14 bg-[#1E293B] hover:bg-black text-white rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 group"
                            >
                                <Send size={22} className={`transition-transform group-hover:translate-x-1 group-hover:-translate-y-1 ${sending ? "animate-pulse" : ""}`} />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/20">
                        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_10px_40px_rgba(0,0,0,0.04)] border border-slate-100 rotate-3">
                            <MessageSquare size={40} className="text-[#F97316]" />
                        </div>
                        <h2 className="text-2xl font-black text-[#1E293B] mb-2 tracking-tight uppercase">Your Studio Chat</h2>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a vendor to start discussing your project</p>
                    </div>
                )}
            </div>
        </div>
    );
}
