"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Helper to get User ID safely
    const getUserId = () => {
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

    // 1. Initial Load
    useEffect(() => {
        const userId = getUserId();
        const cartKey = userId ? `cart_${userId}` : 'cart';
        try {
            const raw = localStorage.getItem(cartKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    // Robustness: Filter items with valid IDs and duplicates
                    const validItems = parsed.filter(i => i && (i.id || i.id === 0));
                    // Basic dedupe by ID logic just in case
                    const uniqueItems = Array.from(new Map(validItems.map(item => [item.id, item])).values());
                    setCartItems(uniqueItems);
                } else {
                    setCartItems([]);
                }
            }
        } catch (e) {
            console.error("Cart load error:", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 2. Persist on Change
    useEffect(() => {
        if (isLoading) return; // Don't overwrite if not loaded yet

        // Check user ID again in case it changed (login/logout handled by refresh usually, but good to be safe)
        const userId = getUserId();
        const cartKey = userId ? `cart_${userId}` : 'cart';

        localStorage.setItem(cartKey, JSON.stringify(cartItems));

        // Dispatch custom event just in case non-context listeners need it (legacy support)
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: cartItems }));
    }, [cartItems, isLoading]);

    // Actions
    const addToCart = (product) => {
        setCartItems((prev) => {
            // Priority 1: Update existing Saved Design (by designId)
            if (product.designId) {
                const existingDesignIndex = prev.findIndex((item) => item.designId === product.designId);
                if (existingDesignIndex > -1) {
                    const existingItem = prev[existingDesignIndex];

                    // Check if specs (Color/Material) are identical
                    // If identical, user probably clicked "Add to Cart" again -> Increment Qty
                    // If different, user changed something -> Update Specs (maintain Qty or reset? User said "update", implies keeping item flow)
                    const isIdentical =
                        existingItem.color === product.color &&
                        existingItem.material === product.material;

                    const updated = [...prev];

                    if (isIdentical) {
                        updated[existingDesignIndex] = {
                            ...existingItem,
                            ...product, // Sync latest Price, Image, Title even if specs match
                            id: existingItem.id, // Keep Cart Item ID stable
                            quantity: (existingItem.quantity || 1) + 1
                        };
                    } else {
                        updated[existingDesignIndex] = {
                            ...existingItem,
                            ...product, // Overwrite specs (Color/Material/Price)
                            id: existingItem.id, // Keep ID stable
                            quantity: existingItem.quantity // Keep quantity stable on edit
                        };
                    }
                    return updated;
                }
            }

            // Priority 2: Standard Deduplication (Identical Content -> Increment Qty)
            const existing = prev.find((item) =>
                !item.designId && // Only for non-DB designs to avoid collision
                (item.title === product.title && item.color === product.color && item.material === product.material)
            );

            if (existing) {
                return prev.map((item) =>
                    (item.id === existing.id) ? { ...item, quantity: (item.quantity || 1) + 1 } : item
                );
            } else {
                return [...prev, { ...product, quantity: 1, id: product.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }];
            }
        });
    };

    const removeFromCart = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    // NEW: Sync saved design changes to cart immediately
    const syncCartItemWithDesign = (design) => {
        setCartItems((prev) => {
            const index = prev.findIndex(item => item.designId === design.id || item.title === design.name);
            if (index > -1) {
                const updated = [...prev];
                // Updates specs but keeps cart-specific props like quantity/id
                updated[index] = {
                    ...updated[index],
                    designId: design.id,
                    title: design.name,
                    color: design.color || updated[index].color,
                    material: typeof design.material === 'object' ? design.material.name : (design.material || updated[index].material),
                    // If price needed, calculate or pass full object. Assuming 'design' might vary. 
                    // Ideally we re-construct the item product object.
                    // For now, let's trust the design object has core display info or rely on caller passing safe data.
                    // Actually, the caller in customize/page.js has full context. 
                    // Let's expect the caller to pass the 'product' shape or we assume design has shape.
                    // Let's stick to what customize/page.js was doing: title, price, img.
                    // We'll trust the design object passed has these or we merge carefully.
                    // BETTER: Accept `updates` object.
                    ...design // Check for conflicts?
                };
                // Ensure ID and Qty are preserved strictly
                updated[index].id = prev[index].id;
                updated[index].quantity = prev[index].quantity;
                return updated;
            }
            return prev;
        });
    };

    const updateQuantity = (id, quantity) => {
        setCartItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                cartCount,
                addToCart,
                removeFromCart,
                updateQuantity,
                syncCartItemWithDesign,
                clearCart,
                isLoading
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
