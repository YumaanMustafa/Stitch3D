"use client";
import { useEffect, useState } from "react";
import { Trash2, RefreshCw, X, Check, Search, Shield, AlertTriangle, Factory } from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";

/**
 * @file page.js
 * @description Admin Supplier Management Page.
 * Key feature for approving/rejecting supplier applications.
 * - Lists suppliers with status (Pending, Active, etc.)
 * - Allows status updates and deletions.
 */

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // 'delete' or 'status'
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  // Custom Alert State
  const [conf, setConf] = useState({ 
    open: false, 
    title: "", 
    message: "", 
    type: "warning", 
    onConfirm: () => {}, 
    hideCancel: false 
  });

  const showAlert = (title, message, type = "success") => {
    setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => {} });
  };

  const fetchSuppliers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch suppliers");

      const supplierList = Array.isArray(data) ? data : [];
      setSuppliers(supplierList);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let results = suppliers;

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      results = results.filter(s =>
        s.company_name?.toLowerCase().includes(lowerTerm) ||
        s.business_registration_number?.toLowerCase().includes(lowerTerm) ||
        s.phone?.toLowerCase().includes(lowerTerm) ||
        s.address?.toLowerCase().includes(lowerTerm)
      );
    }

    if (filterStatus !== 'all') {
      results = results.filter(s => s.user_status === filterStatus);
    }

    setFilteredSuppliers(results);
  }, [searchTerm, filterStatus, suppliers]);

  const initStatusUpdate = (supplier, newStatus) => {
    setSelectedSupplier(supplier);
    setPendingStatus(newStatus);
    setModalType('status');
    setModalOpen(true);
  };

  const confirmStatusUpdate = async () => {
    if (!selectedSupplier || !pendingStatus) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/suppliers/${selectedSupplier.supplier_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: pendingStatus })
      });

      if (!res.ok) throw new Error("Update failed");

      setSuppliers(prev => prev.map(s => s.supplier_id === selectedSupplier.supplier_id ? { ...s, user_status: pendingStatus } : s));
      showAlert("Success", "Supplier status updated successfully!");
    } catch (err) {
      showAlert("Error", "Failed to update status: " + err.message, "warning");
    }
  };

  const initDelete = (supplier) => {
    setSelectedSupplier(supplier);
    setModalType('delete');
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedSupplier) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/suppliers/${selectedSupplier.supplier_id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to delete supplier");

      setSuppliers(suppliers.filter((s) => s.supplier_id !== selectedSupplier.supplier_id));
      setModalOpen(false);
      setSelectedSupplier(null);
      showAlert("Deleted", "Supplier account has been removed.");
    } catch (err) {
      showAlert("Error", err.message, "warning");
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supplier Management</h1>
          <p className="text-slate-500 mt-1">Approve and manage supplier partnerships.</p>
        </div>
        <button
          onClick={fetchSuppliers}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50 font-medium text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Data
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by Company, Reg Number, ID..."
            className="w-full bg-slate-50 border-slate-200 border rounded-lg pl-10 pr-4 py-2 text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-lg border border-slate-200">
          {['all', 'pending', 'active', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold capitalize transition-all ${filterStatus === status
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-10 text-center py-20">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="text-red-500" size={28} />
            </div>
            <p className="text-red-500 mb-2 font-medium">{error}</p>
            <button onClick={fetchSuppliers} className="text-indigo-500 hover:text-indigo-600 underline text-sm font-medium">Retry Connection</button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <Factory className="w-12 h-12 mx-auto mb-4 opacity-30 text-slate-300" />
            <p>No suppliers found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 uppercase text-xs font-bold tracking-wider">
                  <th className="py-4 px-6">Company / Supplier</th>
                  <th className="py-4 px-6">Contact</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Joined</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((s) => (
                  <tr key={s.supplier_id} className="hover:bg-slate-50/50 transition duration-150 group">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-slate-800">{s.company_name || "N/A"}</p>
                        <p className="text-xs text-slate-500 font-medium">ID: #{s.supplier_id}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="text-sm text-slate-700 font-medium">{s.phone || "No phone"}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="relative">
                        <select
                          value={s.user_status || 'pending'}
                          onChange={(e) => initStatusUpdate(s, e.target.value)}
                          className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer transition-all shadow-sm ${s.user_status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300' :
                            s.user_status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300' :
                              s.user_status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300' :
                                'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="active">Active</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-sm font-medium">
                      {s.created_at ? new Date(s.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => initDelete(s)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Supplier"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={modalType === 'delete' ? confirmDelete : confirmStatusUpdate}
        title={modalType === 'delete' ? "Delete Supplier" : `Update Status to ${pendingStatus?.toUpperCase()}`}
        message={modalType === 'delete'
          ? "Are you sure you want to delete this supplier? This will also delete their associated user account."
          : `Are you sure you want to change the status of ${selectedSupplier?.business_registration_number || 'this supplier'} to ${pendingStatus}?`}
        confirmText={modalType === 'delete' ? "Delete Supplier" : "Update Status"}
        cancelText="Cancel"
        isDestructive={modalType === 'delete' || pendingStatus === 'rejected'}
      />

      <ConfirmationModal
        isOpen={conf.open}
        onClose={() => setConf({ ...conf, open: false })}
        onConfirm={conf.onConfirm}
        title={conf.title}
        message={conf.message}
        type={conf.type}
        hideCancel={conf.hideCancel}
        confirmText={conf.hideCancel ? "OK" : "Confirm"}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-100 pb-4">
          <div className="h-10 w-10 bg-slate-100 rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-100 rounded w-1/4"></div>
            <div className="h-3 bg-slate-50 rounded w-1/3"></div>
          </div>
          <div className="h-8 w-24 bg-slate-100 rounded"></div>
        </div>
      ))}
    </div>
  );
}
