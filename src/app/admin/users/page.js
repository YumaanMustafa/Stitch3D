"use client";
import { useEffect, useState } from "react";
import { Trash2, Search, User, Shield, AlertTriangle, RefreshCw, Eye, EyeOff, Phone } from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";

/**
 * @file page.js
 * @description Admin User Management Page.
 * Lists all registered users (Customers, Vendors, Admins) with filtering options.
 * Allows administrators to delete users via `/api/admin/users/[id]`.
 */

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

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

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.first_name?.toLowerCase().includes(lowerTerm) ||
            u.last_name?.toLowerCase().includes(lowerTerm) ||
            u.email?.toLowerCase().includes(lowerTerm)
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const handleDelete = (id) => {
    setUserToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`/api/admin/users/${userToDelete}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete user");

      showAlert("Deleted", "User has been permanently removed.");
    } catch (err) {
      showAlert("Error", err.message, "warning");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500 mt-1">View and manage all registered users.</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-100 transition text-sm font-medium"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Sync Data
        </button>
      </div>

      {/* Deletion Requests Section */}
      {users.some(u => u.status === 'deletion_requested') && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-amber-100/50 px-6 py-4 border-b border-amber-200 flex items-center gap-3 text-amber-900 font-bold uppercase tracking-tight text-sm">
            <AlertTriangle size={18} className="text-amber-600" />
            Pending Deletion Requests
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-amber-50/50 border-b border-amber-200/50">
                <tr className="text-amber-700/60 uppercase text-[10px] font-black tracking-widest">
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-6">Contact</th>
                  <th className="py-3 px-6">Type</th>
                  <th className="py-3 px-6">Scheduled</th>
                  <th className="py-3 px-6">Reason for Leaving</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {users.filter(u => u.status === 'deletion_requested').map((user) => (
                  <tr key={user.user_id} className="hover:bg-white/50 transition">
                    <td className="py-4 px-6 font-bold text-amber-900 text-sm">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <MaskedField text={user.email} type="email" />
                        {user.phone_number && <MaskedField text={user.phone_number} type="phone" />}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                        user.role === 'vendor' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-amber-200 text-amber-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-amber-800 text-xs font-medium">
                      {new Date(user.deletion_requested_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="max-w-xs text-amber-800 text-xs bg-white/60 p-3 rounded-xl border border-amber-200/50 italic">
                        "{user.deletion_reason || 'No reason provided'}"
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => handleDelete(user.user_id)}
                        className="bg-rose-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition shadow-lg shadow-rose-600/20 active:scale-95"
                      >
                        Finalize Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search active users..."
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
        ) : filteredUsers.length === 0 ? (
          <div className="p-20 text-center text-slate-400">
            <User className="w-12 h-12 mx-auto mb-4 opacity-30 text-slate-300" />
            <p>No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-slate-500 uppercase text-xs font-bold tracking-wider">
                  <th className="py-4 px-6">User</th>
                  <th className="py-4 px-6">Contact Info</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Joined</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {user.first_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{user.first_name} {user.last_name}</p>
                          {user.company_name && (
                            <p className="text-xs text-indigo-600 font-medium">{user.company_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <MaskedField text={user.email} type="email" />
                        {user.phone_number && <MaskedField text={user.phone_number} type="phone" />}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'vendor' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                          {user.role}
                        </span>
                        {user.status === 'deletion_requested' && (
                          <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                            Deleting
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleDelete(user.user_id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to permanently delete this user? This will also remove any associated data and cannot be undone."
        confirmText="Delete"
        isDestructive={true}
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

function MaskedField({ text, type }) {
  const [isVisible, setIsVisible] = useState(false);

  const maskText = (str) => {
    if (!str) return "N/A";
    if (isVisible) return str;
    
    if (type === 'email') {
      const [user, domain] = str.split('@');
      return `${user.substring(0, 2)}***@${domain}`;
    }
    
    // Phone masking
    return `${str.substring(0, 4)}*******`;
  };

  return (
    <div 
      className="flex items-center gap-2 text-[10px] font-medium text-slate-500 hover:text-slate-900 transition-colors cursor-pointer group/mask"
      onClick={() => setIsVisible(!isVisible)}
    >
      <span className={isVisible ? "text-slate-900 font-bold" : ""}>
        {maskText(text)}
      </span>
      <button className="opacity-0 group-hover/mask:opacity-100 transition-opacity">
        {isVisible ? <EyeOff size={12} className="text-slate-400" /> : <Eye size={12} className="text-slate-400" />}
      </button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-4 border-b border-slate-100 pb-4">
          <div className="h-10 w-10 bg-slate-100 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/4 bg-slate-100 rounded" />
            <div className="h-3 w-1/3 bg-slate-50 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}