"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Search, FileText, AlertTriangle } from "lucide-react";

/**
 * @file page.js
 * @description Admin Design Requests Management Page.
 * Allows admins to view, search, and monitor status of design requests.
 * Fetches data from `/api/admin/designs`.
 */

export default function DesignRequests() {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/designs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch design requests");

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredRequests(
        requests.filter(
          (r) =>
            r.title?.toLowerCase().includes(lowerTerm) ||
            r.user_name?.toLowerCase().includes(lowerTerm) ||
            r.status?.toLowerCase().includes(lowerTerm)
        )
      );
    } else {
      setFilteredRequests(requests);
    }
  }, [searchTerm, requests]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Design Requests</h1>
          <p className="text-slate-500 mt-1">Monitor all incoming design requests.</p>
        </div>
        <button
          onClick={fetchRequests}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-100 transition text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search requests..."
            className="w-full bg-slate-50 border-slate-200 border rounded-lg pl-10 pr-4 py-2 text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="p-10 text-center text-red-500">
            <AlertTriangle className="mx-auto mb-2" />
            {error}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30 text-slate-300" />
            <p>No design requests found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 uppercase text-xs font-bold tracking-wider">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Title</th>
                  <th className="py-4 px-6">Vendor</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((r) => (
                  <tr key={r.request_id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 text-slate-500 text-sm font-mono">#{r.request_id}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-800">{r.user_name} {r.user_surname}</p>
                      <p className="text-xs text-slate-500">{r.user_email}</p>
                    </td>
                    <td className="py-4 px-6 text-slate-700 font-medium">{r.title}</td>
                    <td className="py-4 px-6 text-sm">
                      {r.vendor_name ? (
                        <span className="text-indigo-600 font-medium">{r.vendor_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-4 px-6 text-right text-slate-500 text-sm">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    assigned: "bg-blue-50 text-blue-700 border-blue-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200"
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${styles[status?.toLowerCase()] || styles.cancelled}`}>
      {status}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 border-b border-slate-100 pb-4">
          <div className="h-4 w-8 bg-slate-100 rounded" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/4 bg-slate-100 rounded" />
            <div className="h-3 w-1/3 bg-slate-50 rounded" />
          </div>
          <div className="h-4 w-20 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
  );
}