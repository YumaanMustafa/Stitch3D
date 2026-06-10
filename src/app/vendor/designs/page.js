"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Modal from "@/app/components/Modal";
import DesignViewer from "@/app/components/DesignViewer";

/**
 * @file page.js
 * @description Vendor Design Requests.
 * Allows vendors to review, approve, or reject customer design submissions.
 * Fetches requests from `/api/vendor/designs`.
 */

export default function DesignRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [viewerDesignId, setViewerDesignId] = useState(null);
  const [isDesignViewerOpen, setIsDesignViewerOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState(null);

  const confirmReject = () => {
    if (selectedDesignId) {
      updateStatus(selectedDesignId, "Rejected");
      setRejectModalOpen(false);
    }
  };

  useEffect(() => {
    const fetchDesignRequests = async () => {
      try {
        const token = localStorage.getItem("vendorToken");
        // Use relative URL for consistency and proxy handoff
        const res = await fetch("/api/vendor/designs", {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          if (res.status === 401) {
            console.warn("Unauthorized - Redirecting to login");
            router.push("/vendor-auth/login");
            return;
          }
          throw new Error("Failed to fetch design requests");
        }
        const data = await res.json();
        setRequests(data);
      } catch (err) {
        console.error(err.message);
      }
    };
    fetchDesignRequests();
  }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/vendor/designs/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setRequests(requests.map(req => req.design_id === id ? { ...req, status: newStatus } : req));
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <div className="space-y-12 pb-20 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Community</h2>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Design Requests</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Review and approve user-submitted jacket customizations.</p>
        </div>
        <div className="bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 flex flex-col items-end">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Requests</span>
          <span className="text-2xl font-black text-slate-900 tracking-tighter">{requests.length}</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-6">
        {requests.map(req => (
          <div key={req.design_id} className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-4 transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200 group flex flex-col">
            
            {/* Image Thumbnail */}
            <div className="relative w-full aspect-square rounded-[1.5rem] overflow-hidden mb-5 bg-slate-50 border border-slate-100">
              <Image src={req.preview_url} alt={req.title} fill className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
            </div>

            {/* Info */}
            <div className="px-2 flex-1 flex flex-col">
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-tight mb-1">{req.title}</h2>
              <p className="text-[10px] font-black text-[#F97316] uppercase tracking-widest mb-3">By {req.user_name}</p>
              
              {req.notes && (
                <p className="text-sm font-medium text-slate-500 italic mb-4 line-clamp-2">"{req.notes}"</p>
              )}
              
              <div className="flex items-center justify-between mb-6 mt-auto">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {new Date(req.created_at).toLocaleDateString()}
                </span>
                <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  req.status === "Approved" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  req.status === "Rejected" ? "bg-rose-50 text-rose-600 border-rose-100" :
                  "bg-orange-50 text-orange-600 border-orange-100"
                }`}>
                  {req.status}
                </span>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button onClick={() => updateStatus(req.design_id, "Approved")} className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors" title="Approve">
                  <CheckCircle size={18} />
                </button>
                <button onClick={() => updateStatus(req.design_id, "In Review")} className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-50 hover:bg-orange-50 text-slate-400 hover:text-[#F97316] transition-colors" title="In Review">
                  <Clock size={18} />
                </button>
                <button onClick={() => { setSelectedDesignId(req.design_id); setRejectModalOpen(true); }} className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors" title="Reject">
                  <XCircle size={18} />
                </button>
              </div>

              {/* View Full Design */}
              <button 
                onClick={() => { setViewerDesignId(req.design_id); setIsDesignViewerOpen(true); }}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all"
              >
                <Eye size={14} /> Open 3D Viewer
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={confirmReject}
        title="Reject Design"
        message="Are you sure you want to reject this design request? This action will notify the customer."
        confirmText="Reject Design"
        cancelText="Cancel"
        isDestructive={true}
      />

      <Modal isOpen={isDesignViewerOpen} onClose={() => setIsDesignViewerOpen(false)} title="Interactive Design Viewer" maxWidth="max-w-2xl">
        <div className="space-y-6 p-4">
            {viewerDesignId && <DesignViewer designId={viewerDesignId} />}
            <div className="flex justify-end pt-4">
                <button onClick={() => setIsDesignViewerOpen(false)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all">Close Viewer</button>
            </div>
        </div>
      </Modal>
    </div>
  );
}
