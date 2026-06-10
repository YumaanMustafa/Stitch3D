'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ZoomIn } from 'lucide-react';

const JACKET_COLORS = {
    black: { name: 'Midnight Black', hex: '#1a1a1a' },
    brown: { name: 'Vintage Brown', hex: '#5d4037' },
    tan: { name: 'Sahara Tan', hex: '#d2b48c' }
};

const VIEWS = [
    { id: 'front', label: 'Front View' },
    { id: 'left', label: 'Left Side' },
    { id: 'back', label: 'Back View' },
    { id: 'right', label: 'Right Side' }
];

export default function VendorFullscreenViewer({ params }) {
    const canvasRef = useRef(null);
    const fCanvas = useRef(null);
    const router = useRouter();

    const [resolvedParams, setResolvedParams] = useState(null);
    const [designData, setDesignData] = useState(null);
    const [view, setView] = useState('front');
    const [fabricLoaded, setFabricLoaded] = useState(false);
    const [jacketImage, setJacketImage] = useState('');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Responsive scaling
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                const scaleX = width / 800;
                const scaleY = height / 900;
                setScale(Math.min(scaleX, scaleY, 1));
            }
        };
        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    // 1. Resolve Params
    useEffect(() => {
        if (params instanceof Promise) {
            params.then(p => setResolvedParams(p));
        } else {
            setResolvedParams(params);
        }
    }, [params]);

    // 2. Fetch Design Data
    useEffect(() => {
        if (!resolvedParams?.id) return;
        const fetchDesign = async () => {
            try {
                const token = localStorage.getItem("vendorToken");
                const res = await fetch(`/api/vendor/designs/${resolvedParams.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setDesignData(data);
                }
            } catch (error) {
                console.error("Failed to fetch design data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDesign();
    }, [resolvedParams]);

    // 3. Load Fabric.js
    useEffect(() => {
        if (window.fabric) {
            setFabricLoaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
        script.async = true;
        script.onload = () => setFabricLoaded(true);
        document.body.appendChild(script);
    }, []);

    // 4. Initialize Canvas
    useEffect(() => {
        if (fabricLoaded && canvasRef.current && !fCanvas.current && designData) {
            const fabric = window.fabric;
            fCanvas.current = new fabric.Canvas(canvasRef.current, {
                width: 800,
                height: 900,
                backgroundColor: null,
                selection: false,
                preserveObjectStacking: true
            });
        }
    }, [fabricLoaded, designData]);

    // 5. Update Jacket Background Image based on view/color
    useEffect(() => {
        if (!designData) return;
        const color = designData.color || 'black';
        const basePath = `/assets/leather/${color}_${view}`;
        const formats = ['png', 'jpg', 'jpeg', 'webp'];

        const checkFormat = async () => {
            for (const ext of formats) {
                try {
                    const res = await fetch(`${basePath}.${ext}`, { method: 'HEAD' });
                    if (res.ok) {
                        setJacketImage(`${basePath}.${ext}`);
                        return;
                    }
                } catch (err) {}
            }
            setJacketImage(`${basePath}.png`);
        };
        checkFormat();
    }, [view, designData]);

    // 6. Load Canvas JSON for specific view
    useEffect(() => {
        if (!fCanvas.current || !designData || !designData.views) return;

        fCanvas.current.clear();
        fCanvas.current.backgroundColor = null;

        const viewJson = designData.views[view];
        if (viewJson) {
            fCanvas.current.loadFromJSON(viewJson, () => {
                // Lock all objects
                fCanvas.current.forEachObject(obj => {
                    obj.selectable = false;
                    obj.evented = false;
                    obj.hasControls = false;
                    obj.hasBorders = false;
                });
                fCanvas.current.renderAll();
            });
        }
    }, [view, designData, jacketImage]);

    if (loading || !designData) {
        return (
            <div className="h-screen bg-[#f8f9fa] flex items-center justify-center">
                <div className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Studio...</div>
            </div>
        );
    }

    const colorObj = JACKET_COLORS[designData.color] || JACKET_COLORS['black'];

    return (
        <div className="flex flex-col lg:flex-row h-screen p-4 gap-4 font-sans overflow-hidden relative bg-[#f8f9fa]">
            
            {/* LEFT SIDEBAR - Read Only Specifications */}
            <aside className="w-full lg:w-[400px] h-full flex flex-col gap-4 z-20">
                <div className="flex-1 rounded-[32px] bg-white border border-neutral-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-8 flex flex-col relative overflow-hidden">
                    <button 
                        onClick={() => router.back()}
                        className="mb-8 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-400 hover:text-black transition-colors"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    <div className="mb-8">
                        <div className="text-[10px] font-black text-[#ff6b00] uppercase tracking-[0.3em] mb-2">Order Specs</div>
                        <h1 className="text-3xl font-black tracking-tighter text-neutral-900">{designData.title || 'Custom Design'}</h1>
                    </div>

                    <div className="w-full space-y-6 flex-1">
                        <div className="rounded-2xl p-6 border bg-neutral-50 border-neutral-100">
                            <div className="text-[10px] font-black uppercase tracking-widest mb-4 text-neutral-500">Configuration</div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Base Color</span><span className="text-xs font-black text-neutral-900">{colorObj.name}</span></div>
                                <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Material</span><span className="text-xs font-black text-neutral-900">{designData.material}</span></div>
                                <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Design ID</span><span className="text-xs font-black text-neutral-900">#{designData.id}</span></div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Perspective</div>
                            <div className="grid grid-cols-2 gap-2">
                                {VIEWS.map(v => (
                                    <button 
                                        key={v.id} 
                                        onClick={() => setView(v.id)} 
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v.id ? 'bg-[#ff6b00] text-white shadow-lg shadow-orange-500/30' : 'bg-neutral-50 text-neutral-500 hover:text-neutral-900'}`}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* RIGHT PREVIEW AREA - The EXACT Clone of Customer main section */}
            <main ref={containerRef} className="flex-1 rounded-[32px] relative overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-1000 ease-in-out bg-white">
                <div className="absolute inset-0 transition-all duration-1000 bg-white" />
                
                <div
                    className="relative w-[800px] h-[900px] shrink-0 transition-all duration-700 ease-out z-10"
                    style={{ 
                        transform: `scale(${isPreviewOpen ? scale * 1.08 : scale}) translateY(${isPreviewOpen ? -15 : 0}px)`,
                        transformOrigin: 'center center' 
                    }}
                >
                    {/* The Real Asset Image */}
                    {jacketImage && (
                        <img
                            src={jacketImage}
                            alt="Jacket Base"
                            className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-all duration-500 mix-blend-multiply"
                        />
                    )}

                    {/* The Fabric Canvas for overlaying accessories */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <canvas ref={canvasRef} />
                    </div>
                </div>

                {/* View Controls Overlay */}
                <div className="absolute bottom-6 right-6 z-[100] flex gap-2">
                    <button
                        onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                        className={`p-3 rounded-full shadow-lg transition-all ${isPreviewOpen ? 'bg-[#ff6b00] text-white' : 'bg-white text-neutral-900 hover:bg-neutral-50'}`}
                    >
                        <ZoomIn size={18} />
                    </button>
                </div>
            </main>

        </div>
    );
}
