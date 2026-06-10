"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Box, Truck, CheckCircle, PackageSearch, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const STAGES = [
    { id: 'pending', label: "Order Placed", icon: Box, desc: "We've received your order" },
    { id: 'processing', label: "Processing", icon: PackageSearch, desc: "Your vendor is assembling materials" },
    { id: 'shipped', label: "Shipped", icon: Truck, desc: "Your order is on its way" },
    { id: 'delivered', label: "Delivered", icon: CheckCircle, desc: "Enjoy your custom jacket!" }
];

export default function OrderTrackingPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/login");
            return;
        }

        const fetchOrder = async () => {
            try {
                // Since there isn't a direct /customer/orders/[id] API in context, fetch all and find
                const res = await fetch('/api/customer/orders/my', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.ok) {
                    const orders = await res.json();
                    const target = orders.find(o => String(o.id) === String(params.id));
                    if (target) {
                        setOrder(target);
                    }
                }
            } catch (err) {
                console.error("Order track fetch err", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
                <div className="flex-1 flex justify-center items-center text-gray-400">
                    <Loader2 className="w-10 h-10 animate-spin" />
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
                <div className="flex-1 max-w-4xl mx-auto w-full p-6 text-center mt-20">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
                    <p className="text-gray-500 mb-6">We couldn't locate this order in your account.</p>
                    <Link href="/customer/orders" className="text-orange-600 font-bold hover:underline">
                        Return to Orders
                    </Link>
                </div>
            </div>
        );
    }

    // Determine current step index
    // Treat 'in_progress' and 'processing' the same map to index 1
    const rawStatus = (order.status || 'pending').toLowerCase();
    let currentStepIndex = 0;
    if (['processing', 'in_progress'].includes(rawStatus)) currentStepIndex = 1;
    else if (rawStatus === 'shipped') currentStepIndex = 2;
    else if (rawStatus === 'delivered' || rawStatus === 'completed') currentStepIndex = 3;

    return (
        <div className="min-h-screen bg-white flex flex-col pt-12 pb-12">
            <div className="max-w-4xl mx-auto w-full px-6 flex-1">
                <button
                    onClick={() => router.push('/customer/orders')}
                    className="flex items-center gap-2 text-slate-400 hover:text-[#F97316] transition-colors font-black uppercase tracking-widest text-[10px] mb-8"
                >
                    <ArrowLeft size={16} /> Back to Orders
                </button>

                <div className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100">
                    <div className="text-center mb-16">
                        <h1 className="text-3xl md:text-4xl font-black text-[#1E293B] tracking-tight uppercase mb-4">Track Your Order</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID: #{order.id}</p>
                    </div>

                    <div className="relative max-w-2xl mx-auto">
                        {/* Connecting Line background */}
                        <div className="absolute left-[39px] md:left-[55px] top-6 bottom-6 w-1 bg-slate-100 z-0 rounded-full" />
                        
                        {/* Connecting Line fill */}
                        <div 
                            className="absolute left-[39px] md:left-[55px] top-6 w-1 bg-[#F97316] z-0 rounded-full transition-all duration-1000 ease-out" 
                            style={{ height: `${(currentStepIndex / (STAGES.length - 1)) * 100}%` }}
                        />

                        <div className="space-y-16">
                            {STAGES.map((stage, idx) => {
                                const isCompleted = idx <= currentStepIndex;
                                const isCurrent = idx === currentStepIndex;
                                const Icon = stage.icon;

                                return (
                                    <motion.div 
                                        key={stage.id} 
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.15 }}
                                        className="relative z-10 flex items-start gap-8 md:gap-12"
                                    >
                                        <div className={`
                                            w-20 h-20 md:w-28 md:h-28 rounded-[2rem] border-[4px] shrink-0 flex items-center justify-center transition-all duration-500 bg-white
                                            ${isCompleted ? 'border-[#F97316] text-[#F97316]' : 'border-slate-100 text-slate-200'}
                                            ${isCurrent ? 'shadow-xl shadow-orange-500/20 scale-105' : ''}
                                        `}>
                                            <Icon size={32} strokeWidth={isCompleted ? 2.5 : 2} className="md:w-10 md:h-10" />
                                        </div>

                                        <div className="pt-2 md:pt-6">
                                            <h3 className={`text-xl md:text-2xl font-black mb-2 transition-colors tracking-tight uppercase ${isCompleted ? 'text-[#1E293B]' : 'text-slate-300'}`}>
                                                {stage.label}
                                            </h3>
                                            <p className={`text-sm md:text-base font-medium ${isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>
                                                {stage.desc}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
