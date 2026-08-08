"use client";
import React, { useState, useEffect } from "react";
import {
  Plus, Clock, CheckCircle, XCircle, FileText, AlertCircle,
  Search, ChevronDown, MoreVertical, Trash2, Edit3,
  RefreshCw, PackageSearch, ArrowRight, Truck, Box, Calendar, Eye, Send, DollarSign, ShieldCheck
} from "lucide-react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import Modal from "@/app/components/Modal";
import ConfirmationModal from "@/app/components/ConfirmationModal";

/**
 * @file page.js
 * @description Vendor Material Requests - Table Layout & Renegotiation Logic.
 */

const MaterialRequestSchema = Yup.object().shape({
  material_name: Yup.string().required("Required"),
  type: Yup.string().required("Required"),
  quantity: Yup.number().positive("Must be positive").required("Required"),
  size: Yup.string().required("Required"),
  urgency: Yup.string().required("Required"),
  supplier_id: Yup.string().required("Required"),
});

export default function VendorMaterialRequests() {
  const [requests, setRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Renegotiation State
  const [renegotiateMessage, setRenegotiateMessage] = useState("");
  const [renegotiatePrice, setRenegotiatePrice] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [conf, setConf] = useState({ open: false, title: "", message: "", type: "warning", onConfirm: () => {}, hideCancel: false });
  const showAlert = (title, message, type = "success") => setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => {} });

  // PRIVILEGE 1: B2B Material Sourcing
  // Vendors have the exclusive privilege to request raw materials directly from partnered suppliers.
  // The backend uses their vendorToken to fetch only their own order history.
  async function fetchRequests() {
    try {
      const token = localStorage.getItem("vendorToken");
      const res = await fetch("/api/vendor/material-requests", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setRequests(await res.json());
    } catch (err) {} finally { setLoading(false); }
  }

  // API Call: fetches list of all suppliers for the dropdown field
  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/general/suppliers");
      if (res.ok) setSuppliers(await res.json());
    } catch (err) {}
  }

  // Lifecycle Hook: loads material requests history and available partner suppliers on mount
  useEffect(() => {
    // Wrapped in setTimeout to prevent React synchronous state update warning inside useEffect body
    setTimeout(() => {
      fetchRequests();
      fetchSuppliers();
    }, 0);
  }, []);

  // Formik submit handler: handles both creating a new request and editing an existing one
  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    try {
      const token = localStorage.getItem("vendorToken");
      const isEditing = !!editingRequest;
      const url = isEditing ? `/api/vendor/material-requests/${editingRequest.id}` : "/api/vendor/material-requests";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(values)
      });

      if (res.ok) {
        setModalOpen(false);
        setEditingRequest(null);
        resetForm();
        fetchRequests();
        showAlert("Success", "Request sent successfully.");
      }
    } catch (err) {} finally { setSubmitting(false); }
  };

  // QUOTE ACTIONS: Accept a quotation sent by the supplier and convert it into a final order
  const handleAcceptQuote = async () => {
    if (!selectedBill) return;
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("vendorToken");
      const res = await fetch(`/api/vendor/material-requests/${selectedBill.id}/accept`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setBillModalOpen(false);
        fetchRequests();
        showAlert("Order Placed", "The quotation has been accepted and the order is now processing.");
      } else {
        const data = await res.json();
        showAlert("Error", data.error || "Failed to accept quote", "warning");
      }
    } catch (err) {
      showAlert("Error", "Network error occurred", "warning");
    } finally {
      setIsProcessing(false);
    }
  };

  // QUOTE ACTIONS: Submit a custom renegotiation price counter-offer and optional feedback message to the supplier
  const handleRenegotiate = async () => {
    if (!selectedBill || !renegotiatePrice || isNaN(renegotiatePrice) || Number(renegotiatePrice) <= 0) {
      showAlert("Invalid Price", "Please enter a valid counter offer price.", "warning");
      return;
    }
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("vendorToken");
      const res = await fetch(`/api/vendor/material-requests/${selectedBill.id}/renegotiate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ price: Number(renegotiatePrice), message: renegotiateMessage })
      });
      if (res.ok) {
        setBillModalOpen(false);
        setRenegotiateMessage("");
        setRenegotiatePrice("");
        fetchRequests();
        showAlert("Renegotiation Sent", "The supplier has been notified of your counter-offer.");
      } else {
        const data = await res.json();
        showAlert("Error", data.error || "Failed to send renegotiation", "warning");
      }
    } catch (err) {
      showAlert("Error", "Network error occurred", "warning");
    } finally {
      setIsProcessing(false);
    }
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = r.material_name?.toLowerCase().includes(q) || r.type?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-12 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Sourcing</h2>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Material Requests</h1>
           <p className="text-sm font-medium text-slate-500 mt-2">Request materials from your suppliers for production.</p>
        </div>
        <button
          onClick={() => { setEditingRequest(null); setModalOpen(true); }}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all shadow-xl shadow-slate-200 flex items-center gap-3"
        >
          <Plus size={18} /> New Request
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
           <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input
             type="text"
             placeholder="SEARCH MATERIALS..."
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-[#F97316] transition-all"
           />
        </div>
        <div className="flex items-center gap-3">
           <div className="relative">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-6 pr-10 py-3 bg-slate-100 border-none rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer hover:bg-slate-200 transition-all"
              >
                <option value="all">Status: ALL</option>
                <option value="pending">PENDING</option>
                <option value="quoted">QUOTED</option>
                <option value="renegotiating">RENEGOTIATING</option>
                <option value="accepted">ACCEPTED</option>
                <option value="rejected">REJECTED</option>
              </select>
           </div>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Request ID</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Material</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</th>
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
                      <Box size={40} className="text-slate-200 mb-4" />
                      <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Requests Found</h2>
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
                      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{req.type}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{req.quantity} Units • {req.size}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{req.supplier_first_name} {req.supplier_last_name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Partner</p>
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
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                          req.status === 'accepted' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 
                          req.status === 'rejected' ? 'bg-rose-50 text-rose-500 border-rose-100' : 
                          req.status === 'renegotiating' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                          req.status === 'quoted' ? 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20' :
                          'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {req.status === 'quoted' || req.status === 'renegotiating' ? (
                        <button 
                          onClick={() => { setSelectedBill(req); setBillModalOpen(true); }}
                          className="px-4 py-2 bg-[#F97316] text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:bg-slate-900 transition-all"
                        >
                          {req.status === 'quoted' ? 'Review Quote' : 'View Renegotiation'}
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setSelectedBill(req); setBillModalOpen(true); }}
                          className="p-2 text-slate-400 hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50/30 border-t border-slate-100 text-center">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Showing {filtered.length} Material Requests</p>
        </div>
      </div>

      {/* BILL MODAL - Quote Review & Renegotiation */}
      <Modal isOpen={billModalOpen} onClose={() => setBillModalOpen(false)} title="Quote Review" maxWidth="max-w-xl">
        {selectedBill && (
          <div className="p-6 space-y-8 animate-fade-in">
            {/* Quote Summary */}
            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5">
                  <DollarSign size={80} />
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <ShieldCheck size={18} className="text-[#F97316]" />
                     Supplier Quotation
                  </div>
                  <span className="text-[10px] text-slate-400 font-black tracking-widest">ORDER #{selectedBill.id}</span>
               </h3>
               
               <div className="grid grid-cols-2 gap-y-6">
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Item Price</p>
                     <p className="text-xl font-black text-slate-900 tracking-tighter italic">Rs {selectedBill.item_price || '0'}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Shipping</p>
                     <p className="text-xl font-black text-slate-900 tracking-tighter italic">Rs {selectedBill.shipping || '0'}</p>
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tax</p>
                     <p className="text-xl font-black text-slate-900 tracking-tighter italic">Rs {selectedBill.tax || '0'}</p>
                  </div>
                  <div className="text-right border-t border-slate-200 pt-4">
                     <p className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.2em] mb-1">Total Bill</p>
                     <p className="text-3xl font-black text-slate-900 tracking-tighter italic">Rs {selectedBill.total || '0'}</p>
                  </div>
               </div>
            </div>            {selectedBill.status === 'quoted' && (
              <div className="space-y-6 pt-4">
                {/* Accept Action */}
                <button 
                  onClick={handleAcceptQuote}
                  disabled={isProcessing}
                  className="w-full py-5 bg-[#F97316] text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-500/20 hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? "Processing..." : "Accept Quotation & Place Order"}
                  {!isProcessing && <ArrowRight size={18} />}
                </button>

                <div className="relative py-4">
                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                   <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-slate-300 italic">OR RENEGOTIATE</span></div>
                </div>

                {/* Renegotiate Action */}
                <div className="space-y-3">
                   <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rs</span>
                      <input 
                        type="number"
                        value={renegotiatePrice}
                        onChange={(e) => setRenegotiatePrice(e.target.value)}
                        placeholder="ENTER COUNTER OFFER PRICE..."
                        className="w-full pl-10 pr-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest outline-none transition-all"
                      />
                   </div>
                   <textarea 
                     value={renegotiateMessage}
                     onChange={(e) => setRenegotiateMessage(e.target.value)}
                     placeholder="ENTER YOUR COMMENT OR MESSAGE..."
                     className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest outline-none transition-all h-28 resize-none"
                   />
                   <button 
                     onClick={handleRenegotiate}
                     disabled={isProcessing || !renegotiatePrice}
                     className="w-full py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:border-[#F97316] hover:text-[#F97316] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     Send Counter Offer
                     <Send size={16} />
                   </button>
                </div>
              </div>
            )}

            {selectedBill.status === 'renegotiating' && (
               <div className="space-y-6 pt-4">
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 text-center">
                     <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2">Renegotiation In Progress</p>
                     <p className="text-sm font-medium text-amber-700 leading-relaxed">
                        You have proposed a counter-offer of <span className="font-black text-lg">Rs {selectedBill.renegotiated_price?.toLocaleString() || '0'}</span>.
                        <br/>Waiting for the supplier to accept it or submit another quote.
                     </p>
                  </div>
               </div>
            )}
            
            {selectedBill.status !== 'quoted' && selectedBill.status !== 'renegotiating' && (
               <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">
                     {selectedBill.status === 'accepted' ? "Order already placed and finalized." : "This request is no longer open for changes."}
                  </p>
               </div>
            )}
          </div>
        )}
      </Modal>

      {/* NEW REQUEST MODAL */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Request" maxWidth="max-w-2xl">
         <Formik initialValues={{ material_name: "", type: "", quantity: "", size: "", urgency: "medium", supplier_id: "" }} validationSchema={MaterialRequestSchema} onSubmit={handleSubmit}>
            {({ isSubmitting }) => (
               <Form className="space-y-8 p-4">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Material Name</label>
                        <Field name="material_name" placeholder="E.G. LEATHER" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Type</label>
                        <Field name="type" as="select" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all">
                           <option value="">Select Type</option>
                           <option value="Leather">Leather</option>
                           <option value="Fabric">Fabric</option>
                           <option value="Hardware">Hardware</option>
                        </Field>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Quantity</label>
                        <Field name="quantity" type="number" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Select Supplier</label>
                        <Field name="supplier_id" as="select" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all">
                           <option value="">Choose Supplier</option>
                           {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Field>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Size/Dimensions</label>
                        <Field name="size" placeholder="E.G. 100 SQ FT" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Urgency</label>
                        <Field name="urgency" as="select" className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all">
                           <option value="low">Low Priority</option>
                           <option value="medium">Medium Priority</option>
                           <option value="high">Urgent / High Priority</option>
                        </Field>
                     </div>
                  </div>
                  <div className="flex justify-end gap-4 pt-6 border-t border-slate-100">
                     <button type="submit" disabled={isSubmitting} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] shadow-xl transition-all">
                       {isSubmitting ? "Sending..." : "Submit Request"}
                     </button>
                  </div>
               </Form>
            )}
         </Formik>
      </Modal>

      <ConfirmationModal isOpen={conf.open} onClose={() => setConf({ ...conf, open: false })} onConfirm={conf.onConfirm} title={conf.title} message={conf.message} type={conf.type} hideCancel={conf.hideCancel} confirmText="OK" />
    </div>
  );
}
