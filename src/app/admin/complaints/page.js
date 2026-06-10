"use client";

import { useState, useEffect } from "react";
import { 
    Search, Filter, Eye, Check, RotateCcw, RefreshCw, 
    MessageSquare, AlertCircle, Calendar, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Modal from "@/app/components/Modal";

/**
 * @file page.js
 * @description Admin Complaints Management Page.
 * Mirrors the Vendor Product Catalog design for system-wide consistency.
 */

export default function AdminComplaintsPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedComplaint, setSelectedComplaint] = useState(null);

    const API_URL = "/api/admin/complaints";

    const fetchComplaints = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store'
            });

            if (!res.ok) {
                setComplaints([]);
                return;
            }

            const data = await res.json();
            setComplaints(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch complaints:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem("adminToken");
            const res = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                setComplaints(complaints.map(c => c.complaint_id === id ? { ...c, status } : c));
                setSelectedComplaint(null);
            }
        } catch (err) {
            console.error("Status update failed:", err);
        }
    };

    const filteredComplaints = complaints.filter(c => {
        const matchesStatus = filterStatus === "all" || c.status === filterStatus;
        const matchesSearch = !searchQuery || 
            c.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#1E293B]">Customer Complaints</h1>
                    <p className="text-slate-500 text-sm">Review and resolve customer support tickets.</p>
                </div>
                <button
                    onClick={fetchComplaints}
                    className="bg-[#1E293B] hover:bg-[#0F172A] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh Data
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search tickets by subject or user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316]"
                    />
                </div>
                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] cursor-pointer"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>

            {/* Complaints Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="p-5">Ticket / Subject</th>
                                <th className="p-5">User</th>
                                <th className="p-5">Type</th>
                                <th className="p-5">Date</th>
                                <th className="p-5">Status</th>
                                <th className="p-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && complaints.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Loading tickets...</td></tr>
                            ) : filteredComplaints.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">No complaints found.</td></tr>
                            ) : (
                                filteredComplaints.map((c) => (
                                    <tr key={c.complaint_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                                    <MessageSquare size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#1E293B] group-hover:text-indigo-600 transition-colors">{c.subject}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {c.complaint_id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                                    {c.user_name?.charAt(0) || "U"}
                                                </div>
                                                <span className="text-sm font-medium text-slate-600">{c.user_name || "User #"+c.user_id}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md uppercase tracking-tighter">
                                                {c.type}
                                            </span>
                                        </td>
                                        <td className="p-5 text-sm text-slate-500 font-medium">
                                            {new Date(c.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-5">
                                            <span
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border ${
                                                    c.status === 'resolved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    c.status === 'reviewed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-orange-50 text-orange-600 border-orange-100'
                                                }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    c.status === 'resolved' ? 'bg-emerald-500' :
                                                    c.status === 'reviewed' ? 'bg-blue-500' : 'bg-orange-500'
                                                }`}></span>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <button 
                                                onClick={() => setSelectedComplaint(c)}
                                                className="p-2 text-slate-400 hover:text-[#1E293B] hover:bg-slate-100 rounded-lg transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Resolution Modal */}
            <Modal
                isOpen={!!selectedComplaint}
                onClose={() => setSelectedComplaint(null)}
                title="Resolution Hub"
                maxWidth="max-w-2xl"
            >
                {selectedComplaint && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</label>
                                <p className="text-sm font-bold text-slate-800">{selectedComplaint.subject}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order ID</label>
                                <p className="text-sm font-bold text-indigo-600">{selectedComplaint.order_id || "None"}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Contact</label>
                                <p className="text-sm font-medium text-slate-600">{selectedComplaint.user_name}</p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Reported</label>
                                <p className="text-sm font-medium text-slate-600">{new Date(selectedComplaint.created_at).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detailed Description</label>
                            <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-600 leading-relaxed italic">
                                "{selectedComplaint.message}"
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-50">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateStatus(selectedComplaint.complaint_id, 'reviewed')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                                        selectedComplaint.status === 'reviewed' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <RotateCcw size={14} /> Reviewed
                                </button>
                                <button
                                    onClick={() => updateStatus(selectedComplaint.complaint_id, 'resolved')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${
                                        selectedComplaint.status === 'resolved' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <Check size={14} /> Resolved
                                </button>
                            </div>
                            <button
                                onClick={() => setSelectedComplaint(null)}
                                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#1E293B] text-white font-bold text-sm hover:bg-[#0F172A] shadow-lg transition-all"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
