"use client";

import React, { useEffect, useState, use } from "react";
import { ArrowLeft, Download, Printer, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvoicePage({ params }) {
  const router = useRouter();
  const [id, setId] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    // Safely handle params which might be a promise in Next 15+
    Promise.resolve(params).then((p) => {
      setId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.replace("/login");
          return;
        }

        const res = await fetch(`/api/customer/orders/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Failed to load invoice details");
        }

        const data = await res.json();
        setOrder(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, router]);

  const handlePrint = () => {
    setIsDownloading(true);
    setTimeout(() => {
      window.print();
      setIsDownloading(false);
      showToast("Invoice downloaded successfully.");
    }, 800);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="w-10 h-10 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-bold uppercase tracking-widest text-xs">Loading Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <p className="text-rose-600 mb-4 font-bold">{error || "Order not found"}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-[#1E293B] text-white rounded-xl hover:bg-black font-black uppercase tracking-widest text-xs transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const subtotal = order.items?.reduce((acc, item) => acc + (Number(item.price) * item.qty), 0) || 0;
  const shipping = Number(order.total || subtotal) > subtotal ? Number(order.total) - subtotal : 0;

  const getStatusColor = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "completed") return "bg-emerald-50 text-emerald-600 border-emerald-200";
    if (s === "failed" || s === "cancelled") return "bg-rose-50 text-rose-600 border-rose-200";
    return "bg-amber-50 text-amber-600 border-amber-200";
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 font-sans print:bg-white print:py-0 print:px-0 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 flex items-center justify-between gap-3 bg-[#1E293B] text-white px-5 py-3 rounded-xl shadow-2xl animate-[slideIn_0.3s_ease-out]">
          <CheckCircle size={20} className="text-emerald-400" />
          <span className="font-medium text-sm">{toastMsg}</span>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb & Top Navigation */}
        <div className="print:hidden flex items-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
          <Link href="/customer/dashboard" className="hover:text-[#F97316] transition">Dashboard</Link>
          <span className="mx-2">&gt;</span>
          <Link href="/customer/orders" className="hover:text-[#F97316] transition">My Orders</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-[#1E293B]">Invoice #{order.id}</span>
        </div>

        {/* Print-hidden controls */}
        <div className="print:hidden flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-[#F97316] transition-colors font-black uppercase tracking-widest text-[10px] bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-100"
          >
            <ArrowLeft size={16} /> Back to Orders
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isDownloading}
              className="flex items-center gap-2 px-6 py-3 bg-[#F97316] text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-md hover:bg-[#e66000] transition disabled:opacity-75"
            >
              {isDownloading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Download size={16} />
              )}
              {isDownloading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        </div>

        {/* Invoice Paper */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 p-10 md:p-16 print:shadow-none print:border-none print:rounded-none text-[#1E293B]">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start justify-between border-b border-slate-100 pb-10 mb-10">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-[#F97316] mb-2">Stitch</h1>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Premium Atelier</p>
              <div className="mt-6 text-sm text-slate-500 space-y-1 font-medium">
                <p>123 Stitch Avenue, Fashion District</p>
                <p>Lahore, Pakistan, 54000</p>
                <p>contact@stitch.com</p>
              </div>
            </div>
            <div className="text-right mt-6 md:mt-0">
              <h2 className="text-3xl font-black text-slate-200 uppercase tracking-tight break-all">Invoice</h2>
              <div className="mt-6 text-sm text-slate-500 space-y-2 font-medium">
                <p><span className="font-bold text-[#1E293B]">Invoice No:</span> #{order.id}</p>
                <p><span className="font-bold text-[#1E293B]">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
                <p className="flex justify-end items-center gap-2 mt-3">
                  <span className="font-bold text-[#1E293B]">Status:</span> 
                  <span className={`uppercase tracking-widest text-[9px] px-3 py-1 rounded-full font-black border ${getStatusColor(order.status)}`}>
                    {order.status || "Pending"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-12 text-sm leading-relaxed grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <h3 className="font-black text-slate-300 text-[10px] uppercase tracking-widest mb-4">Bill To</h3>
              <div className="text-slate-500 font-medium">
                <p className="font-black text-[#1E293B] text-lg mb-1 tracking-tight uppercase">{order.first_name} {order.last_name}</p>
                <p>{order.email}</p>
              </div>
            </div>
            <div>
              <h3 className="font-black text-slate-300 text-[10px] uppercase tracking-widest mb-4">Ship To</h3>
              <div className="text-slate-500 font-medium">
                <p className="font-black text-[#1E293B] text-lg mb-1 tracking-tight uppercase">{order.first_name} {order.last_name}</p>
                <p>{order.address}</p>
                <p>{order.city}, {order.country || 'Pakistan'} {order.postal_code}</p>
                <p className="mt-2">Phone: <span className="text-[#1E293B]">{order.phone_number}</span></p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto mb-10">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100 text-[#1E293B] text-[10px] font-black uppercase tracking-widest">
                  <th className="py-4 px-2 text-left">Description</th>
                  <th className="py-4 px-2 text-right" style={{ textAlign: 'right' }}>Qty</th>
                  <th className="py-4 px-2 text-right" style={{ textAlign: 'right' }}>Unit Price</th>
                  <th className="py-4 px-2 text-right" style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {order.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-5 px-2">
                      <div className="font-black text-[#1E293B]">{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Premium Crafted</div>
                    </td>
                    <td className="py-5 px-2 text-right font-medium text-slate-600">{item.qty}</td>
                    <td className="py-5 px-2 text-right font-medium text-slate-600">Rs {Number(item.price).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
                    <td className="py-5 px-2 text-right font-black text-[#1E293B]">Rs {(item.price * item.qty).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex flex-col items-end pt-6">
            <div className="w-full md:w-1/2 lg:w-1/3 text-sm space-y-2">
              <div className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Subtotal</span>
                <span className="text-[#1E293B] font-black">Rs {Number(subtotal).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-2 px-3 border-b border-slate-100 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Shipping</span>
                <span className="text-[#1E293B] font-black">Rs {Number(shipping).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center py-5 px-4 text-xl mt-4 rounded-2xl bg-orange-50 border border-orange-100">
                <span className="text-[#F97316] font-black tracking-widest uppercase text-xs">Total</span>
                <span className="text-[#F97316] font-black">Rs {Number(order.total).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Footer Area */}
          <div className="mt-24 pt-8 border-t border-slate-100 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            <p className="text-[#1E293B] mb-2">Thank you for your order</p>
            <p>If you have any questions concerning this invoice, contact support@stitch.com</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { 
            background: white !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
          }
        }
      `}</style>
    </div>
  );
}
