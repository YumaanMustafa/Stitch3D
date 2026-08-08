"use client";
import React, { useState, useEffect } from "react";
import { 
  CheckCircle, XCircle, Clock, Truck, 
  Search, Eye, Edit, Box, AlertCircle, FileText, Calendar, MoreHorizontal, DollarSign, ArrowRight, Send
} from "lucide-react";
import Modal from "@/app/components/Modal";
import ConfirmationModal from "@/app/components/ConfirmationModal";

/**
 * @file page.js
 * @description Supplier - Vendor Requests - Table Layout & Quote Generation Logic.
 */

export default function SupplierVendorRequests() {
    // STEP 1: Setting up State Variables
    // `requests` holds the list of incoming requests from vendors
    const [requests, setRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    // Modal state for viewing details or sending quotes
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null); // The specific request they clicked on
    const [newStatus, setNewStatus] = useState("");
    
    // STEP 2: Quote Calculation State
    // Stores the financial breakdown for a custom quote before sending it to the vendor
    const [quoteData, setQuoteData] = useState({
        item_price: 0,
        tax: 0,
        shipping: 0
    });
    // Disables buttons while talking to the database so they don't click twice
    const [isProcessing, setIsProcessing] = useState(false);

    // Standard state for showing success/error popup messages
    const [conf, setConf] = useState({ open: false, title: "", message: "", type: "warning", onConfirm: () => { }, hideCancel: false });
    const showAlert = (title, message, type = "success") => setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => {} });

    // STEP 3: Initial Data Load
    // Runs once when the page opens to fetch the list of requests
    useEffect(() => {
        fetchRequests();
    }, []);

    // Asks the database for all vendor requests sent to this specific supplier
    const fetchRequests = async () => {
        try {
            const token = localStorage.getItem("supplierToken"); // Get ID card
            const res = await fetch("/api/supplier/vendor-requests", { headers: { Authorization: `Bearer ${token}` } });
            
            if (res.ok) {
                // Save the data to React state to display on the screen
                setRequests(await res.json());
            }
        } catch (err) {
            // Silently ignore errors
        } finally { 
            setLoading(false); // Turn off the loading text
        }
    };

    // Filter the list of requests based on what the user typed in the search bar
    const filtered = requests.filter(req =>
        (req.material_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.vendor_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // STEP 4: Sending a Price Quote
    // Triggered when the supplier fills in the prices and clicks "Send Quotation"
    const handleSendQuote = async () => {
        if (!selectedRequest) return;
        setIsProcessing(true); // Disable the send button
        
        try {
            // Calculate the final Grand Total by adding price, tax, and shipping together
            const total = Number(quoteData.item_price) + Number(quoteData.tax) + Number(quoteData.shipping);
            const token = localStorage.getItem("supplierToken");
            
            // Send a PUT request to update the status of this specific request from 'Pending' to 'Quoted'
            const res = await fetch(`/api/supplier/vendor-requests/${selectedRequest.id}/accept`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                // Send the broken-down prices AND the grand total to the database
                body: JSON.stringify({ 
                    ...quoteData,
                    total
                })
            });
            
            if (res.ok) {
                setIsModalOpen(false); // Close the popup window
                fetchRequests(); // Refresh the list so the status changes to "Quoted"
                showAlert("Quote Sent", "The quotation has been sent to the vendor successfully.");
            } else {
                showAlert("Error", "Failed to send quotation.", "warning");
            }
        } catch (err) {
            showAlert("Error", "Network error occurred.", "warning");
        } finally {
            setIsProcessing(false); // Re-enable the button
        }
    };

    // STEP 5: Declining a Request
    // Triggered when the supplier clicks "Decline"
    const handleRejectRequest = async () => {
        if (!selectedRequest) return;
        setIsProcessing(true);
        
        try {
            const token = localStorage.getItem("supplierToken");
            // Send a PUT request to the backend to change the status to 'Rejected'
            const res = await fetch(`/api/supplier/vendor-requests/${selectedRequest.id}/reject`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setIsModalOpen(false);
                fetchRequests();
                showAlert("Request Rejected", "The material request has been declined.");
            }
        } catch (err) {
            // Silently ignore
        } finally { 
            setIsProcessing(false); 
        }
    };

    // STEP 6: Handling Counter-Offers
    // If the vendor didn't like our quote and sent a counter-offer, the supplier can accept it here
    const handleAcceptRenegotiation = async () => {
        if (!selectedRequest) return;
        setIsProcessing(true);
        
        try {
            const token = localStorage.getItem("supplierToken");
            const res = await fetch(`/api/supplier/vendor-requests/${selectedRequest.id}/accept-renegotiation`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setIsModalOpen(false);
                fetchRequests();
                showAlert("Renegotiation Accepted", "You have accepted the vendor's counter offer. The request is now accepted.");
            } else {
                const data = await res.json();
                showAlert("Error", data.error || "Failed to accept counter offer.", "warning");
            }
        } catch (err) {
            showAlert("Error", "Network error occurred.", "warning");
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusStyle = (status) => {
        switch ((status || "").toLowerCase()) {
            case "accepted": return "text-emerald-500 bg-emerald-50 border-emerald-100";
            case "rejected": return "text-rose-500 bg-rose-50 border-rose-100";
            case "pending": return "text-orange-500 bg-orange-50 border-orange-100";
            case "renegotiating": return "text-amber-500 bg-amber-50 border-amber-100";
            case "quoted": return "text-[#F97316] bg-[#F97316]/10 border-[#F97316]/20";
            default: return "text-slate-900 bg-slate-100 border-slate-200";
        }
    };

    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                   <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Supply Chain</h2>
                   <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Vendor Requests</h1>
                   <p className="text-sm font-medium text-slate-500 mt-2">Manage incoming material requests from vendors.</p>
                </div>
            </div>

            {/* Control Bar */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="relative w-full max-w-md">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input
                     type="text"
                     placeholder="SEARCH REQUESTS..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-[#F97316] transition-all"
                   />
                </div>
            </div>

            {/* Table List */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Order ID</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Material</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Inventory</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Urgency</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-20 text-center">
                                        <div className="animate-pulse text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Loading Requests...</div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <FileText size={40} className="text-slate-200 mb-4" />
                                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">No requests found</h2>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <span className="text-sm font-black text-slate-900 tracking-tighter">#{req.id}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-all shrink-0">
                                                    <Truck size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">{req.material_name}</p>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{new Date(req.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{req.vendor_name}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Active Vendor</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{req.type}</p>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{req.quantity} Units Requested</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                    req.urgency === 'high' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {req.urgency}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusStyle(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {req.status === 'pending' || req.status === 'renegotiating' ? (
                                                <button 
                                                    onClick={() => { setSelectedRequest(req); setQuoteData({ item_price: req.item_price || req.unit_price || 0, tax: req.tax || 0, shipping: req.shipping || 0 }); setIsModalOpen(true); }}
                                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all shadow-lg shadow-slate-200"
                                                >
                                                    {req.status === 'renegotiating' ? 'Review Counter-Offer' : 'Create Quote'}
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    {req.status === 'quoted' && (
                                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-3 py-2 rounded-xl">
                                                            Vendor Reviewing
                                                        </span>
                                                    )}
                                                    <button 
                                                        onClick={() => { setSelectedRequest(req); setIsModalOpen(true); }}
                                                        className="p-2 text-slate-400 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-all"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 bg-slate-50/30 border-t border-slate-100 text-center">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Incoming Pipeline: {filtered.length} Requests</p>
                </div>
            </div>

            {/* QUOTE MODAL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedRequest ? `Quotation - #${selectedRequest.id}` : "Quotation"} maxWidth="max-w-md">
                {selectedRequest && (
                    <div className="space-y-8 p-6">
                        {/* If renegotiating, show the counter-offer box */}
                        {selectedRequest.status === 'renegotiating' && (
                            <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                                <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Vendor Counter-Offer</h4>
                                <p className="text-2xl font-black text-slate-900 tracking-tighter italic mb-4">Rs {selectedRequest.renegotiated_price?.toLocaleString() || '0'}</p>
                                <button 
                                    onClick={handleAcceptRenegotiation}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    {isProcessing ? "Processing..." : "Accept Counter-Offer"}
                                </button>
                                <div className="relative py-3">
                                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-amber-200"></div></div>
                                   <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest"><span className="bg-amber-50 px-3 text-amber-600 italic">OR SEND A NEW QUOTE</span></div>
                                </div>
                            </div>
                        )}

                        {(selectedRequest.status === 'pending' || selectedRequest.status === 'renegotiating') ? (
                            <div className="space-y-6">
                                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                                    <h4 className="text-[9px] font-black text-[#F97316] uppercase tracking-widest mb-2">Request Details</h4>
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">{selectedRequest.material_name} ({selectedRequest.quantity} Units)</p>
                                    <p className="text-[9px] font-medium text-slate-500 mt-1">Vendor: {selectedRequest.vendor_name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Unit Price</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rs</span>
                                            <input 
                                                type="number"
                                                value={quoteData.item_price}
                                                onChange={(e) => setQuoteData({...quoteData, item_price: e.target.value})}
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Shipping</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rs</span>
                                            <input 
                                                type="number"
                                                value={quoteData.shipping}
                                                onChange={(e) => setQuoteData({...quoteData, shipping: e.target.value})}
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tax / Fees</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rs</span>
                                            <input 
                                                type="number"
                                                value={quoteData.tax}
                                                onChange={(e) => setQuoteData({...quoteData, tax: e.target.value})}
                                                className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-2xl text-[11px] font-black outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-slate-900 rounded-3xl text-white flex justify-between items-center shadow-xl shadow-slate-900/20">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Total Quote</span>
                                    <span className="text-2xl font-black tracking-tighter italic">Rs {(Number(quoteData.item_price) + Number(quoteData.tax) + Number(quoteData.shipping)).toLocaleString()}</span>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={handleRejectRequest}
                                        disabled={isProcessing}
                                        className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                                    >
                                        Decline
                                    </button>
                                    <button 
                                        onClick={handleSendQuote}
                                        disabled={isProcessing}
                                        className="flex-[2] py-4 bg-[#F97316] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3"
                                    >
                                        {isProcessing ? "Sending..." : "Send Quotation"}
                                        <Send size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 text-center py-10">
                                <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter italic">Request Details</h3>
                                <p className="text-xs text-slate-500">This material request is currently: <span className="font-black uppercase">{selectedRequest.status}</span></p>

                                {selectedRequest.status === 'quoted' && (
                                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-4 max-w-sm mx-auto">
                                        <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sent Quote Details</h4>
                                        <div className="grid grid-cols-2 gap-y-2 text-xs font-bold text-slate-600">
                                            <div>Item Price:</div><div className="text-right text-slate-900">Rs {selectedRequest.item_price || '0'}</div>
                                            <div>Tax:</div><div className="text-right text-slate-900">Rs {selectedRequest.tax || '0'}</div>
                                            <div>Shipping:</div><div className="text-right text-slate-900">Rs {selectedRequest.shipping || '0'}</div>
                                            <div className="border-t pt-2 font-black text-slate-900">Total:</div><div className="border-t pt-2 text-right font-black text-[#F97316]">Rs {selectedRequest.total || '0'}</div>
                                        </div>
                                    </div>
                                )}

                                <button onClick={() => setIsModalOpen(false)} className="mt-8 px-10 py-4 bg-slate-100 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Close Window</button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <ConfirmationModal isOpen={conf.open} onClose={() => setConf({ ...conf, open: false })} onConfirm={conf.onConfirm} title={conf.title} message={conf.message} type={conf.type} hideCancel={conf.hideCancel} confirmText="OK" />
        </div>
    );
}
