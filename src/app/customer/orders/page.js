
"use client";
import Logo from '@/app/components/Logo';
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Footer from '@/app/components/AppFooter';
import Header from '@/app/components/AppHeader';
import {
  Eye,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  Package,
  ArrowLeft,
  Download,
  MessageSquare,
  Clock,
  CheckCircle,
  Loader,
  ChevronDown,
  Truck,
  Star
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Button from "@/app/components/ui/Button";

/**
 * @file page.js
 * @description Customer Order History Page.
 * Lists past and active orders with filtering, sorting, and details view.
 * Allows cancelling pending orders.
 */

const API_BASE = "";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  in_progress: {
    label: "In Progress",
    icon: Loader,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    badge: "bg-orange-100 text-orange-800",
  },
  processing: {
    label: "Processing",
    icon: Loader,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    badge: "bg-orange-100 text-orange-800",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    color: "bg-orange-50 text-orange-700 border-orange-200",
    badge: "bg-orange-100 text-orange-800",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  cancelled: {
    label: "Cancelled",
    icon: Trash2,
    color: "bg-rose-50 text-rose-700 border-rose-200",
    badge: "bg-rose-100 text-rose-800",
  },
};

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [page, setPage] = useState(1);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [busyOrders, setBusyOrders] = useState({});
  const [toast, setToast] = useState({ message: "", type: "" });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const perPage = 5;

  const searchParams = useSearchParams();

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ message: "", type: "" }), 3000);
  };

  // Helper
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }

    // Check for order success
    if (searchParams.get("success") === "true") {
      showToast("success", "Order placed successfully!");
      router.replace("/customer/orders", undefined, { shallow: true });
    }

    (async () => {
      try {
        setLoading(true);
        // Use relative path
        const res = await fetch(`/api/customer/orders/my`, {
          headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.replace('/login');
            return;
          }
          throw new Error('Failed to fetch orders');
        }

        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Orders fetch error:", err);
        showToast("error", "Failed to load orders");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const filtered = useMemo(() => {
    let result = orders;

    // Query filter
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (o) =>
          String(o.id || "").toLowerCase().includes(q) ||
          (o.items && o.items.some((it) => String(it.name || "").toLowerCase().includes(q)))
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date();
      result = result.filter((o) => {
        const orderDate = new Date(o.created_at);
        const daysDiff = (now - orderDate) / (1000 * 60 * 60 * 24);
        if (timeFilter === "week") return daysDiff <= 7;
        if (timeFilter === "month") return daysDiff <= 30;
        return true;
      });
    }

    // Sorting
    if (sortBy === "recent") {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.total - a.total);
    } else if (sortBy === "price-low") {
      result.sort((a, b) => a.total - b.total);
    }

    return result;
  }, [orders, query, statusFilter, timeFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    const orderId = orderToDelete;

    const t = getToken();
    if (!t) {
      router.replace("/login");
      return;
    }
    setBusyOrders((b) => ({ ...b, [orderId]: true }));
    try {
      const res = await fetch(`/api/customer/orders/${encodeURIComponent(orderId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");

      // Remove from list
      setOrders((prev) => prev.filter(o => o.id !== orderId));

      showToast("success", data.message || "Order deleted");
      setIsDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error("Delete error:", err);
      showToast("error", err.message || "Failed to delete order");
    } finally {
      setBusyOrders((b) => ({ ...b, [orderId]: false }));
    }
  };

  const handleDeleteClick = (orderId) => {
    setOrderToDelete(orderId);
    setIsDeleteModalOpen(true);
  };

  const trackOrder = (order) => {
    router.push(`/customer/track/${order.id}`);
  };

  const downloadInvoice = (orderId) => {
    window.open(`/customer/orders/invoice/${orderId}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2"> Order History</h1>
          <p className="text-gray-600">Track and manage all your leather jacket orders in one place</p>
        </div>

        {/* Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search order ID or jacket name..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-10 py-2.5 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-orange-600 focus:bg-white transition"
              />
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm font-medium focus:outline-none focus:border-orange-600 transition"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Time Filter */}
              <select
                value={timeFilter}
                onChange={(e) => {
                  setTimeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm font-medium focus:outline-none focus:border-orange-600 transition"
              >
                <option value="all">All Time</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm font-medium focus:outline-none focus:border-orange-600 transition"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest</option>
                <option value="price-high">Price: High to Low</option>
                <option value="price-low">Price: Low to High</option>
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => {
                  const t = getToken();
                  if (!t) {
                    router.replace("/login");
                    return;
                  }
                  (async () => {
                    try {
                      const res = await fetch(`${API_BASE}/api/customer/orders/my`, {
                        headers: { Authorization: `Bearer ${t}` },
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setOrders(Array.isArray(data) ? data : []);
                        showToast("success", "Orders refreshed");
                      }
                    } catch (err) {
                      showToast("error", "Refresh failed");
                    }
                  })();
                }}
                className="p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-colors"
                title="Refresh orders"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Results Info */}
          <div className="text-sm text-gray-600">
            <strong className="text-gray-900">{filtered.length}</strong> orders found
          </div>
        </motion.div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white rounded-xl border border-gray-200 flex p-5 gap-4">
                <div className="w-20 h-20 rounded-lg animate-pulse-shimmer flex-shrink-0" />
                <div className="flex-1 space-y-3 py-2">
                  <div className="h-4 rounded animate-pulse-shimmer w-1/4" />
                  <div className="h-5 rounded animate-pulse-shimmer w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-[2rem] p-16 text-center shadow-sm"
          >
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-400 shadow-inner">
              <Package size={40} />
            </div>
            <p className="text-2xl font-black text-gray-900 mb-3">No orders found</p>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              We couldn't find any orders matching your criteria. Try adjusting your filters or place your first order.
            </p>
            <Button variant="solid" onClick={() => router.push('/customer/shop')}>
              Browse Collection
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.1 } },
            }}
            className="space-y-4"
          >
            {paged.map((order) => {
              const statusConfig = STATUS_CONFIG[(order.status || "").toLowerCase()];
              const StatusIcon = statusConfig?.icon || Package;
              const isExpanded = expandedOrder === order.id;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all"
                >
                  {/* Order Header */}
                  <div
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    className="p-5 cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Jacket Image */}
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                        <img
                          src={order.image || "https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=200&h=200&fit=crop"}
                          alt={order.items?.[0]?.name || "Jacket"}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded tracking-wider uppercase">
                                #{order.id}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">
                              {order.items?.[0]?.name || "Custom Leather Jacket"}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Ordered {formatDate(order.created_at)}
                            </p>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""
                              }`}
                          />
                        </div>

                        {/* Status & Info */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusConfig?.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig?.label || order.status}
                          </span>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                            <Package className="w-3.5 h-3.5" />
                            {order.items_count} {order.items_count === 1 ? "Item" : "Items"}
                          </div>
                          <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                          <div className="text-[11px] text-gray-500 font-medium uppercase tracking-tighter">
                            {order.shipping || "Standard Delivery"}
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">
                          Rs {Number(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border-t border-gray-200"
                      >
                        <div className="p-5 bg-gray-50 space-y-4">
                          {/* Items List */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                              Order Items
                            </h4>
                            <div className="space-y-3">
                              {order.items?.map((item, idx) => (
                                <div key={`${order.id}-item-${idx}`} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                                    <img
                                      src={item.image || "/assets/placeholder-jacket.png"}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                                    <p className="text-[11px] text-gray-500 font-medium">
                                      Qty: {item.qty} × Rs {Number(item.price).toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-2">
                                    <p className="font-black text-gray-900 text-sm">
                                      Rs {(item.price * item.qty).toLocaleString()}
                                    </p>
                                    {(order.status === 'delivered' || order.status === 'completed') && item.design_id && /^[0-9]+$/.test(item.design_id) && !item.is_custom && (
                                      <button
                                        onClick={() => router.push(`/customer/shop/${item.design_id}`)}
                                        className="text-[10px] font-bold text-orange-600 hover:text-orange-800 underline underline-offset-2 flex items-center gap-1"
                                      >
                                        <Star size={10} fill="currentColor" /> Leave Review
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Summary */}
                          <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Subtotal</span>
                              <span className="font-medium text-gray-900">
                                Rs {Number(order.total * 0.9).toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Shipping</span>
                              <span className="font-medium text-gray-900">
                                Rs {Number(order.total * 0.1).toFixed(2)}
                              </span>
                            </div>
                            <div className="border-t border-gray-200 pt-2 flex justify-between">
                              <span className="font-semibold text-gray-900">Total</span>
                              <span className="font-bold text-orange-600">
                                Rs {Number(order.total).toFixed(2)}
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => handleDeleteClick(order.id)}
                              disabled={!!busyOrders[order.id] || !order.can_cancel}
                              className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${order.can_cancel
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                }`}
                              title={!order.can_cancel ? "This order cannot be cancelled" : "Cancel Order"}
                            >
                              <Trash2 className="w-4 h-4" />
                              Cancel Order
                            </button>

                            <button
                              onClick={() => trackOrder(order)}
                              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
                            >
                              Track Package
                            </button>

                            <button
                              onClick={() => downloadInvoice(order.id)}
                              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Invoice
                            </button>

                            <button
                              onClick={() => showToast("info", "Chat with seller feature coming soon!")}
                              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        )
        }

        {/* Pagination */}
        {
          filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-8 flex items-center justify-between"
            >
              <p className="text-sm text-gray-600">
                Showing{" "}
                <strong className="text-gray-900">
                  {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)}
                </strong>{" "}
                of <strong className="text-gray-900">{filtered.length}</strong> orders
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrev}
                  disabled={page === 1}
                  className={`p-2 rounded-lg border transition-colors ${page === 1
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Page Numbers */}
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg font-medium transition-colors ${page === pageNum
                          ? "bg-orange-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleNext}
                  disabled={page === totalPages}
                  className={`p-2 rounded-lg border transition-colors ${page === totalPages
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )
        }
      </div >

      {/* Toast Notification */}
      < AnimatePresence >
        {
          toast.message && (
            <motion.div
              initial={{ opacity: 0, y: 20, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 20, x: 20 }}
              className={`fixed bottom-6 right-6 px-5 py-4 rounded-lg shadow-xl border z-50 ${toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-orange-50 border-orange-200 text-orange-800"
                }`}
            >
              <p className="font-semibold text-sm">{toast.message}</p>
            </motion.div>
          )
        }
      </AnimatePresence >
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-8 rounded-2xl max-w-sm w-full text-center shadow-2xl border border-gray-100"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Order?</h3>
              <p className="text-gray-500 mb-8">
                Are you sure you want to delete this order? This action cannot be undone.
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-6 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-lg shadow-rose-900/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}