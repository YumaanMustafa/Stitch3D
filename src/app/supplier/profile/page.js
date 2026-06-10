"use client";
import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { User, Mail, Building2, Lock, Save, Pencil } from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";

/**
 * @file page.js
 * @description Supplier Profile - Simplified Text & Modern Light Theme.
 */

const SupplierProfileSchema = Yup.object().shape({
  name: Yup.string().required("Required"),
  email: Yup.string().email("Invalid email").required("Required"),
  company: Yup.string().required("Required"),
});

export default function SupplierProfile() {
  const [initialValues, setInitialValues] = useState({
    name: "Material Pro",
    email: "supplier@stitch.com",
    company: "Pro Materials Ltd.",
  });

  const [conf, setConf] = useState({ open: false, title: "", message: "", type: "warning", onConfirm: () => { }, hideCancel: false });
  const showAlert = (title, message, type = "success") => setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => { } });

  const handleSubmit = (values, { setSubmitting }) => {
    showAlert("Success", "Profile updated successfully.");
    setSubmitting(false);
  };

  return (
    <div className="space-y-12 pb-20 animate-fade-in max-w-4xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <h2 className="text-[10px] font-black text-[#F97316] uppercase tracking-[0.4em] mb-3">Identity</h2>
           <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Store Profile</h1>
           <p className="text-sm font-medium text-slate-500 mt-2">Manage your public supplier identity and business info.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-xl shadow-slate-200/40">
        <Formik
          initialValues={initialValues}
          validationSchema={SupplierProfileSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting }) => (
            <Form className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Supplier Name</label>
                     <div className="relative">
                        <Field name="name" placeholder="YOUR NAME" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                        <User className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                     <div className="relative">
                        <Field name="email" type="email" placeholder="EMAIL" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                        <Mail className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                     </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Company Name</label>
                     <div className="relative">
                        <Field name="company" placeholder="COMPANY" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 focus:border-[#F97316] focus:bg-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest outline-none transition-all" />
                        <Building2 className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                     </div>
                  </div>
               </div>

               <div className="pt-8 border-t border-slate-50 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#F97316] shadow-xl shadow-slate-200 transition-all flex items-center gap-3"
                  >
                    <Save size={18} /> {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
               </div>
            </Form>
          )}
        </Formik>
      </div>

      <ConfirmationModal isOpen={conf.open} onClose={() => setConf({ ...conf, open: false })} onConfirm={conf.onConfirm} title={conf.title} message={conf.message} type={conf.type} hideCancel={conf.hideCancel} confirmText="OK" />
    </div>
  );
}
