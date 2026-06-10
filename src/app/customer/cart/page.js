// File: app/customer/cart/page.js
// Purpose: Premium shopping cart with conversion optimization
// Author: Stitch-Dev
// Env Required: None

"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  Truck,
  Lock,
  Gift,
  CheckCircle,
  CreditCard
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Button from "@/app/components/ui/Button";
import { useToast } from "@/app/context/ToastContext";
import { useCart } from "../../context/CartContext";

/**
 * @file page.js
 * @description Shopping Cart Page.
 * Manages cart items (add, remove, update quantity) using `CartContext`.
 * Calculates subtotal and checkout readiness.
 */

const SHIPPING_FEE = 500; // PKR
const FREE_SHIPPING_THRESHOLD = 5000; // PKR

export default function CartPage() {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQuantity, isLoading } = useCart();
  const { showToast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  /* ================= CALCULATIONS ================= */

  const subtotal = useMemo(
    () =>
      cartItems.reduce((acc, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 1;
        return acc + price * qty;
      }, 0),
    [cartItems]
  );

  const shippingFee = 0; // Free shipping for premium users
  const total = subtotal + shippingFee;

  /* ================= HANDLERS ================= */

  const handleUpdateQuantity = (id, qty) => {
    updateQuantity(id, qty);
  };

  const handleRemoveItem = (id) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      removeFromCart(itemToDelete);
      showToast("Item removed from cart", "success");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  /* ================= LOADING STATE ================= */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#ff6b00] border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Cart...</p>
        </div>
      </div>
    );
  }

  /* ================= MAIN RENDER ================= */

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow hover:scale-105 transition-transform text-slate-700">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-black tracking-tighter">MY CART</h1>
        </div>

        {/* Content */}
        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white p-16 rounded-[32px] border border-slate-200 shadow-sm text-center">
            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-400 shadow-inner">
              <ShoppingCart size={48} />
            </div>
            <p className="text-2xl font-black text-slate-900 mb-3">Your cart is feeling light</p>
            <p className="text-slate-500 mb-10 max-w-md mx-auto leading-relaxed">It looks like you haven't added anything to your cart yet. Explore our premium collections or start a bespoke custom design.</p>
            <div className="flex gap-4">
              <Button variant="solid" onClick={() => router.push('/customer/shop')}>
                Browse Shop
              </Button>
              <Button variant="outline" onClick={() => router.push('/customer/customize')}>
                Custom Studio
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex gap-6 bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="relative w-32 h-32 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                    <Image
                      src={item.img || '/assets/placeholder-jacket.png'}
                      alt={item.title}
                      fill
                      className="object-contain p-2 mix-blend-multiply"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h2 className="font-bold text-xl text-slate-900">{item.title}</h2>
                        <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {item.color && <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 rounded">{item.color}</span>}
                        {item.material && <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500 rounded">{item.material}</span>}
                      </div>
                    </div>

                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-1">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity === 1}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm disabled:opacity-50 hover:bg-slate-100 transition-colors text-slate-700"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold font-mono text-sm w-4 text-center text-slate-900">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-white rounded shadow-sm hover:bg-slate-100 transition-colors text-slate-700"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="text-xl font-black text-slate-900">Rs. {(item.price * item.quantity).toLocaleString("en-PK")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-white border border-slate-200 text-slate-900 p-8 rounded-[32px] shadow-lg h-fit sticky top-8">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <CreditCard className="text-[#ff6b00]" /> Order Summary
              </h2>

              <div className="space-y-4 mb-8 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-900">Rs. {subtotal.toLocaleString("en-PK")}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Shipping</span>
                  <span className="font-mono text-[#ff6b00]">{shippingFee === 0 ? "FREE" : `Rs. ${shippingFee.toLocaleString("en-PK")}`}</span>
                </div>
                <div className="h-px bg-slate-100 my-4" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="font-mono text-[#ff6b00]">Rs. {total.toLocaleString("en-PK")}</span>
                </div>
              </div>

              <button
                onClick={() => router.push("/customer/checkout")}
                className="w-full py-4 bg-[#ff6b00] text-white rounded-xl font-bold uppercase tracking-wide hover:bg-[#e66000] transition-colors shadow-lg shadow-orange-900/30 flex items-center justify-center gap-2"
              >
                Proceed to Checkout <Truck size={18} />
              </button>

              <div className="mt-6 flex flex-col gap-3 text-[10px] text-slate-500 font-medium uppercase tracking-wider text-center">
                <span className="flex items-center justify-center gap-2"><Lock size={12} /> Secure 256-bit Encryption</span>
                <span className="flex items-center justify-center gap-2"><CheckCircle size={12} /> 100% Satisfaction Guarantee</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div key="delete-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 p-8 rounded-[32px] max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Item?</h3>
              <p className="text-slate-500 mb-8">Are you sure you want to remove this item from your cart? This action cannot be undone.</p>

              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 px-6 rounded-xl font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-6 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-900/10"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
