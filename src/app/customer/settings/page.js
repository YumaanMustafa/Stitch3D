"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import {
  Shield,
  Bell,
  Lock,
  Pencil,
  CreditCard,
  Globe,
  Trash2,
  ArrowLeft,
  Save,
  CheckCircle,
  AlertCircle,
  Check,
  X,
  User
} from "lucide-react";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Logo from '@/app/components/Logo';
import Footer from '@/app/components/AppFooter';
import AccountLayout from "../components/AccountLayout";

/**
 * @file page.js
 * @description Customer Account Settings.
 * Manage Password, Notifications, and other preferences.
 * Handles security updates via `/api/auth/profile/password`.
 */

const API_BASE = "/api/auth";

const PasswordSchema = Yup.object().shape({
  oldPassword: Yup.string().required("Current password is required"),
  newPassword: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword'), null], "New passwords do not match")
    .required("Please confirm your new password"),
});

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("security");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ type: "", message: "" });
  const [initialNotifications, setInitialNotifications] = useState({
    orderUpdates: true,
    newArrivals: true,
    promotions: false,
    emailNotifications: false
  });
  const [profile, setProfile] = useState(null);

  const token = () => (typeof window === "undefined" ? null : localStorage.getItem("token"));

  const showAlert = (type, message, ms = 4000) => {
    setAlert({ type, message });
    if (ms) setTimeout(() => setAlert({ type: "", message: "" }), ms);
  };
  useEffect(() => {
    const t = token();
    if (!t) {
      router.replace("/login");
      return;
    }
    const savedNotifications = localStorage.getItem("notifications");
    if (savedNotifications) setInitialNotifications(JSON.parse(savedNotifications));

    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);

    fetch("/api/customer/profile", {
      headers: { Authorization: `Bearer ${t}` }
    })
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, [router, searchParams]);

  const handlePasswordChange = async (values, { setSubmitting, resetForm }) => {
    try {
      const res = await fetch(`${API_BASE}/profile/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({
          oldPassword: values.oldPassword,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Password update failed");

      resetForm();
      showAlert("success", "Password changed successfully");
      return true;
    } catch (err) {
      showAlert("error", err.message);
      return false;
    } finally {
      setSubmitting(false);
    }
  };
  const handleNotificationsSave = async (values, { setSubmitting }) => {
    try {
      localStorage.setItem("notifications", JSON.stringify(values));
      setInitialNotifications(values);
      showAlert("success", "Notification preferences saved");
    } catch (err) {
      showAlert("error", "Failed to save preferences");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-orange-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-zinc-400 font-medium">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <AccountLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "security" && (
            <SecuritySection
              handlePasswordChange={handlePasswordChange}
            />
          )}

          {activeTab === "notifications" && (
            <NotificationsSection
              initialValues={initialNotifications}
              handleSave={handleNotificationsSave}
            />
          )}

          {activeTab === "payment" && <PaymentSection profile={profile} onUpdate={(p) => setProfile(p)} showAlert={showAlert} />}
          {activeTab === "account" && <AccountSection showAlert={showAlert} />}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {alert.message && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-8 right-8 z-[10000] p-4 rounded-xl shadow-xl border flex items-center gap-3 max-w-sm backdrop-blur-sm ${alert.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
          >
            {alert.type === "error" ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <p className="text-sm font-medium">{alert.message}</p>
            <button onClick={() => setAlert({ type: "", message: "" })} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </AccountLayout>
  );
}


function SecuritySection({ handlePasswordChange }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      <Section
        title="Update Password"
        icon={Lock}
        action={
          !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-bold text-[#F97316] hover:bg-orange-50 px-4 py-2 rounded-xl transition-all border border-orange-100"
            >
              <Pencil className="w-4 h-4 inline-block mr-2" />
            </button>
          )
        }
      >
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xl leading-none text-slate-300 font-black tracking-[0.3em]">••••••••••••</span>
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2"></span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
              <Shield className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase tracking-widest">Encrypted</span>
            </div>
          </div>
        ) : (
          <Formik
            initialValues={{ oldPassword: "", newPassword: "", confirmPassword: "" }}
            validationSchema={PasswordSchema}
            onSubmit={async (values, actions) => {
              const success = await handlePasswordChange(values, actions);
              if (success) setIsEditing(false);
            }}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-6">
                <Field
                  label="Current Password"
                  name="oldPassword"
                  type="password"
                  component={FormikInput}
                  placeholder="Enter your current password"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="New Password"
                    name="newPassword"
                    type="password"
                    component={FormikInput}
                    placeholder="Min. 6 characters"
                  />
                  <Field
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    component={FormikInput}
                    placeholder="Re-enter new password"
                  />
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3.5 bg-[#F97316] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-[#e66000] transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={isSubmitting}
                    className="px-8 py-3.5 bg-slate-100 text-slate-600 text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        )}
      </Section>
    </div>
  );
}

// Notifications Section
function NotificationsSection({ initialValues, handleSave }) {
  return (
    <Section title="Notification Preferences" icon={Bell}>
      <Formik
        initialValues={initialValues}
        enableReinitialize={true}
        onSubmit={handleSave}
      >
        {({ values, setFieldValue, isSubmitting }) => (
          <Form>
            <div className="space-y-2">
              <ToggleSwitch
                label="Order Updates"
                description="Get notified about order status changes"
                enabled={values.orderUpdates}
                onChange={(val) => setFieldValue("orderUpdates", val)}
              />
              <div className="h-px bg-slate-50 my-1"></div>
              <ToggleSwitch
                label="New Custom Designs"
                description="Be the first to know about latest bespoke jacket releases"
                enabled={values.newArrivals}
                onChange={(val) => setFieldValue("newArrivals", val)}
              />
              <div className="h-px bg-slate-50 my-1"></div>
              <ToggleSwitch
                label="Promotions & Offers"
                description="Receive exclusive deals and discounts"
                enabled={values.promotions}
                onChange={(val) => setFieldValue("promotions", val)}
              />
              <div className="h-px bg-slate-50 my-1"></div>
              <ToggleSwitch
                label="Email Notifications"
                description="Get important system updates directly to your inbox"
                enabled={values.emailNotifications}
                onChange={(val) => setFieldValue("emailNotifications", val)}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-10 px-8 py-3.5 bg-[#F97316] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-[#e66000] transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Save Preferences"}
            </button>
          </Form>
        )}
      </Formik>
    </Section>
  );
}

// Payment Section
function PaymentSection({ profile, onUpdate, showAlert }) {
  const [isAdding, setIsAdding] = useState(false);
  const [cardData, setCardData] = useState({ number: "", expiry: "", cvv: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    if (!cardData.number || !cardData.expiry) {
      showAlert("error", "Please fill all fields");
      return;
    }

    setIsProcessing(true);
    try {
      const last4 = cardData.number.slice(-4);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/customer/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...profile,
          payment_card_last4: last4,
          payment_card_expiry: cardData.expiry
        })
      });

      if (!res.ok) throw new Error("Failed to save card");

      onUpdate({ ...profile, payment_card_last4: last4, payment_card_expiry: cardData.expiry });
      setIsAdding(false);
      showAlert("success", "Card saved successfully");
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/customer/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...profile,
          payment_card_last4: null,
          payment_card_expiry: null
        })
      });

      if (!res.ok) throw new Error("Failed to remove card");

      onUpdate({ ...profile, payment_card_last4: null, payment_card_expiry: null });
      showAlert("success", "Card removed");
    } catch (err) {
      showAlert("error", err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasPayment = profile?.payment_card_last4;

  return (
    <Section title="Payment Methods" icon={CreditCard}>
      {hasPayment ? (
        <div className="p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between group hover:border-orange-100 transition-all">
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl shadow-sm text-[#1E293B] group-hover:text-[#F97316] transition-colors">
              <CreditCard className="w-7 h-7" />
            </div>
            <div>
              <p className="font-black text-[#1E293B]">Visa ending in •••• {profile.payment_card_last4}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Expires {profile.payment_card_expiry}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={isProcessing}
            className="px-4 py-2 text-rose-500 text-xs font-black uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
          >
            {isProcessing ? "Removing..." : "Remove"}
          </button>
        </div>
      ) : isAdding ? (
        <div className="space-y-6 max-w-sm mx-auto p-8 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Card Number"
              maxLength={16}
              value={cardData.number}
              onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
              className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] outline-none transition-all"
            />
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="MM/YY"
                maxLength={5}
                value={cardData.expiry}
                onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                className="w-1/2 px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] outline-none transition-all"
              />
              <input
                type="text"
                placeholder="CVC"
                maxLength={3}
                value={cardData.cvv}
                onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                className="w-1/2 px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] outline-none transition-all"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="w-full py-4 bg-[#F97316] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-orange-500/20 hover:bg-[#e66000] transition-all disabled:opacity-50"
          >
            {isProcessing ? "Saving..." : "Save Card"}
          </button>
          <button onClick={() => setIsAdding(false)} className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <CreditCard className="w-10 h-10" />
          </div>
          <h4 className="text-xl font-black text-[#1E293B] mb-2 tracking-tight">No Payment Methods</h4>
          <p className="text-slate-500 mb-8 font-medium">Add a card to speed up your future checkouts.</p>
          <button onClick={() => setIsAdding(true)} className="px-10 py-4 bg-[#1E293B] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-black transition-all">
            Add Payment Method
          </button>
        </div>
      )}
    </Section>
  );
}

// Account Section
function AccountSection({ showAlert }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isReasonModalOpen || isRestoreModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isReasonModalOpen, isRestoreModalOpen]);

  const [deletionStatus, setDeletionStatus] = useState("idle"); // idle, pending
  const [requestTime, setRequestTime] = useState(null);
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState("");

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === "deletion_requested") {
        setDeletionStatus("pending");
        setRequestTime(data.deletion_requested_at);
      } else {
        setDeletionStatus("idle");
      }
    } catch (err) {
      console.error("Failed to check account status", err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleRequestDeletion = async () => {
    setModalError("");

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/profile", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        setIsReasonModalOpen(false);
        await checkStatus();
        showAlert("success", "Account scheduled for deletion in 72 hours.");
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (err) {
      showAlert("error", "Failed to request account deletion");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsCancelling(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: "cancel_deletion" })
      });
      if (res.ok) {
        showAlert("success", "Your account has been restored successfully.");
        await checkStatus();
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cancel deletion");
      }
    } catch (err) {
      console.error("Restore Error:", err);
      showAlert("error", err.message || "Failed to restore account");
    } finally {
      setIsCancelling(false);
      setIsRestoreModalOpen(false);
    }
  };

  const getRemainingTime = () => {
    if (!requestTime) return "72 hours";
    const reqDate = new Date(requestTime);
    const now = new Date();
    const diff = 72 - Math.floor((now - reqDate) / (1000 * 60 * 60));
    return diff > 0 ? `${diff} hours` : "processing...";
  };

  return (
    <Section title="Account Management" icon={Trash2}>
      <div className="space-y-6">
        <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${deletionStatus === 'pending' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100'}`}>
          <div className="flex items-center gap-6 mb-6">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm ${deletionStatus === 'pending' ? 'bg-white text-amber-600' : 'bg-white text-rose-600'}`}>
              {deletionStatus === 'pending' ? <AlertCircle size={32} /> : <Trash2 size={32} />}
            </div>
            <div>
              <h4 className={`text-2xl font-black uppercase tracking-tight ${deletionStatus === 'pending' ? 'text-amber-900' : 'text-rose-900'}`}>
                {deletionStatus === 'pending' ? 'Account Set for Deletion' : 'Permanently Delete Account'}
              </h4>
              <p className={`text-xs font-black uppercase tracking-widest mt-1 ${deletionStatus === 'pending' ? 'text-amber-600' : 'text-rose-600'}`}>
                {deletionStatus === 'pending' ? `Scheduled for removal in ${getRemainingTime()}` : 'Data removal takes 72 hours to complete'}
              </p>
            </div>
          </div>

          <p className={`text-sm mb-10 font-medium leading-relaxed ${deletionStatus === 'pending' ? 'text-amber-700/80' : 'text-rose-700/80'}`}>
            {deletionStatus === 'pending'
              ? 'We are sorry to see you go. Your account is currently in the 72-hour grace period. You can restore your account anytime before this window closes.'
              : 'Once you request deletion, your account will be disabled and scheduled for permanent removal after 72 hours. All your custom designs and order history will be lost.'}
          </p>

          <div className="flex gap-4">
            {deletionStatus === 'pending' ? (
              <button
                onClick={() => setIsRestoreModalOpen(true)}
                className="bg-[#1E293B] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-black transition-all flex items-center gap-2"
              >
                Restore Account
              </button>
            ) : (
              <button
                onClick={() => setIsReasonModalOpen(true)}
                className="px-10 py-4 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-rose-600/20 active:scale-95 flex items-center gap-2"
              >
                <Trash2 size={20} />
                Request Deletion
              </button>
            )}
          </div>
        </div>
      </div>

      {mounted && createPortal(
        <AnimatePresence>
          {isReasonModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsReasonModalOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white p-10 rounded-[3rem] max-w-lg w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] border border-slate-100"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-3xl font-black text-[#1E293B] uppercase tracking-tight">Final Exit</h3>
                  <button onClick={() => setIsReasonModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">✕</button>
                </div>

                <p className="text-slate-500 text-lg mb-8 font-medium leading-relaxed">We're sorry to see you go. Please let us know why you're leaving so we can improve the Stitch experience.</p>

                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (modalError) setModalError("");
                  }}
                  placeholder="Your feedback matters..."
                  className={`w-full h-40 bg-slate-50 border-2 rounded-3xl p-6 text-slate-700 font-medium outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all resize-none ${modalError ? 'border-rose-200 ring-4 ring-rose-500/5' : 'border-slate-100'}`}
                />
                {modalError && <p className="text-rose-500 text-xs font-black uppercase tracking-widest mt-3 ml-2">{modalError}</p>}

                <div className="flex gap-4 mt-10">
                  <button
                    onClick={() => setIsReasonModalOpen(false)}
                    className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Stay with us
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleRequestDeletion}
                    className="flex-1 py-5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest rounded-[2rem] shadow-2xl shadow-rose-600/30 transition-all active:scale-95"
                  >
                    {isDeleting ? "Submitting..." : "Delete Now"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <ConfirmationModal
        isOpen={isRestoreModalOpen}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={handleCancelDeletion}
        title="Restore Account"
        message="Are you sure you want to cancel the deletion and restore your account?"
        confirmText={isCancelling ? "Restoring..." : "Yes, Restore Account"}
        cancelText="Keep Pending"
      />
    </Section>
  );
}

// Reusable Components - Updated to accept 'action' prop for header buttons
function Section({ title, icon: Icon, action, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {Icon && (
            <div className="p-2.5 bg-orange-50 text-[#F97316] rounded-xl">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <h2 className="text-xl font-black text-[#1E293B] tracking-tight">{title}</h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-8">{children}</div>
    </div>
  );
}

function FormikInput({ label, field, form: { touched, errors }, ...props }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <input
        {...field}
        {...props}
        className={`w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold text-sm focus:ring-4 focus:ring-orange-500/10 focus:border-[#F97316] transition-all outline-none ${touched[field.name] && errors[field.name] ? 'border-rose-100' : 'hover:border-slate-200'}`}
      />
      {touched[field.name] && errors[field.name] && (
        <div className="mt-2 text-xs text-rose-500 font-black uppercase tracking-widest ml-1">{errors[field.name]}</div>
      )}
    </div>
  );
}

function ToggleSwitch({ label, description, enabled, onChange }) {
  return (
    <div className="flex items-start justify-between py-5 group">
      <div className="flex-1 pr-8">
        <p className="font-bold text-[#1E293B] text-lg group-hover:text-[#F97316] transition-colors">{label}</p>
        {description && <p className="text-sm text-slate-500 font-medium mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${enabled ? "bg-[#F97316]" : "bg-slate-200"
          }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${enabled ? "translate-x-6" : "translate-x-1"
            }`}
        />
      </button>
    </div>
  );
}