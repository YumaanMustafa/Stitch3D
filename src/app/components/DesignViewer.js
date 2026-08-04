'use client';

// Import React and standard hooks
import React, { useEffect, useRef, useState } from 'react';

/**
 * File: DesignViewer.js
 * Description: An interactive 3D viewer used by Vendors to inspect customer jacket designs.
 * It loads a background jacket image and then layers the customer's custom patches/designs on top using Fabric.js.
 */

// DesignViewer takes the unique designId as a prop
export default function DesignViewer({ designId }) {
    // Refs to interact directly with the DOM canvas elements
    const canvasRef = useRef(null);
    const fCanvas = useRef(null); // Holds the actual Fabric.js canvas instance
    
    // State variables for managing loading and data
    const [fabricLoaded, setFabricLoaded] = useState(false); // True when Fabric.js library finishes downloading
    const [designData, setDesignData] = useState(null);      // Stores the custom design data from the database
    const [view, setView] = useState('front');               // Tracks which angle we are looking at (front, back, etc)
    const [loading, setLoading] = useState(true);            // True while data is being fetched
    const [jacketImage, setJacketImage] = useState('');      // URL of the background jacket image
    
    const wrapperRef = useRef(null); // Ref for the container div to detect screen resizing

    // Object defining the available jacket base colors
    const JACKET_COLORS = {
        black: { name: 'Midnight Black', hex: '#1a1a1a' },
        brown: { name: 'Vintage Brown', hex: '#5d4037' },
        tan: { name: 'Sahara Tan', hex: '#d2b48c' }
    };

    // Array of available camera views (angles) to look at the jacket
    const VIEWS = [
        { id: 'front', label: 'Front' },
        { id: 'back', label: 'Back' },
        { id: 'left', label: 'Left Side' },
        { id: 'right', label: 'Right Side' }
    ];

    // Effect: Fetch the design details from the database when the component loads
    useEffect(() => {
        // Do nothing if no ID was provided
        if (!designId) return;
        
        const fetchDesign = async () => {
            setLoading(true);
            try {
                // Get the vendor's authentication token
                const token = localStorage.getItem("vendorToken");
                // Call the API to fetch this specific design
                const res = await fetch(`/api/vendor/designs/${designId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // If success, save the data to state
                if (res.ok) {
                    const data = await res.json();
                    setDesignData(data);
                }
            } catch (error) {
                console.error("Failed to fetch design data", error);
            } finally {
                setLoading(false); // Stop loading spinner
            }
        };
        fetchDesign();
    }, [designId]); // Re-run this effect if the designId changes

    // Effect: Dynamically download and load the Fabric.js library script into the page
    useEffect(() => {
        // If it's already loaded by another component, just mark it as true
        if (window.fabric) {
            setFabricLoaded(true);
            return;
        }
        // Otherwise, create a script tag to download it from a CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.0/fabric.min.js';
        script.async = true;
        // When the download finishes, update state
        script.onload = () => setFabricLoaded(true);
        document.body.appendChild(script);
    }, []);

    // Effect: Initialize the Fabric canvas once the library and data are ready
    useEffect(() => {
        // Only run if Fabric is loaded, canvas exists, and we have the design data
        if (fabricLoaded && canvasRef.current && !fCanvas.current && designData) {
            const fabric = window.fabric;
            // Create a new Fabric canvas instance with specific dimensions
            fCanvas.current = new fabric.Canvas(canvasRef.current, {
                width: 800,
                height: 900,
                backgroundColor: null,
                selection: false, // Prevent users from drag-selecting multiple items
                preserveObjectStacking: true // Keep layers in the correct order
            });

            // Make the canvas responsive using a ResizeObserver to watch the parent wrapper
            if (wrapperRef.current) {
                const resizeObserver = new ResizeObserver((entries) => {
                    for (let entry of entries) {
                        // Calculate how much the screen shrunk compared to original 800px width
                        const { width } = entry.contentRect;
                        const scale = width / 800;
                        
                        // Scale the canvas down proportionally so it fits on small screens
                        if (fCanvas.current) {
                            fCanvas.current.setWidth(800 * scale);
                            fCanvas.current.setHeight(900 * scale);
                            fCanvas.current.setZoom(scale);
                        }
                    }
                });
                // Start watching the wrapper for size changes
                resizeObserver.observe(wrapperRef.current);
                fCanvas.current._resizeObserver = resizeObserver; // Save reference for cleanup later
            }
        }
        
        // Cleanup function runs when component unmounts to free up memory
        return () => {
            if (fCanvas.current) {
                if (fCanvas.current._resizeObserver) {
                    fCanvas.current._resizeObserver.disconnect();
                }
                fCanvas.current.dispose();
                fCanvas.current = null;
            }
        }
    }, [fabricLoaded, designData]); // Run when these specific variables change

    // Effect: Find the correct background image based on selected color and view angle
    useEffect(() => {
        if (!designData) return;
        const color = designData.color || 'black';
        const basePath = `/assets/leather/${color}_${view}`;
        // List of possible image file types
        const formats = ['png', 'jpg', 'jpeg', 'webp'];

        // Function to check which image file type actually exists on the server
        const checkFormat = async () => {
            // Loop through formats to find the first one that works
            for (const ext of formats) {
                try {
                    // Make a lightweight HEAD request just to check if the file exists
                    const res = await fetch(`${basePath}.${ext}`, { method: 'HEAD' });
                    if (res.ok) {
                        setJacketImage(`${basePath}.${ext}`);
                        return; // Stop checking once we find one
                    }
                } catch (err) {}
            }
            // Fallback to png if nothing else was found
            setJacketImage(`${basePath}.png`);
        };
        checkFormat();
    }, [view, designData]); // Re-run if user changes the view (e.g. clicks "Back")

    // Effect: Load the user's custom design patches onto the canvas
    useEffect(() => {
        // Wait until everything is ready
        if (!fCanvas.current || !designData || !designData.views) return;

        // Clear previous patches off the canvas
        fCanvas.current.clear();
        fCanvas.current.backgroundColor = null;

        // Get the JSON data representing the user's patches for this specific view (e.g. front)
        const viewJson = designData.views[view];
        if (viewJson) {
            // Tell Fabric to draw the patches based on the JSON
            fCanvas.current.loadFromJSON(viewJson, () => {
                // Loop through every patch and lock it so the vendor can only view, not edit
                fCanvas.current.forEachObject(obj => {
                    obj.selectable = false; // Cannot be clicked
                    obj.evented = false;    // Ignores mouse events
                    obj.hasControls = false;// Removes resize handles
                    obj.hasBorders = false; // Removes selection border
                });
                // Redraw canvas with locked objects
                fCanvas.current.renderAll();
            });
        }
    }, [view, designData]); // Re-run when view changes



    // Effect: Draw the physical jacket photo underneath the canvas as a background
    useEffect(() => {
        if (!fCanvas.current || !window.fabric || !jacketImage) return;
        const fabric = window.fabric;

        // Load the jacket image URL into Fabric
        fabric.Image.fromURL(jacketImage, (img) => {
            // Calculate how much to shrink the image to fit the 800px width
            const scale = 800 / img.width;
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            // Set it as the canvas background, centered nicely
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
    }, [jacketImage, fabricLoaded, view]); // Re-run when the background image path changes

    // Show loading spinner if still fetching data
    if (loading) {
        return <div className="h-96 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Live Studio...</div>;
    }

    // Show error message if no design was found
    if (!designData) {
        return <div className="h-96 flex items-center justify-center text-red-400 font-bold uppercase tracking-widest text-xs">Design Not Found</div>;
    }

    return (
        // Main container
        <div className="flex flex-col items-center bg-slate-50 p-4 rounded-3xl border border-slate-100 shadow-inner">
            
            {/* Top row of buttons to change the camera view (Front, Back, etc) */}
            <div className="flex gap-2 mb-6 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 relative z-50">
                {/* Loop through views array and render a button for each */}
                {VIEWS.map(v => (
                    <button
                        key={v.id}
                        onClick={() => setView(v.id)} // Change state when clicked
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            view === v.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        {v.label}
                    </button>
                ))}
            </div>

            {/* The actual canvas container area */}
            <div 
                ref={wrapperRef}
                className="relative w-full max-w-[800px] aspect-[8/9] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 mx-auto transition-all duration-700 ease-out z-10"
            >
                {/* Canvas element where Fabric.js draws the image and patches */}
                <div className="absolute inset-0 flex items-center justify-center mix-blend-multiply">
                    <canvas ref={canvasRef} />
                </div>
            </div>

            {/* Bottom section showing text details about the jacket materials */}
            <div className="w-full mt-6 grid grid-cols-2 gap-4 relative z-50">
                {/* Color Box */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Color</p>
                    <p className="text-sm font-bold text-slate-900 uppercase tracking-wider">{JACKET_COLORS[designData.color]?.name || designData.color}</p>
                </div>
                {/* Material Box */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</p>
                    <p className="text-sm font-bold text-slate-900">{designData.material}</p>
                </div>
            </div>
            
        </div>
    );
}
