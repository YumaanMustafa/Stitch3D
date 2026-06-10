"use client";
import { useEffect, useState } from "react";
import { UserCog, Info, Shield, Mail, Loader } from "lucide-react";

/**
 * @file page.js
 * @description Admin Settings & Profile Page.
 * Displays administrator profile information and system details.
 * Fetches data from `/api/admin/profile`.
 */

export default function AdminSettingsPage() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("adminToken");
      try {
        const res = await fetch("/api/admin/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAdmin(data);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Settings</h1>
        <p className="text-slate-500 mt-1">Manage your administrator preferences.</p>
      </div>

      {/* Profile Section */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
        {/* Decorative background blob */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800 relative z-10">
          <UserCog className="w-5 h-5 text-indigo-600" /> Profile Information
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm animate-pulse">
            <Loader className="w-4 h-4 animate-spin" /> Loading profile...
          </div>
        ) : admin ? (
          <div className="space-y-4 max-w-lg relative z-10">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl border border-slate-200 shadow-sm">
                {admin.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Full Name</p>
                <p className="font-bold text-slate-800 text-lg leading-tight">{admin.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 border border-slate-200 shadow-sm">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Email Address</p>
                <p className="font-medium text-slate-700">{admin.email}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-red-500">Failed to load profile info.</p>
        )}
      </div>

      {/* System Info */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-800">
          <Info className="w-5 h-5 text-indigo-600" /> System Information
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Application</p>
            <p className="font-semibold text-slate-700">Stitch Management Portal</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Version</p>
            <p className="font-semibold text-slate-700">1.2.0-beta</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Role</p>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-purple-600" />
              <p className="font-bold text-slate-800">Administrator</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Access Level</p>
            <p className="font-medium text-slate-600">Full (Users, Vendors, Suppliers)</p>
          </div>
        </div>
      </div>
    </div>
  );
}