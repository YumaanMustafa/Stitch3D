'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * @file DesignViewer.js
 * @description An interactive 3D viewer for Vendors to inspect custom designs.
 * Exact 1:1 clone of the Customer Canvas DOM to guarantee zero alignment bugs.
 */

export default function DesignViewer({ designId }) {
    const canvasRef = useRef(null);
    const fCanvas = useRef(null);
    const [fabricLoaded, setFabricLoaded] = useState(false);
    const [designData, setDesignData] = useState(null);
    const [view, setView] = useState('front');
    const [loading, setLoading] = useState(true);
    const [jacketImage, setJacketImage] = useState('');
    
    const wrapperRef = useRef(null);

    const JACKET_COLORS = {
        black: { name: 'Midnight Black', hex: '#1a1a1a' },
        brown: { name: 'Vintage Brown', hex: '#5d4037' },
        tan: { name: 'Sahara Tan', hex: '#d2b48c' }
    };

    const VIEWS = [
        { id: 'front', label: 'Front' },
        { id: 'back', label: 'Back' },
        { id: 'left', label: 'Left Side' },
        { id: 'right', label: 'Right Side' }
    ];

    // 1. Fetch Design Data
    useEffect(() => {
        if (!designId) return;
        const fetchDesign = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("vendorToken");
                const res = await fetch(`/api/vendor/designs/${designId}`, {
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
    }, [designId]);

    // 2. Load Fabric.js
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

    // 3. Initialize Canvas EXACTLY at 800x900 (Customer native size)
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

            // Attach ResizeObserver immediately after initialization
            if (wrapperRef.current) {
                const resizeObserver = new ResizeObserver((entries) => {
                    for (let entry of entries) {
                        const { width } = entry.contentRect;
                        const scale = width / 800;
                        
                        if (fCanvas.current) {
                            fCanvas.current.setWidth(800 * scale);
                            fCanvas.current.setHeight(900 * scale);
                            fCanvas.current.setZoom(scale);
                        }
                    }
                });
                resizeObserver.observe(wrapperRef.current);
                fCanvas.current._resizeObserver = resizeObserver; // Store for cleanup
            }
        }
        
        return () => {
            if (fCanvas.current) {
                if (fCanvas.current._resizeObserver) {
                    fCanvas.current._resizeObserver.disconnect();
                }
                fCanvas.current.dispose();
                fCanvas.current = null;
            }
        }
    }, [fabricLoaded, designData]);

    // 4. Update Jacket Background Image based on view/color
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

    // 5. Load Canvas JSON for specific view
    useEffect(() => {
        if (!fCanvas.current || !designData || !designData.views) return;

        fCanvas.current.clear();
        fCanvas.current.backgroundColor = null;

        const viewJson = designData.views[view];
        if (viewJson) {
            fCanvas.current.loadFromJSON(viewJson, () => {
                // Lock all objects so vendor cannot accidentally edit them
                fCanvas.current.forEachObject(obj => {
                    obj.selectable = false;
                    obj.evented = false;
                    obj.hasControls = false;
                    obj.hasBorders = false;
                });
                fCanvas.current.renderAll();
            });
        }
    }, [view, designData]);



    // 6. Ensure background image is perfectly set (supports backwards compatibility)
    useEffect(() => {
        if (!fCanvas.current || !window.fabric || !jacketImage) return;
        const fabric = window.fabric;

        fabric.Image.fromURL(jacketImage, (img) => {
            const scale = 800 / img.width;
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            fCanvas.current.setBackgroundImage(img, fCanvas.current.renderAll.bind(fCanvas.current), {
                scaleX: scale,
                scaleY: scale,
                originX: 'left',
                originY: 'top',
                left: (800 - scaledWidth) / 2,
                top: (900 - scaledHeight) / 2,
                crossOrigin: 'anonymous'
            });
            fCanvas.current.renderAll();
        });
    }, [jacketImage, fabricLoaded, view]);

    if (loading) {
        return <div className="h-96 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Live Studio...</div>;
    }

    if (!designData) {
        return <div className="h-96 flex items-center justify-center text-red-400 font-bold uppercase tracking-widest text-xs">Design Not Found</div>;
    }

    return (
        <div className="flex flex-col items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
            
            {/* View Selectors */}
            <div className="flex gap-2 mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 relative z-50">
                {VIEWS.map(v => (
                    <button
                        key={v.id}
                        onClick={() => setView(v.id)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            view === v.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        {v.label}
                    </button>
                ))}
            </div>

            {/* Canvas Area - Native Responsive Fabric.js */}
            <div 
                ref={wrapperRef}
                className="relative w-full max-w-[800px] aspect-[8/9] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 mx-auto transition-all duration-700 ease-out z-10"
            >
                {/* The Fabric Canvas now natively contains the jacket background */}
                <div className="absolute inset-0 flex items-center justify-center mix-blend-multiply">
                    <canvas ref={canvasRef} />
                </div>
            </div>

            {/* Metadata */}
            <div className="w-full mt-6 grid grid-cols-2 gap-4 relative z-50">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Color</p>
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-wider">{JACKET_COLORS[designData.color]?.name || designData.color}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</p>
                    <p className="text-sm font-bold text-slate-900">{designData.material}</p>
                </div>
            </div>
            
        </div>
    );
}
