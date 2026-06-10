"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Shield, Save, Lock, Loader, AlertCircle, Pencil, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmationModal from "@/app/components/ConfirmationModal";

/**
 * @file page.js
 * @description Supplier Settings - Simplified Text & Modern Light Theme.
 */

const ProfileSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
});

const PasswordSchema = Yup.object().shape({
  currentPassword: Yup.string().required("Required"),
  newPassword: Yup.string().min(8, "Min 8 chars").required("Required"),
  confirmPassword: Yup.string().oneOf([Yup.ref('newPassword')], "Doesn't match").required("Required"),
});

export default function SupplierSettings() {
  const [initialSettings, setInitialSettings] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [isNameEditing, setIsNameEditing] = useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("supplierToken");
      const res = await fetch("/api/supplier/settings", { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) setInitialSettings(await res.json());
    } catch (err) {} finally { setLoading(false); }
  };

  const handleUpdateProfile = async (values, { setSubmitting }) => {
    try {
      const token = localStorage.getItem("supplierToken");
      const res = await fetch("/api/supplier/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(values)
      });
      if (res.ok) {
        setMessage("Profile Updated");
        setIsNameEditing(false);
        setInitialSettings(prev => ({ ...prev, name: values.name }));
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {} finally { setSubmitting(false); }
  };

  const handleUpdatePassword = async (values, { setSubmitting, resetForm }) => {
    try {
      const token = localStorage.getItem("supplierToken");
      const res = await fetch("/api/supplier/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ password: values.currentPassword, newPassword: values.newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Password Updated Successfully");
        setIsPasswordEditing(false);
        resetForm();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(data.error || "Failed to update password");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("Network Error");
      setTimeout(() => setMessage(""), 3000);
    } finally { 
      setSubmitting(false); 
    }
  };

  if (loading) return <div className="py-20 text-center animate-pulse text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">Loading Settings...</div>;

  return (
    <div className="space-y-12 pb-20 animate-fade-in max-w-4xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Settings</h2>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Account Settings</h1>
           <p className="text-sm font-medium text-slate-500 mt-2">Manage your supplier profile and security settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
         {/* Profile Section */}
         <section className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-[#F97316]">
                     <Shield size={24} />
                  </div>
                  <div>
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Personal Details</h3>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Edit your name and info</p>
                  </div>
               </div>
               {!isNameEditing && (
                 <button onClick={() => setIsNameEditing(true)} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                    <Pencil size={18} />
                 </button>
               )}
            </div>

            <Formik initialValues={{ name: initialSettings.name, email: initialSettings.email }} validationSchema={ProfileSchema} enableReinitialize onSubmit={handleUpdateProfile}>
               {({ isSubmitting, resetForm }) => (
                  <Form className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                           <Field name="name" disabled={!isNameEditing} className={`w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all ${isNameEditing ? 'focus:border-[#F97316] focus:bg-white' : 'opacity-50'}`} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                           <div className="relative">
                              <Field name="email" disabled readOnly className="w-full px-6 py-4 bg-slate-100 border-2 border-slate-100 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-slate-400 cursor-not-allowed outline-none" />
                              <Lock className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                           </div>
                        </div>
                     </div>
                     {isNameEditing && (
                        <div className="flex gap-4 pt-6 border-t border-slate-50 animate-fade-in">
                           <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all">Save Changes</button>
                           <button type="button" onClick={() => { resetForm(); setIsNameEditing(false); }} className="px-8 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-900">Cancel</button>
                        </div>
                     )}
                  </Form>
               )}
            </Formik>
         </section>

         {/* Security Section */}
         <section className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl shadow-slate-200/40">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-[#F97316]">
                     <Lock size={24} />
                  </div>
                  <div>
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Security</h3>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Change your password</p>
                  </div>
               </div>
               {!isPasswordEditing && (
                 <button onClick={() => setIsPasswordEditing(true)} className="p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                    <Pencil size={18} />
                 </button>
               )}
            </div>

            {isPasswordEditing && (
              <Formik initialValues={{ currentPassword: "", newPassword: "", confirmPassword: "" }} validationSchema={PasswordSchema} onSubmit={handleUpdatePassword}>
                {({ isSubmitting, resetForm }) => (
                  <Form className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <Field name="currentPassword" type="password" placeholder="CURRENT PASSWORD" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                       <Field name="newPassword" type="password" placeholder="NEW PASSWORD" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                       <Field name="confirmPassword" type="password" placeholder="CONFIRM PASSWORD" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                    </div>
                    <div className="flex gap-4">
                       <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] transition-all disabled:opacity-50">
                         {isSubmitting ? "Updating..." : "Update Password"}
                       </button>
                       <button type="button" onClick={() => setIsPasswordEditing(false)} className="px-8 py-3 bg-white border border-slate-200 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-900">Cancel</button>
                    </div>
                  </Form>
                )}
              </Formik>
            )}
         </section>

         {/* Delete Section */}
         <section className="bg-rose-50 rounded-[2.5rem] border border-rose-100 p-10">
            <div className="flex items-center gap-6 mb-6">
               <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600">
                  <Trash2 size={24} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Delete Account</h3>
                  <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mt-0.5">Danger zone</p>
               </div>
            </div>
            <p className="text-[11px] font-medium text-rose-700 leading-relaxed max-w-xl mb-8">Permanently delete your supplier account. This action follows a 72-hour grace period.</p>
            <button className="px-8 py-4 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 shadow-xl shadow-rose-200 transition-all active:scale-95">
               Delete Account
            </button>
         </section>
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {message && (
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 right-10 z-50 bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl border border-slate-800">
               {message}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
