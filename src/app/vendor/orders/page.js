"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Eye, Edit, Calendar, Package, Truck, CheckCircle, Clock } from "lucide-react";
import Modal from "@/app/components/Modal";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import DesignViewer from "@/app/components/DesignViewer";
/**
 * @file page.js
 * @description Vendor Order Management - Simplified Text & Modern Light Theme.
 */

export default function VendorOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [newStatus, setNewStatus] = useState("");
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isDesignViewerOpen, setIsDesignViewerOpen] = useState(false);
    const [selectedDesignOrder, setSelectedDesignOrder] = useState(null);
    const [conf, setConf] = useState({ open: false, title: "", message: "", type: "warning", onConfirm: () => { }, hideCancel: false });

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = localStorage.getItem("vendorToken");
                const res = await fetch("/api/vendor/orders", { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) setOrders(await res.json());
            } catch (err) {} finally { setLoading(false); }
        };
        fetchOrders();
    }, []);

    const filteredOrders = orders.filter(order =>
        (order.id && order.id.toString().toLowerCase().includes(searchQuery.toLowerCase())) ||
        (order.customer && order.customer.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const standardOrders = filteredOrders.filter(o => !o.is_custom);
    const customOrders = filteredOrders.filter(o => o.is_custom);

    const handleStatusUpdate = async () => {
        if (!selectedOrder) return;
        try {
            const token = localStorage.getItem("vendorToken");
            const res = await fetch(`/api/vendor/orders/${selectedOrder.id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
                setStatusModalOpen(false);
            }
        } catch (err) {}
    };

    const getStatusStyle = (status) => {
        switch ((status || "").toLowerCase()) {
            case "pending": return "text-orange-500 bg-orange-50 border-orange-100";
            case "delivered": return "text-emerald-500 bg-emerald-50 border-emerald-100";
            case "cancelled": return "text-rose-500 bg-rose-50 border-rose-100";
            default: return "text-slate-900 bg-slate-100 border-slate-200";
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                   <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Sales</h2>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Order List</h1>
                   <p className="text-sm font-medium text-slate-500 mt-2">Manage customer orders and tracking status.</p>
                </div>
            </div>

            {/* Control Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input
                     type="text"
                     placeholder="SEARCH ORDERS..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-[#F97316] transition-all"
                   />
                </div>
            </div>

            {/* Custom Design Orders Table */}
            {customOrders.length > 0 && (
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-4">Custom Design Orders</h3>
                    <div className="bg-white rounded-[2.5rem] border border-[#F97316]/20 shadow-2xl shadow-orange-900/5 overflow-hidden mb-12">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-orange-100 bg-orange-50/30">
                                        <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-[#F97316]">Order ID</th>
                                        <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-[#F97316]">Customer</th>
                                        <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-[#F97316]">Date</th>
                                        <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-[#F97316] text-right">Total</th>
                                        <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-[#F97316]">Status</th>
                                        <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-[#F97316] text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-50">
                                    {customOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-orange-50/20 transition-colors group">
                                            <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tighter">#{order.id}</td>
                                            <td className="px-8 py-6 text-[10px] font-black text-slate-900 uppercase tracking-widest">{order.customer}</td>
                                            <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.date}</td>
                                            <td className="px-8 py-6 text-right text-sm font-black text-slate-900 tracking-tighter">{order.total}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setSelectedDesignOrder(order); setIsDesignViewerOpen(true); }} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="View Design">
                                                        <Eye size={18} />
                                                    </button>
                                                    <button onClick={() => { setSelectedOrder(order); setStatusModalOpen(true); }} className="p-3 text-slate-300 hover:text-[#F97316] hover:bg-orange-50 rounded-xl transition-all" title="Update Status">
                                                        <Edit size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Standard Orders Table */}
            <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase mb-4">Standard Orders</h3>
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Order ID</th>
                                    <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Customer</th>
                                    <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Date</th>
                                    <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Total</th>
                                    <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">Status</th>
                                    <th className="px-8 py-6 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan="6" className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 animate-pulse">Loading Orders...</td></tr>
                                ) : standardOrders.length === 0 ? (
                                    <tr><td colSpan="6" className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">No standard orders found</td></tr>
                                ) : (
                                    standardOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tighter">#{order.id}</td>
                                            <td className="px-8 py-6 text-[10px] font-black text-slate-900 uppercase tracking-widest">{order.customer}</td>
                                            <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.date}</td>
                                            <td className="px-8 py-6 text-right text-sm font-black text-slate-900 tracking-tighter">{order.total}</td>
                                            <td className="px-8 py-6">
                                                <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setSelectedOrder(order); setStatusModalOpen(true); }} className="p-3 text-slate-300 hover:text-[#F97316] hover:bg-orange-50 rounded-xl transition-all" title="Update Status">
                                                        <Edit size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Status" maxWidth="max-w-sm">
                <div className="space-y-8 p-4">
                    <select
                        value={(newStatus || "").toLowerCase()}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all"
                    >
                        {["pending", "processing", "shipped", "delivered", "cancelled"].map(s => (
                            <option key={s} value={s}>{s.toUpperCase()}</option>
                        ))}
                    </select>
                    <div className="flex gap-4">
                        <button onClick={() => setStatusModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                        <button onClick={handleStatusUpdate} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all">Update Status</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDetailsOpen} onClose={() => setIsDetailsOpen(false)} title={`Order ${selectedOrder?.id}`}>
                <div className="space-y-6">
                    <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-2">Customer Info</h4>
                        <div className="bg-slate-50 p-3 rounded-lg text-sm">
                            <p className="font-semibold">{selectedOrder?.customer || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDesignViewerOpen} onClose={() => setIsDesignViewerOpen(false)} title="Interactive Design Viewer" maxWidth="max-w-2xl">
                {selectedDesignOrder && (
                    <div className="space-y-6 p-4">
                        <DesignViewer designId={selectedDesignOrder.design_id || selectedDesignOrder.id} />
                        <div className="flex justify-end pt-4">
                            <button onClick={() => setIsDesignViewerOpen(false)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all">Close Viewer</button>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmationModal isOpen={conf.open} onClose={() => setConf({ ...conf, open: false })} onConfirm={conf.onConfirm} title={conf.title} message={conf.message} type={conf.type} hideCancel={conf.hideCancel} confirmText="Confirm" />
        </div>
    );
}
