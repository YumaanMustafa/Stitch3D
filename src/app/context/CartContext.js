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

    // 1. Initial Load: Runs on mount to retrieve the cart items stored in localStorage.
    // Checks if the user is authenticated to load a user-specific cart (e.g. cart_123),
    // otherwise falls back to a generic 'cart' key.
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
                    
                    // Wrapped in setTimeout to prevent React's synchronous state update in useEffect warning
                    setTimeout(() => {
                        setCartItems(uniqueItems);
                    }, 0);
                } else {
                    setTimeout(() => {
                        setCartItems([]);
                    }, 0);
                }
            }
        } catch (e) {
            console.error("Cart load error:", e);
        } finally {
            // Loading complete
            setIsLoading(false);
        }
    }, []);

    // 2. Persist on Change: Whenever cartItems array is updated, save the serialized array to localStorage.
    // Also fires a 'cartUpdated' custom window event to support external non-React listeners.
    useEffect(() => {
        if (isLoading) return; // Don't overwrite if loading hasn't finished yet

        const userId = getUserId();
        const cartKey = userId ? `cart_${userId}` : 'cart';

        localStorage.setItem(cartKey, JSON.stringify(cartItems));

        // Dispatch custom event just in case non-context listeners need it (legacy support)
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: cartItems }));
    }, [cartItems, isLoading]);

    // Actions
    // ==========================================
// ADD TO CART: Adds a product or customized design to the shopping cart
// ==========================================
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

    // ==========================================
// REMOVE FROM CART: Removes an item from the shopping cart by ID
// ==========================================
const removeFromCart = (id) => {
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    // NEW: Sync saved design changes to cart immediately
    // ==========================================
// SYNC CART ITEM: Synchronizes a saved design with its cart representation
// ==========================================
const syncCartItemWithDesign = (design) => {
        setCartItems((prev) => {
            const index = prev.findIndex(item => item.designId === design.id || item.title === design.name);
            if (index > -1) {
                const updated = [...prev];
                // Updates specs but keeps cart-specific props like quantity/id
                updated[index] = {
                    ...updated[index],
                    designId: design.id,
                    title: design.name || updated[index].title,
                    color: design.color || updated[index].color,
                    material: typeof design.material === 'object' ? design.material.name : (design.material || updated[index].material),
                };
                // Ensure ID and Qty are preserved strictly
                updated[index].id = prev[index].id;
                updated[index].quantity = prev[index].quantity;
                return updated;
            }
            return prev;
        });
    };

    // ==========================================
// UPDATE QUANTITY: Modifies the quantity of a specific cart item
// ==========================================
const updateQuantity = (id, quantity) => {
        setCartItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
        );
    };

    // ==========================================
// CLEAR CART: Resets the shopping cart to an empty array
// ==========================================
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
