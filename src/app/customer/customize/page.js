'use client';

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Upload, RotateCw, ShoppingBag, ZoomIn, Trash2, XCircle, Save, Check, AlertCircle, Sun, Moon, Ruler, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../../context/CartContext';
import ConfirmationModal from '@/app/components/ConfirmationModal';

/**
 * @file page.js
 * @description Product Customizer.
 * Core feature allowing users to customize jackets (Material, Color, Accessories).
 * Uses `fabric.js` for canvas manipulation and layering.
 * support saving designs to DB and adding to cart.
 */

const JACKET_COLORS = {
    black: { name: 'Midnight Black', hex: '#1a1a1a' },
    brown: { name: 'Vintage Brown', hex: '#5d4037' },
    tan: { name: 'Sahara Tan', hex: '#d2b48c' }
};

const MATERIALS = [
    { id: 'cowhide', name: 'Premium Cowhide', price: 2500, desc: 'Durable & stiff' },
    { id: 'lambskin', name: 'Italian Lambskin', price: 8500, desc: 'Buttery soft' },
    { id: 'goatskin', name: 'Rugged Goatskin', price: 4500, desc: 'Pebbled texture' }
];

const SIZES = ['Small', 'Medium', 'Large', 'X-Large'];

const VIEWS = [
    { id: 'front', label: 'Front View' },
    { id: 'left', label: 'Left Side' },
    { id: 'back', label: 'Back View' },
    { id: 'right', label: 'Right Side' }
];

const ACCESSORIES = [
    { id: 'zipper_silver', name: 'Silver Zipper', src: '/assets/accessories/zipper_silver.png' },
    { id: 'zipper_bronze', name: 'Bronze Zipper', src: '/assets/accessories/zipper_bronze.png' },
    { id: 'patch_collar', name: 'Collar Patch', src: '/assets/accessories/patch_collar.png' }
];

function CustomizerContent() {
    const canvasRef = useRef(null);
    const fCanvas = useRef(null);
    const searchParams = useSearchParams();
    const router = useRouter();
    const designId = searchParams.get('id');
    const hasLoadedRef = useRef(false);

    const [color, setColor] = useState('black');
    const [material, setMaterial] = useState(MATERIALS[0]);
    const [size, setSize] = useState('');
    const [vendorId, setVendorId] = useState(null);
    const [availableVendors, setAvailableVendors] = useState([]);
    const [activeDropdown, setActiveDropdown] = useState(null); // 'artisan' or null
    const [customUploads, setCustomUploads] = useState([]);
    const [theme, setTheme] = useState('light'); // 'light' or 'dark'

    const [view, setView] = useState('front'); // front, back, left, right
    const [jacketImage, setJacketImage] = useState('');

    const wrapperRef = useRef(null);

    const viewState = useRef({ front: null, back: null, left: null, right: null });
    const previousView = useRef('front');
    const isRestoring = useRef(false);
    const pendingCartAdd = useRef(false); // Track if we should auto-add to cart after save

    const [fabricLoaded, setFabricLoaded] = useState(false);

    // Cart Count from Context - MOVED TO TOP LEVEL
    const { cartCount } = useCart();

    const [isAdding, setIsAdding] = useState(false);

    // Track the specific cart item added in this session to ensure we can update it even if name/id changes
    const lastCartItemIdRef = useRef(null);

    const [step, setStep] = useState(1);
    const [savedDesigns, setSavedDesigns] = useState([]);
    const [toastMessage, setToastMessage] = useState(""); // Notifications
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track edits
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [viewerSnapshot, setViewerSnapshot] = useState(null); // Canvas accessories snapshot
    const [activeModal, setActiveModal] = useState(null); // 'size' or 'material'

    const [showOnboardingGuide, setShowOnboardingGuide] = useState(false);
    const [isGuideMinimized, setIsGuideMinimized] = useState(false);

    // Custom Alert State
    const [conf, setConf] = useState({
        open: false,
        title: "",
        message: "",
        type: "warning",
        onConfirm: () => { },
        hideCancel: false
    });

    const showAlert = (title, message, type = "success") => {
        setConf({ open: true, title, message, type, hideCancel: true, onConfirm: () => { } });
    };

    // Load Saved Designs & Custom Uploads on Mount
    // Helper to get User ID
    const getUserIdFromToken = () => {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem("token");
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id || payload.userId;
        } catch (e) {
            return null;
        }
    };

    // Load Saved Designs & Custom Uploads on Mount
    useEffect(() => {
        // Fetch Designs
        const token = localStorage.getItem("token");
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        fetch('/api/customer/designs', { headers })
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    // If unauthorized, just return empty array and don't crash
                    return [];
                }
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setSavedDesigns(data);

                    // Auto-load if ID present
                    if (designId && !hasLoadedRef.current) {
                        const target = data.find(d => d.id === designId);
                        if (target) {
                            console.log("Auto-loading design:", target.name);
                            setTimeout(() => loadDesign(target), 500);
                            hasLoadedRef.current = true;
                        }
                    }
                }
            })
            .catch(err => console.error("Failed to load designs", err));

        // Fetch Custom Uploads
        fetch('/api/common/uploads', { headers })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCustomUploads(data);
                }
            })
            .catch(err => console.error("Failed to load uploads", err));

        // Fetch Vendors
        fetch('/api/general/vendors')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setAvailableVendors(data);
                    // Default to first vendor if none selected
                    if (!vendorId && data.length > 0) setVendorId(data[0].vendor_id);
                }
            })
            .catch(err => console.error("Failed to load vendors", err));

        // Always show Material Guide when entering Studio
        setTimeout(() => {
            setShowOnboardingGuide(true);
        }, 1500);

    }, [designId]);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(""), 3000);
    };

    // ... (Fabric loading and Canvas Init remain same) ...

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (!file || !fCanvas.current) return;

        const reader = new FileReader();
        reader.onload = (f) => {
            const data = f.target.result;

            // Create a temp image to process
            const imgObj = new Image();
            imgObj.src = data;
            imgObj.onload = () => {
                // 1. Calculate safe dimensions (Max 500px) to prevent DB Packet Errors
                const MAX_SIZE = 500;
                let width = imgObj.width;
                let height = imgObj.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                // 2. Create offscreen canvas for pixel manipulation
                const tempCanvas = document.createElement('canvas');
                const ctx = tempCanvas.getContext('2d');
                tempCanvas.width = width;
                tempCanvas.height = height;

                // 3. Draw image scaled
                ctx.drawImage(imgObj, 0, 0, width, height);

                // 4. Remove white background
                const imgData = ctx.getImageData(0, 0, width, height);
                const pixels = imgData.data;

                for (let i = 0; i < pixels.length; i += 4) {
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];

                    if (r > 240 && g > 240 && b > 240) {
                        pixels[i + 3] = 0;
                    }
                }

                ctx.putImageData(imgData, 0, 0);
                // Use JPEG or PNG. PNG is needed for transparency. 
                // Scaling down is usually enough to fix the size issue.
                const processedSrc = tempCanvas.toDataURL('image/png');

                // 5. Add to Custom Uploads List
                const newUpload = {
                    id: `custom_${Date.now()}`,
                    name: 'Custom Upload',
                    src: tempCanvas.toDataURL()
                };

                setCustomUploads(prev => [...prev, newUpload]);

                // 6. Save to Database
                // 6. Save to Database
                const token = localStorage.getItem("token");
                fetch('/api/common/uploads', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        name: file.name,
                        src: processedSrc
                    })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            // Update the local state with true ID
                            setCustomUploads(prev => prev.map(u => u.id === newUpload.id ? data.upload : u));
                        } else {
                            showAlert("Upload Failed", "Could not save your custom image. Please try again.", "warning");
                        }
                    })
                    .catch(err => {
                        console.error("Upload failed", err);
                        showAlert("Error", "Something went wrong during image upload.", "warning");
                    });
            };
        };
        reader.readAsDataURL(file);
    };

    // 1. Load Fabric.js
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

    // 2. Initialize Canvas
    useEffect(() => {
        if (fabricLoaded && canvasRef.current && !fCanvas.current) {
            // @ts-ignore
            const fabric = window.fabric;
            fCanvas.current = new fabric.Canvas(canvasRef.current, {
                width: 800,
                height: 900,
                backgroundColor: null,
                preserveObjectStacking: true
            });
        }
    }, [fabricLoaded]);

    // 3. Persistence Logic: Save previous view, Load new view
    useEffect(() => {
        if (!fCanvas.current || isRestoring.current) return;

        // Save current state to the PREVIOUS view
        // We carefully only save if we have a valid canvas state, to avoid overwriting with empty on init
        const json = fCanvas.current.toJSON();

        // Dirty check: simplistic - if view changes, we assume an edit might have happened or will happen
        // Ideally we track object added/modified events on canvas
        viewState.current[previousView.current] = json;

        // Clear for new view
        fCanvas.current.clear();
        fCanvas.current.backgroundColor = null;

        // Restore state for NEW view if exists
        if (viewState.current[view]) {
            fCanvas.current.loadFromJSON(viewState.current[view], () => {
                // NEW: Ensure objects are locked if viewer is open
                if (isPreviewOpen) {
                    fCanvas.current.forEachObject(obj => {
                        obj.selectable = false;
                        obj.evented = false;
                        obj.hasControls = false;
                        obj.hasBorders = false;
                    });
                }
                fCanvas.current.renderAll();
            });
        }

        // Update tracker
        previousView.current = view;

    }, [view]);

    // 3.5 Native Fabric.js Responsive Scaling
    useEffect(() => {
        if (!wrapperRef.current || !fCanvas.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                // Base logical size is 800x900
                const scale = width / 800;
                
                if (fCanvas.current) {
                    fCanvas.current.setWidth(800 * scale);
                    fCanvas.current.setHeight(900 * scale);
                    fCanvas.current.setZoom(scale);
                }
            }
        });
        
        resizeObserver.observe(wrapperRef.current);
        return () => resizeObserver.disconnect();
    }, [fabricLoaded]);

    // 3b. Sync Fabric Background Image with jacketImage state
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
            
            // Re-render and dirty check
            fCanvas.current.renderAll();
            if (!isRestoring.current) setHasUnsavedChanges(true);
        });
    }, [jacketImage, fabricLoaded]);

    // Canvas Events for Dirty State
    useEffect(() => {
        if (!fCanvas.current) return;
        const setDirty = () => {
            if (!isRestoring.current) setHasUnsavedChanges(true);
        };
        fCanvas.current.on('object:added', setDirty);
        fCanvas.current.on('object:modified', setDirty);
        fCanvas.current.on('object:removed', setDirty);
        return () => {
            if (fCanvas.current) {
                fCanvas.current.off('object:added', setDirty);
                fCanvas.current.off('object:modified', setDirty);
                fCanvas.current.off('object:removed', setDirty);
            }
        };
    }, [fabricLoaded]); // Re-attach if fabric reloads (rare) but good practice

    useEffect(() => {
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
                } catch (err) {
                    // ignore
                }
            }
            setJacketImage(`${basePath}.png`); // fallback
        };

        checkFormat();
    }, [color, view]);

    const getJacketImage = () => {
        return jacketImage || `/assets/leather/${color}_${view}.png`;
    };

    const addAccessory = (acc) => {
        if (!fCanvas.current || !window.fabric || isPreviewOpen) return;
        setHasUnsavedChanges(true);
        const fabric = window.fabric;

        fabric.Image.fromURL(acc.src, (img) => {
            img.scaleToWidth(100);
            img.set({
                left: 350,
                top: 300,
                cornerSize: 10,
                cornerStyle: 'circle',
                borderColor: '#ff6b00',
                cornerColor: '#ff6b00'
            });
            fCanvas.current.add(img);
            fCanvas.current.setActiveObject(img);
        }, { crossOrigin: 'anonymous' });
    };

    const deleteSelected = () => {
        if (!fCanvas.current || isPreviewOpen) return;
        const activeObj = fCanvas.current.getActiveObject();
        if (activeObj) {
            setHasUnsavedChanges(true);
            fCanvas.current.remove(activeObj);
            fCanvas.current.renderAll();
        }
    };

    const clearAll = () => {
        if (!fCanvas.current || isPreviewOpen) return;
        setHasUnsavedChanges(true);
        fCanvas.current.clear();
        fCanvas.current.backgroundColor = null;
        viewState.current[view] = null; // Clear saved state for this view
    };

    // Keyboard Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isPreviewOpen) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                deleteSelected();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const { addToCart: addToCartContext, syncCartItemWithDesign } = useCart();

    const addToCart = () => {
        if (!size) {
            showToast("Please select a size for your custom design.");
            return;
        }

        // Ensure we save the current view state before carting
        if (fCanvas.current) {
            viewState.current[view] = fCanvas.current.toJSON();
        }

        // NEW: Require Save before Adding to Cart IF dirty
        if (!designId || hasUnsavedChanges) {
            setIsSaveRequiredModalOpen(true);
            return;
        }

        // Use current saved name or default
        let itemName = 'Custom Jacket';
        const currentDesignInState = savedDesigns.find(d => d.id === designId);
        if (currentDesignInState) {
            itemName = currentDesignInState.name;
        }

        const cartItemId = Date.now();
        const design = {
            id: cartItemId, // Session-specific ID for Cart (Context handles Uniqueness fallback)
            designId: designId, // Link to Database Design ID
            title: itemName,
            color: JACKET_COLORS[color].name,
            material: material.name,
            size: size,
            vendorId: vendorId, // NEW: Assign specific vendor
            price: 22500 + material.price,
            img: getJacketImage(),
            views: viewState.current,
            quantity: 1
        };

        setIsAdding(true);

        setTimeout(() => {
            // Use Context to Add
            addToCartContext(design);

            setIsAdding(false);
            router.push('/customer/cart');
        }, 500);
    };

    const loadDesign = (design) => {
        if (!fCanvas.current) return;

        // Block side effects
        isRestoring.current = true;

        // 1. Restore Color
        setColor(design.color);
        // Restore Material if exists
        const restoredMaterial = MATERIALS.find(m => m.id === design.material || m.name === design.material) || MATERIALS[0];
        setMaterial(restoredMaterial);

        // Restore Size if exists
        setSize(design.size || 'M');

        // Restore Vendor if exists
        if (design.vendor_id) setVendorId(design.vendor_id);

        // 2. Deep clone views
        try {
            console.log("Debug: Loading Design Views", design.views);
            viewState.current = JSON.parse(JSON.stringify(design.views));
        } catch (e) {
            console.error("Failed to clone views", e);
            viewState.current = { front: null, back: null, left: null, right: null };
        }

        // 3. Reset Interface to Front
        // We manually handle the view switch to ensure clean state
        setView('front');
        previousView.current = 'front'; // Sync tracker

        // 4. Force load 'front'
        fCanvas.current.clear();
        fCanvas.current.backgroundColor = null;

        const frontState = viewState.current['front'];
        if (frontState) {
            console.log("Debug: Restoring Front View State");
            fCanvas.current.loadFromJSON(frontState, () => {
                fCanvas.current.renderAll();
                console.log("Design loaded successfully - Objects count:", fCanvas.current.getObjects().length);
                isRestoring.current = false; // Re-enable persistence
                setHasUnsavedChanges(false); // Clean state
            });
        } else {
            console.warn("Debug: No Front View State found");
            isRestoring.current = false;
            setHasUnsavedChanges(false);
        }
    };

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isSaveRequiredModalOpen, setIsSaveRequiredModalOpen] = useState(false); // New Requirement
    const [saveName, setSaveName] = useState("");
    const [overwriteId, setOverwriteId] = useState(null); // If we need to confirm overwrite
    const [showOverwriteConfirmation, setShowOverwriteConfirmation] = useState(false);

    const openSaveModal = () => {
        if (!size) {
            showToast("Please select a size for your custom design before saving.");
            return;
        }

        // 1. Capture current view state logic remains same...
        if (fCanvas.current) {
            viewState.current[view] = fCanvas.current.toJSON();
        }

        // Determine default name
        let currentName = 'My Custom Jacket';
        const currentDesignInState = savedDesigns.find(d => d.id === designId);
        if (currentDesignInState) {
            currentName = currentDesignInState.name;
        }
        setSaveName(currentName);
        setShowOverwriteConfirmation(false);
        setOverwriteId(null);
        setIsSaveModalOpen(true);
    };

    const proceedWithSave = () => {
        const name = saveName.trim();
        if (!name) return;

        // Check for duplicate name
        const conflictingDesign = savedDesigns.find(d => d.name.toLowerCase() === name.toLowerCase() && d.id !== designId);

        let idToSend = designId || null;

        // If name changed from current loaded design, treat as new (unless overwriting existing)
        const currentDesignInState = savedDesigns.find(d => d.id === designId);
        if (designId && currentDesignInState && name !== currentDesignInState.name) {
            idToSend = null;
        }

        if (conflictingDesign) {
            // Ask for confirmation
            setOverwriteId(conflictingDesign.id);
            setShowOverwriteConfirmation(true);
            return;
        }

        executeSave(idToSend, name);
    };

    const confirmOverwrite = () => {
        executeSave(overwriteId, saveName);
    };

    const generateSnapshots = async (currentColor, viewStateObj) => {
        const snapshots = {};
        const viewsList = ['front', 'back', 'left', 'right'];
        
        if (!window.fabric) return {};

        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 400;
        bgCanvas.height = 450;
        const bgCtx = bgCanvas.getContext('2d');

        const fCanvasTemp = document.createElement('canvas');
        fCanvasTemp.width = 800;
        fCanvasTemp.height = 900;
        const staticFabric = new window.fabric.StaticCanvas(fCanvasTemp);

        for (const viewId of viewsList) {
            const basePath = `/assets/leather/${currentColor}_${viewId}`;
            
            await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    bgCtx.clearRect(0, 0, 400, 450);
                    bgCtx.drawImage(img, 0, 0, 400, 450);
                    resolve();
                };
                img.onerror = () => resolve();
                img.src = `${basePath}.png`;
            });

            const viewJson = viewStateObj[viewId];
            if (viewJson) {
                await new Promise((resolve) => {
                    staticFabric.clear();
                    staticFabric.loadFromJSON(viewJson, () => {
                        staticFabric.renderAll();
                        bgCtx.drawImage(fCanvasTemp, 0, 0, 400, 450);
                        resolve();
                    });
                });
            }
            snapshots[viewId] = bgCanvas.toDataURL('image/jpeg', 0.7);
        }

        staticFabric.dispose();
        return snapshots;
    };

    const executeSave = async (finalId, finalName) => {
        setIsSaveModalOpen(false);
        showToast("Generating high-res snapshots...");

        const snapshots = await generateSnapshots(color, viewState.current);

        const savedDesign = {
            id: finalId,
            name: finalName || 'Custom Jacket',
            color: color,
            material: material.id,
            size: size,
            vendorId: vendorId,
            views: viewState.current,
            snapshots: snapshots,
            previewImage: getJacketImage(),
            createdAt: new Date().toISOString()
        };

        // POST to API... (Reuse existing logic)

        // POST to API
        const token = localStorage.getItem("token");
        fetch('/api/customer/designs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(savedDesign)
        })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Save failed');
                return data;
            })
            .then(data => {
                if (data.success) {
                    setHasUnsavedChanges(false); // MARK CLEAN
                    showToast("Design saved successfully!");
                    // Start of Success Logic
                    // NEW: SYNC WITH CART
                    // NEW: SYNC WITH CART VIA CONTEXT (Real-time)
                    try {
                        const productUpdate = {
                            designId: data.design.id,
                            title: data.design.name,
                            color: JACKET_COLORS[color].name,
                            // Ensure material is string name if needed, or object. 
                            // CartContext expects consistent shape. Let's pass the computed values.
                            material: material.name,
                            size: size,
                            price: 22500 + material.price,
                            img: getJacketImage()
                        };

                        // If we have a designId, we pass it. If not (new save), we pass title match fallback inside context logic?
                        // Context logic handles id match.
                        // We also need to help context match by name if designId wasn't there before.
                        // But context syncCartItemWithDesign uses design.id or design.name.
                        // We'll pass the composite object.
                        syncCartItemWithDesign({ ...productUpdate, id: data.design.id, name: data.design.name });

                    } catch (err) {
                        console.error("Error syncing cart:", err);
                    }

                    // Update URL 
                    if (data.design.id !== designId) {
                        const newUrl = new URL(window.location.href);
                        newUrl.searchParams.set('id', data.design.id);
                        router.replace(newUrl.pathname + newUrl.search);
                        setSavedDesigns(prev => {
                            const filtered = prev.filter(d => d.id !== data.design.id);
                            return [data.design, ...filtered];
                        });
                    } else {
                        setSavedDesigns(prev => prev.map(d => d.id === data.design.id ? data.design : d));
                    }

                    // Check if we need to auto-add to cart
                    if (pendingCartAdd.current) {
                        pendingCartAdd.current = false;
                        setTimeout(() => addToCart(), 500); // Re-trigger cart add now that we are clean
                    }
                }
            })
            .catch(err => {
                console.error("Save failed", err);
                showToast(`Failed to save design: ${err.message}`);
            });
    };


    return (
        <div className="flex flex-col lg:flex-row h-screen p-4 gap-4 font-sans overflow-hidden relative selection:bg-orange-100 selection:text-orange-600 transition-colors duration-1000 bg-[#f8f9fa]">
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'};
                    border-radius: 20px;
                }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb {
                    background: ${theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
                }
            `}</style>
            {/* Dynamic Background Aura Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        x: [0, 50, -50, 0],
                        y: [0, -50, 50, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-20 transition-all duration-1000"
                    style={{
                        background: `radial-gradient(circle, ${JACKET_COLORS[color].hex} 0%, transparent 70%)`,
                        filter: 'blur(120px)',
                    }}
                />
                <motion.div
                    animate={{
                        x: [0, -80, 80, 0],
                        y: [0, 80, -80, 0],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full opacity-[0.15] transition-all duration-1000"
                    style={{
                        background: `radial-gradient(circle, ${JACKET_COLORS[color].hex} 0%, transparent 70%)`,
                        filter: 'blur(150px)',
                    }}
                />
                {/* Subtle Grain Texture */}
                <div className="absolute inset-0 mix-blend-overlay pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("https://grainy-gradients.vercel.app/noise.svg")` }} />
            </div>

            {/* Main Layout — Light themed premium aesthetic */}
            <aside
                className={`w-full lg:w-[420px] rounded-[32px] p-8 flex flex-col shadow-2xl z-20 relative overflow-y-auto border transition-all duration-700 group custom-scrollbar ${theme === 'dark' ? 'bg-[#0f0f0f]/90 backdrop-blur-3xl border-white/5 text-white' : 'bg-white/70 backdrop-blur-3xl border-white/50 text-neutral-900'}`}
            >
                <AnimatePresence mode="wait">
                    {!isPreviewOpen ? (
                        <motion.div
                            key="editor"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col h-full"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-10">
                                <div className="group cursor-default">
                                    <h1 className={`text-3xl font-black tracking-tighter leading-none transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>STITCH</h1>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`h-[2px] w-8 bg-[#ff6b00] rounded-full shadow-[0_0_12px_rgba(255,107,0,0.6)]`} />
                                        <div className="text-[10px] text-[#ff6b00] font-black uppercase tracking-[0.3em]">Design Studio</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                                        className={`p-3 rounded-2xl transition-all hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-white/5 text-orange-400 hover:bg-white/10' : 'bg-black/5 text-neutral-400 hover:text-neutral-900'}`}
                                    >
                                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                                    </button>
                                    <button onClick={() => router.push('/customer/cart')} className={`relative p-3 rounded-2xl transition-all hover:scale-110 active:scale-95 ${theme === 'dark' ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-black/5 text-neutral-400 hover:text-neutral-900'}`}>
                                        <ShoppingBag size={22} />
                                        {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-[#ff6b00] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/40 border-2 border-white">{cartCount}</span>}
                                    </button>
                                </div>
                            </div>

                            {/* Step 1: Artisan / Vendor Selection */}
                            <section className="mb-10 relative">
                                <div className="flex justify-between items-end mb-4">
                                    <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-700 ${theme === 'dark' ? 'text-white/80' : 'text-neutral-900'}`}>00. Select Your Artisan</h2>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Online Now</span>
                                    </div>
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === 'artisan' ? null : 'artisan')}
                                        className={`w-full p-5 rounded-[24px] border text-left transition-all flex items-center justify-between group ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-black/5 hover:border-black/10 shadow-sm'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner ${theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/5 text-neutral-900'}`}>
                                                {(availableVendors.find(v => v.vendor_id === vendorId)?.company_name || 'A').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-black transition-colors ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>
                                                    {availableVendors.find(v => v.vendor_id === vendorId)?.company_name || 'Choose Artisan'}
                                                </span>
                                                <span className="text-[9px] font-medium opacity-50 uppercase tracking-widest">Master Craftsman</span>
                                            </div>
                                        </div>
                                        <div className={`transition-transform duration-300 ${activeDropdown === 'artisan' ? 'rotate-180' : ''}`}>
                                            <ChevronRight size={18} className={theme === 'dark' ? 'text-white/40' : 'text-neutral-400'} />
                                        </div>
                                    </button>

                                    <AnimatePresence>
                                        {activeDropdown === 'artisan' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className={`absolute left-0 right-0 top-[calc(100%+8px)] z-[60] rounded-[24px] border overflow-hidden shadow-2xl backdrop-blur-3xl ${theme === 'dark' ? 'bg-[#1a1a1a]/95 border-white/10' : 'bg-white/95 border-black/10'}`}
                                            >
                                                <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-2">
                                                    {availableVendors.map(v => (
                                                        <button
                                                            key={v.vendor_id}
                                                            onClick={() => { setVendorId(v.vendor_id); setActiveDropdown(null); setHasUnsavedChanges(true); }}
                                                            className={`w-full p-4 rounded-[18px] flex items-center gap-4 transition-all text-left mb-1 last:mb-0 ${vendorId === v.vendor_id ? (theme === 'dark' ? 'bg-white/10 text-white' : 'bg-black/5 text-neutral-900') : (theme === 'dark' ? 'text-white/60 hover:bg-white/5' : 'text-neutral-500 hover:bg-black/5')}`}
                                                        >
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black ${vendorId === v.vendor_id ? 'bg-[#ff6b00] text-white' : (theme === 'dark' ? 'bg-white/10' : 'bg-black/5')}`}>
                                                                {(v.company_name || v.name || 'A').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col flex-1">
                                                                <span className="text-[11px] font-bold">{v.company_name || v.name}</span>
                                                                <span className="text-[8px] opacity-50 uppercase tracking-tighter">Verified Studio</span>
                                                            </div>
                                                            {vendorId === v.vendor_id && <Check size={14} className="text-[#ff6b00]" strokeWidth={3} />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </section>

                            {/* Step 2: Material */}
                            <section className="mb-10">
                                <div className="flex justify-between items-end mb-4">
                                    <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-700 ${theme === 'dark' ? 'text-white/80' : 'text-neutral-900'}`}>01. Material</h2>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>{material.name}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {MATERIALS.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => { setMaterial(m); setHasUnsavedChanges(true); }}
                                            className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${material.id === m.id ? (theme === 'dark' ? 'bg-white/10 border-orange-500/50 shadow-[0_15px_30px_rgba(0,0,0,0.5)] scale-[1.02]' : 'bg-white shadow-[0_15px_30px_rgba(0,0,0,0.08),0_0_20px_rgba(255,107,0,0.15)] border-orange-500/50 scale-[1.02]') : (theme === 'dark' ? 'border-white/5 bg-white/5 text-neutral-400 hover:bg-white/10' : 'border-black/5 bg-black/5 text-neutral-400 hover:bg-black/10')}`}
                                        >                                            <div className="flex flex-col text-left"><span className={`text-xs font-black transition-colors duration-700 ${material.id === m.id ? (theme === 'dark' ? 'text-white' : 'text-neutral-900') : (theme === 'dark' ? 'text-neutral-400' : 'text-neutral-700')}`}>{m.name}</span><span className={`text-[10px] font-medium opacity-70 transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>{m.desc}</span></div>
                                            {m.price > 0 && <span className="text-xs font-black text-[#ff6b00]">Rs. {m.price.toLocaleString()}</span>}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            {/* Step 2: Color */}
                            <section className="mb-10">
                                <div className="flex justify-between items-end mb-4">
                                    <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-700 ${theme === 'dark' ? 'text-white/80' : 'text-neutral-900'}`}>02. Color Way</h2>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>{JACKET_COLORS[color].name}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(JACKET_COLORS).map(([key, data]) => (
                                        <button key={key} onClick={() => { setColor(key); setHasUnsavedChanges(true); }} className={`relative group h-14 rounded-xl border-2 transition-all overflow-hidden ${color === key ? 'border-orange-500 shadow-lg scale-105' : 'border-transparent hover:border-black/10'}`} style={{ backgroundColor: data.hex }}>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" /><span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-black text-white uppercase tracking-wider">{key}</span>
                                        </button>
                                    ))}
                                </div>
                            </section>
                            {/* Step 3: Size */}
                            <section className="mb-10">
                                <div className="flex justify-between items-end mb-4">
                                    <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-700 ${theme === 'dark' ? 'text-white/80' : 'text-neutral-900'}`}>03. Size</h2>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                        {size || <span className="text-red-500 font-black">Required</span>}
                                    </span>
                                </div>
                                <div className={`grid grid-cols-4 gap-2 p-1.5 rounded-2xl transition-colors duration-700 mb-3 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                                    {SIZES.map(s => <button key={s} onClick={() => { setSize(s); setHasUnsavedChanges(true); }} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${size === s ? 'bg-[#ff6b00] text-white shadow-[0_10px_20px_rgba(255,107,0,0.3)] scale-105' : (theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-neutral-500 hover:text-neutral-900')}`}>{s.charAt(0)}</button>)}
                                </div>
                                <button
                                    onClick={() => setActiveModal('size')}
                                    className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border transition-all ${theme === 'dark' ? 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10' : 'border-black/5 bg-black/5 text-slate-500 hover:bg-black/10'}`}
                                >
                                    <Ruler size={14} /> View Size Chart
                                </button>
                            </section>

                            {/* Step 4: Perspective */}
                            <section className="mb-10">
                                <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 transition-colors duration-700 ${theme === 'dark' ? 'text-white/80' : 'text-neutral-900'}`}>04. Viewpoint</h2>
                                <div className={`grid grid-cols-4 gap-2 p-1.5 rounded-2xl transition-colors duration-700 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
                                    {VIEWS.map(v => <button key={v.id} onClick={() => setView(v.id)} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${view === v.id ? 'bg-[#ff6b00] text-white shadow-[0_10px_25px_rgba(255,107,0,0.4)] scale-105' : (theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-neutral-500 hover:text-neutral-900')}`}>{v.label.split(' ')[0]}</button>)}
                                </div>
                            </section>
                            {/* Step 5: Details */}
                            <section className="flex-1">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-700 ${theme === 'dark' ? 'text-white/80' : 'text-neutral-900'}`}>05. Add-ons</h2>
                                    <div className="flex gap-3">
                                        <button onClick={clearAll} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase flex items-center gap-1 transition-colors"><RotateCw size={10} /> Reset</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-8">
                                    {[...ACCESSORIES, ...customUploads].map(acc => (
                                        <div key={acc.id} onClick={() => addAccessory(acc)} className={`rounded-2xl p-4 flex flex-col items-center gap-3 cursor-pointer border border-transparent transition-all group active:scale-95 ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]' : 'bg-black/5 hover:bg-white hover:shadow-xl hover:shadow-black/5'}`}>
                                            <div className={`w-full h-20 rounded-xl flex items-center justify-center p-3 group-hover:scale-110 transition-transform duration-500 ${theme === 'dark' ? 'bg-white/10' : 'bg-white/40'}`}><img src={acc.src} alt={acc.name} className="h-full object-contain" /></div>
                                            <span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500 group-hover:text-white' : 'text-neutral-500 group-hover:text-neutral-900'}`}>{acc.name}</span>
                                        </div>
                                    ))}
                                    <label className={`border-dashed border-2 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 group ${theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-orange-500/50' : 'bg-black/5 border-black/10 hover:bg-white hover:border-orange-500/30 hover:shadow-xl'}`}><Upload size={20} className={`transition-transform duration-500 group-hover:scale-110 ${theme === 'dark' ? 'text-neutral-500 group-hover:text-white' : 'text-neutral-400 group-hover:text-[#ff6b00]'}`} /><span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500 group-hover:text-white' : 'text-neutral-500 group-hover:text-[#ff6b00]'}`}>Upload</span><input type="file" className="hidden" onChange={handleUpload} /></label>
                                </div>

                                <div className={`rounded-2xl p-4 border mt-auto transition-all duration-700 ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/5'}`}>
                                    <div className={`flex justify-between items-center text-[10px] font-black mb-3 uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}><span>Canvas Tools</span></div>
                                    <div className="flex gap-2">
                                        <button onClick={deleteSelected} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all border shadow-sm active:scale-95 font-bold ${theme === 'dark' ? 'bg-white/5 border-white/5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10' : 'bg-white border-black/5 text-neutral-500 hover:text-red-600 hover:bg-red-50'}`}><Trash2 size={16} /> Delete</button>
                                        <button onClick={() => { if (fCanvas.current) { fCanvas.current.discardActiveObject(); fCanvas.current.forEachObject(obj => { obj.selectable = false; obj.evented = false; obj.hasControls = false; obj.hasBorders = false; }); fCanvas.current.renderAll(); } setIsPreviewOpen(true); }} className="flex-1 bg-[#ff6b00] hover:bg-[#e66000] text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 font-black text-xs active:scale-95"><ZoomIn size={16} /> View Design</button>
                                    </div>
                                </div>
                            </section>

                            {/* Footer */}
                            <div className={`mt-auto pt-8 border-t flex flex-col gap-6 transition-colors duration-700 ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className={`text-[10px] font-black uppercase tracking-widest mb-1 transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-600'}`}>Total Estimate</div>
                                        <div className={`text-4xl font-black font-mono tracking-tighter transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>Rs. {(22500 + material.price).toLocaleString('en-PK')}</div>
                                    </div>
                                    <button onClick={openSaveModal} className={`p-5 rounded-2xl font-bold transition-all border active:scale-95 ${theme === 'dark' ? 'bg-white/5 border-white/5 text-neutral-500 hover:text-white' : 'bg-black/5 border-black/5 text-neutral-600 hover:text-neutral-900'}`}>
                                        <Save size={20} />
                                    </button>
                                </div>

                                <button
                                    onClick={addToCart}
                                    disabled={isAdding}
                                    className={`w-full py-5 rounded-[20px] font-black text-sm flex items-center gap-3 shadow-2xl transition-all justify-center active:scale-95 ${isAdding ? (theme === 'dark' ? 'bg-neutral-800 text-neutral-500 cursor-wait' : 'bg-neutral-200 text-neutral-400 cursor-wait') : (theme === 'dark' ? 'bg-white text-black hover:bg-neutral-200 shadow-white/5' : 'bg-neutral-900 hover:bg-black text-white shadow-black/20')}`}
                                >
                                    <ShoppingBag size={20} />
                                    {isAdding ? 'PROCESSING...' : 'COMPLETE PURCHASE'}
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="viewer"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex flex-col h-full items-center justify-center"
                        >
                            <div className={`text-center transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-[#ff6b00] mb-2">Design Preview</div>
                                <h1 className="text-3xl font-black tracking-tighter">PREVIEW VIBE</h1>
                                <div className="w-12 h-1 bg-[#ff6b00] mx-auto mt-4 rounded-full shadow-[0_0_10px_rgba(255,107,0,0.5)]" />
                            </div>

                            <div className="w-full space-y-6">
                                <div className={`rounded-2xl p-6 border transition-all duration-700 ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-black/5 border-black/5'}`}>
                                    <div className={`text-[10px] font-black uppercase tracking-widest mb-4 transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>Configuration</div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center"><span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>Base Color</span><span className={`text-xs font-black transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>{JACKET_COLORS[color].name}</span></div>
                                        <div className="flex justify-between items-center"><span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>Material</span><span className={`text-xs font-black transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>{material.name}</span></div>
                                        <div className="flex justify-between items-center"><span className={`text-[10px] font-black uppercase tracking-wider transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>Size</span><span className={`text-xs font-black transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>{size}</span></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>Perspective</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {VIEWS.map(v => (
                                            <button key={v.id} onClick={() => setView(v.id)} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v.id ? 'bg-[#ff6b00] text-white shadow-lg shadow-orange-500/30' : (theme === 'dark' ? 'bg-white/5 text-neutral-500 hover:text-white' : 'bg-black/5 text-neutral-500 hover:text-neutral-900')}`}>
                                                {v.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className={`mt-auto w-full pt-8 border-t flex flex-col gap-6 transition-colors duration-700 ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
                                <div className="flex justify-between items-end">
                                    <div><div className={`text-[10px] font-black uppercase tracking-wider mb-1 transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-600' : 'text-neutral-600'}`}>Final Total</div><div className={`text-4xl font-black font-mono tracking-tighter transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>Rs. {(22500 + material.price).toLocaleString('en-PK')}</div></div>
                                    <button
                                        onClick={addToCart}
                                        className={`p-5 rounded-2xl font-bold shadow-2xl transition-all active:scale-95 ${theme === 'dark' ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 hover:bg-black text-white shadow-black/20'}`}
                                    >
                                        <ShoppingBag size={20} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => { if (fCanvas.current) { fCanvas.current.forEachObject(obj => { obj.selectable = true; obj.evented = true; obj.hasControls = true; obj.hasBorders = true; }); fCanvas.current.renderAll(); } setIsPreviewOpen(false); }}
                                    className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-colors flex items-center justify-center gap-2 group ${theme === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-neutral-400 hover:text-[#ff6b00]'}`}
                                >
                                    <RotateCw size={12} className="group-hover:rotate-180 transition-transform duration-500" /> Back to Studio
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </aside>

            {/* Right Preview Area */}
            <main
                className="flex-1 rounded-[32px] relative overflow-hidden flex items-center justify-center shadow-2xl transition-all duration-1000 ease-in-out bg-white"
            >
                {/* Background Gradient — always white for product clarity */}
                <div
                    className="absolute inset-0 transition-all duration-1000 bg-white"
                />

                {/* Ambient Glow behind the jacket in viewer mode */}
                {isPreviewOpen && (
                    <div
                        className="absolute w-[600px] h-[600px] rounded-full transition-opacity duration-1000"
                        style={{
                            background: `radial-gradient(circle, ${JACKET_COLORS[color].hex}15 0%, transparent 70%)`,
                            filter: 'blur(60px)',
                            top: '45%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 0
                        }}
                    />
                )}

                <div
                    ref={wrapperRef}
                    className="relative w-full max-w-[800px] aspect-[8/9] transition-all duration-700 ease-out z-10"
                    style={{
                        transform: isPreviewOpen ? 'scale(1.08) translateY(-15px)' : 'scale(1) translateY(0)',
                        transformOrigin: 'center center'
                    }}
                >
                    {/* The Fabric Canvas now contains the jacket as its background image */}
                    <div className="absolute inset-0 flex items-center justify-center mix-blend-multiply">
                        <canvas ref={canvasRef} />
                    </div>
                </div>


            </main>

            {/* ====== PREVIEW VIEWER OVERLAY — Only handles background tint now ====== */}
            <AnimatePresence>
                {isPreviewOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10] flex pointer-events-none"
                    >
                        {/* RIGHT: completely transparent — the real <main> preview shows through */}
                        <div style={{ flex: 1 }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notifications */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 right-6 bg-white/90 text-neutral-900 px-6 py-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center gap-3 border border-white backdrop-blur-xl z-[1000]"
                    >
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="font-bold text-sm tracking-wide">{toastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Save Required Modal */}
            <AnimatePresence>
                {isSaveRequiredModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className={`border p-8 rounded-[32px] max-w-sm w-full text-center shadow-[0_40px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-colors duration-700 ${theme === 'dark' ? 'bg-neutral-900 border-white/10' : 'bg-white/90 border-white'}`}
                        >
                            <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Save size={32} />
                            </div>
                            <h3 className={`text-xl font-black mb-2 transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>Save Required</h3>
                            <p className="text-neutral-500 text-sm mb-8">Please save your masterpiece before adding it to your collection.</p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setIsSaveRequiredModalOpen(false)}
                                    className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-colors ${theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'}`}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setIsSaveRequiredModalOpen(false);
                                        openSaveModal();
                                    }}
                                    className={`flex-1 py-4 px-6 rounded-2xl font-black transition-all shadow-xl ${theme === 'dark' ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-black shadow-black/20'}`}
                                >
                                    Save Now
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {isSaveModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`border p-8 rounded-[32px] max-w-sm w-full shadow-[0_40px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-colors duration-700 ${theme === 'dark' ? 'bg-neutral-900 border-white/10' : 'bg-white/90 border-white'}`}
                    >
                        {!showOverwriteConfirmation ? (
                            <>
                                <h3 className={`text-xl font-black mb-2 transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>Save Design</h3>
                                <p className="text-neutral-500 text-sm mb-6">Give your masterpiece a unique name.</p>
                                <input
                                    type="text"
                                    value={saveName}
                                    onChange={(e) => setSaveName(e.target.value)}
                                    placeholder="e.g. Midnight Rider"
                                    className={`w-full border rounded-2xl px-5 py-4 mb-8 outline-none font-bold placeholder:text-neutral-300 transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white focus:border-orange-500/50' : 'bg-black/5 border-black/5 text-neutral-900 focus:border-orange-500/30'}`}
                                />
                                <div className="flex gap-4">
                                    <button onClick={() => setIsSaveModalOpen(false)} className={`flex-1 py-4 font-bold transition-colors ${theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'}`}>Cancel</button>
                                    <button onClick={proceedWithSave} className={`flex-1 py-4 rounded-2xl font-black transition-all shadow-xl ${theme === 'dark' ? 'bg-white text-black hover:bg-neutral-200 shadow-white/5' : 'bg-neutral-900 text-white hover:bg-black shadow-black/20'}`}>Save Design</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <AlertCircle size={32} />
                                    </div>
                                    <h3 className={`text-xl font-black mb-2 transition-colors duration-700 ${theme === 'dark' ? 'text-white' : 'text-neutral-900'}`}>Overwrite?</h3>
                                    <p className="text-neutral-500 text-sm mb-8">A design named "{saveName}" already exists. Do you want to replace it?</p>
                                    <div className="flex gap-4">
                                        <button onClick={() => setShowOverwriteConfirmation(false)} className={`flex-1 py-4 font-bold transition-colors ${theme === 'dark' ? 'text-neutral-400 hover:text-white' : 'text-neutral-400 hover:text-neutral-900'}`}>Go Back</button>
                                        <button onClick={confirmOverwrite} className="flex-1 py-4 bg-red-500 rounded-2xl text-white font-black hover:bg-red-600 transition-all shadow-xl shadow-red-500/20">Overwrite</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}

            {/* --- GUIDES MODALS --- */}
            <AnimatePresence>
                {activeModal && (
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border transition-colors duration-700 ${theme === 'dark' ? 'bg-[#0f0f0f] border-white/5 text-white' : 'bg-white border-white text-slate-900'}`}
                        >
                            <div className={`p-8 border-b flex justify-between items-center transition-colors duration-700 ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                                <h3 className="text-xl font-black uppercase tracking-tight">
                                    {activeModal === 'size' ? 'Universal Size Chart' : 'Premium Material Guide'}
                                </h3>
                                <button onClick={() => setActiveModal(null)} className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white/50' : 'hover:bg-slate-200 text-slate-500'}`}>
                                    <XCircle size={20} />
                                </button>
                            </div>

                            <div className="p-8">
                                {activeModal === 'size' ? (
                                    <div className="space-y-6">
                                        <p className={`text-sm transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-500'}`}>All measurements are in inches. For the best fit, measure yourself over a thin layer of clothing.</p>
                                        <div className={`overflow-x-auto rounded-2xl border transition-colors duration-700 ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                                            <table className="w-full text-left border-collapse">
                                                <thead className={theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}>
                                                    <tr>
                                                        <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50">Size</th>
                                                        <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50">Chest</th>
                                                        <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50">Waist</th>
                                                        <th className="p-4 text-xs font-black uppercase tracking-widest opacity-50">Sleeve</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y transition-colors duration-700 ${theme === 'dark' ? 'divide-white/5' : 'divide-slate-100'}`}>
                                                    {['S', 'M', 'L', 'XL'].map((sz, i) => (
                                                        <tr key={sz} className={`transition-colors ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-slate-50/50'}`}>
                                                            <td className="p-4 font-bold">{sz}</td>
                                                            <td className="p-4 text-sm opacity-80">{36 + i * 2}" - {38 + i * 2}"</td>
                                                            <td className="p-4 text-sm opacity-80">{30 + i * 2}" - {32 + i * 2}"</td>
                                                            <td className="p-4 text-sm opacity-80">{33 + i * 0.5}"</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex gap-6 items-start">
                                            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shrink-0">
                                                <AlertCircle size={32} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold mb-2">100% Genuine Full-Grain Leather</h4>
                                                <p className={`text-sm leading-relaxed transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-600'}`}>
                                                    We use only the highest quality top-layer leather. It is durable, breathable, and develops a beautiful patina over time.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className={`p-6 rounded-2xl transition-colors duration-700 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                                <h5 className="font-black text-[10px] uppercase tracking-widest mb-3 opacity-50">Care Instructions</h5>
                                                <ul className={`text-xs space-y-2 list-disc pl-4 transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-600'}`}>
                                                    <li>Keep away from direct heat and moisture</li>
                                                    <li>Use specialized leather conditioner</li>
                                                    <li>Wipe with a soft, dry cloth only</li>
                                                </ul>
                                            </div>
                                            <div className={`p-6 rounded-2xl transition-colors duration-700 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                                <h5 className="font-black text-[10px] uppercase tracking-widest mb-3 opacity-50">Inner Lining</h5>
                                                <p className={`text-xs leading-relaxed transition-colors duration-700 ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-600'}`}>
                                                    Soft viscose quilted lining for maximum comfort and warmth without the bulk.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`p-8 border-t flex justify-end transition-colors duration-700 ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                                <button
                                    onClick={() => setActiveModal(null)}
                                    className={`px-8 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${theme === 'dark' ? 'bg-white text-black hover:bg-neutral-200' : 'bg-slate-900 text-white hover:bg-black'}`}
                                >
                                    Got it, thanks!
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showOnboardingGuide && (
                    <div className="fixed inset-0 z-[4000] pointer-events-none">
                        {isGuideMinimized ? (
                            /* --- MINIMIZED ASSISTANT --- */
                            <div
                                className="absolute bottom-8 right-8 pointer-events-auto shadow-2xl"
                                style={{ zIndex: 4001 }}
                            >
                                <button
                                    onClick={() => setIsGuideMinimized(false)}
                                    className="w-16 h-16 bg-[#ff6b00] text-white rounded-[1.2rem] flex items-center justify-center relative group active:scale-95 transition-transform"
                                >
                                    <HelpCircle size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-[#ff6b00] animate-pulse" />
                                </button>
                            </div>
                        ) : (
                            /* --- EXPANDED CENTERED GUIDE --- */
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={`w-full max-w-xl rounded-[2.5rem] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_30px_100px_rgba(0,0,0,0.5)] ${theme === 'dark' ? 'bg-[#1a1a1a] text-white border border-white/5' : 'bg-white text-slate-900 shadow-2xl border border-slate-100'}`}
                                >
                                    <div className={`p-6 flex justify-between items-center shrink-0 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center">
                                                <HelpCircle size={20} />
                                            </div>
                                            <h3 className="font-black uppercase tracking-tight text-xs">Material & Studio Guide</h3>
                                        </div>
                                        <button
                                            onClick={() => setIsGuideMinimized(true)}
                                            className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-white/10 text-white/40' : 'hover:bg-slate-200 text-slate-400'}`}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>

                                    <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-lg">Studio Masterclass</h4>
                                            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-neutral-400' : 'text-slate-600'}`}>
                                                Quick guide to premium materials and studio controls.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <h5 className="font-black text-[10px] uppercase tracking-widest text-[#ff6b00]">Premium Cowhide</h5>
                                                    <span className="text-[9px] opacity-40 font-bold uppercase">Heavy Duty</span>
                                                </div>
                                                <p className="text-[11px] opacity-70 leading-relaxed">
                                                    Our most durable option. Thick, rugged, and develops a beautiful worn-in look over years. Perfect for bikers and outdoor wear.
                                                </p>
                                            </div>

                                            <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <h5 className="font-black text-[10px] uppercase tracking-widest text-orange-500">Italian Lambskin</h5>
                                                    <span className="text-[9px] opacity-40 font-bold uppercase">Luxury</span>
                                                </div>
                                                <p className="text-[11px] opacity-70 leading-relaxed">
                                                    Buttery soft and lightweight. Offers a sleek, fashion-forward drape that feels like a second skin. Best for premium evening wear.
                                                </p>
                                            </div>

                                            <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-50'}`}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <h5 className="font-black text-[10px] uppercase tracking-widest text-emerald-500">Rugged Goatskin</h5>
                                                    <span className="text-[9px] opacity-40 font-bold uppercase">Resilient</span>
                                                </div>
                                                <p className="text-[11px] opacity-70 leading-relaxed">
                                                    Naturally water-resistant with a unique pebbled texture. It's incredibly strong yet surprisingly light and flexible.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-orange-500/10' : 'bg-orange-50'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Ruler size={14} className="text-orange-500" />
                                                    <h5 className="font-black text-[10px] uppercase tracking-widest text-orange-500">Size Chart</h5>
                                                </div>
                                                <p className="text-[10px] opacity-70 leading-relaxed">
                                                    Found in Step 03. Measure carefully for the perfect tailored fit.
                                                </p>
                                            </div>
                                            <div className={`p-5 rounded-2xl ${theme === 'dark' ? 'bg-[#ff6b00]/10' : 'bg-orange-50'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <ZoomIn size={14} className="text-[#ff6b00]" />
                                                    <h5 className="font-black text-[10px] uppercase tracking-widest text-[#ff6b00]">Design Viewer</h5>
                                                </div>
                                                <p className="text-[10px] opacity-70 leading-relaxed">
                                                    Click 'View Design' to see your creation in a high-fidelity preview.
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`px-6 py-4 rounded-2xl border flex items-center justify-between transition-colors duration-700 ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg shadow-sm text-[10px] font-black transition-colors ${theme === 'dark' ? 'bg-neutral-800 text-white' : 'bg-white text-black'}`}>DEL</div>
                                                <span className="text-[10px] font-bold opacity-60">Shortcut to remove accessories</span>
                                            </div>
                                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                                            <span className="text-[10px] font-black uppercase tracking-tighter opacity-40">Pro Tip</span>
                                        </div>
                                    </div>

                                    <div className={`p-8 border-t flex gap-4 shrink-0 transition-colors duration-700 ${theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                                        <button
                                            onClick={() => setShowOnboardingGuide(false)}
                                            className={`px-6 py-4 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity`}
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={() => setIsGuideMinimized(true)}
                                            className="flex-1 py-4 bg-[#ff6b00] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            Let's Design Studio <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>

            <ConfirmationModal
                isOpen={conf.open}
                onClose={() => setConf({ ...conf, open: false })}
                onConfirm={conf.onConfirm}
                title={conf.title}
                message={conf.message}
                type={conf.type}
                hideCancel={conf.hideCancel}
                confirmText="OK"
            />
        </div>
    );
}

export default function RealJacketCustomizer() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center font-sans">Loading Customizer...</div>}>
            <CustomizerContent />
        </Suspense>
    );
}
