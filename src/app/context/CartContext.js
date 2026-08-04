"use client";

// Import React context and hooks needed to share cart state globally
import React, { createContext, useContext, useState, useEffect } from "react";

// Create a context object for the shopping cart
// Any component that needs cart data can access it through this context
const CartContext = createContext();

// CartProvider wraps the app so all child components can read and update cart state
export const CartProvider = ({ children }) => {
    // State array holding all items currently in the shopping cart
    const [cartItems, setCartItems] = useState([]);
    // State to track whether the initial cart data is still being loaded from local storage
    const [isLoading, setIsLoading] = useState(true);

    // Helper function to safely read the logged-in user's ID from the JWT token stored in localStorage
    const getUserId = () => {
        // If running on server side (no window object), return null immediately
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem("token");
        if (!token) return null;
        try {
            // Decode the middle part of the JWT token (the payload) to read user ID
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.id || payload.userId;
        } catch (e) {
            return null;
        }
    };

    // Effect hook that runs once when the component first mounts
    // Reads cart items from localStorage so they persist across page refreshes
    useEffect(() => {
        const userId = getUserId();
        // Use a user-specific cart key if logged in, otherwise use a generic cart key
        const cartKey = userId ? `cart_${userId}` : 'cart';
        try {
            // Read the stored cart data string from localStorage
            const raw = localStorage.getItem(cartKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    // Filter out any invalid cart items that have no ID
                    const validItems = parsed.filter(i => i && (i.id || i.id === 0));
                    // Remove any duplicate items based on their ID
                    const uniqueItems = Array.from(new Map(validItems.map(item => [item.id, item])).values());
                    
                    // Use setTimeout to avoid React state update warning when inside useEffect
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
            // Mark loading as done whether the cart loaded successfully or not
            setIsLoading(false);
        }
    }, []);

    // Effect hook that runs every time cartItems or isLoading changes
    // Saves the latest cart items back to localStorage to persist them
    useEffect(() => {
        // Do not overwrite localStorage while initial load is still in progress
        if (isLoading) return;

        const userId = getUserId();
        const cartKey = userId ? `cart_${userId}` : 'cart';

        // Convert cart array to JSON string and save it to localStorage
        localStorage.setItem(cartKey, JSON.stringify(cartItems));

        // Fire a custom browser event so any non-React code can also react to cart changes
        window.dispatchEvent(new CustomEvent("cartUpdated", { detail: cartItems }));
    }, [cartItems, isLoading]);

    // Function to add a product or custom design to the shopping cart
    const addToCart = (product) => {
        setCartItems((prev) => {
            // If the product is a saved custom design (has a designId), handle it separately
            if (product.designId) {
                const existingDesignIndex = prev.findIndex((item) => item.designId === product.designId);
                if (existingDesignIndex > -1) {
                    const existingItem = prev[existingDesignIndex];

                    // Check if color and material are the same as the existing cart entry
                    const isIdentical =
                        existingItem.color === product.color &&
                        existingItem.material === product.material;

                    const updated = [...prev];

                    if (isIdentical) {
                        // Same specs: just increase the quantity by 1
                        updated[existingDesignIndex] = {
                            ...existingItem,
                            ...product,
                            id: existingItem.id,
                            quantity: (existingItem.quantity || 1) + 1
                        };
                    } else {
                        // Different specs: update design specs but keep the same quantity
                        updated[existingDesignIndex] = {
                            ...existingItem,
                            ...product,
                            id: existingItem.id,
                            quantity: existingItem.quantity
                        };
                    }
                    return updated;
                }
            }

            // For standard products, check if an identical item already exists in the cart
            const existing = prev.find((item) =>
                !item.designId &&
                (item.title === product.title && item.color === product.color && item.material === product.material)
            );

            if (existing) {
                // Increment quantity of the matching existing item
                return prev.map((item) =>
                    (item.id === existing.id) ? { ...item, quantity: (item.quantity || 1) + 1 } : item
                );
            } else {
                // Add new item to cart with quantity 1 and assign a unique temporary ID if needed
                return [...prev, { ...product, quantity: 1, id: product.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }];
            }
        });
    };

    // Function to remove a specific item from the cart by its ID
    const removeFromCart = (id) => {
        // Filter out the item that matches the given ID
        setCartItems((prev) => prev.filter((item) => item.id !== id));
    };

    // Function to sync an updated saved design with its matching cart entry
    const syncCartItemWithDesign = (design) => {
        setCartItems((prev) => {
            // Find the cart item that corresponds to this design
            const index = prev.findIndex(item => item.designId === design.id || item.title === design.name);
            if (index > -1) {
                const updated = [...prev];
                // Update the design specs but keep the cart-specific properties like quantity and ID
                updated[index] = {
                    ...updated[index],
                    designId: design.id,
                    title: design.name || updated[index].title,
                    color: design.color || updated[index].color,
                    material: typeof design.material === 'object' ? design.material.name : (design.material || updated[index].material),
                };
                // Make sure the original ID and quantity are not changed
                updated[index].id = prev[index].id;
                updated[index].quantity = prev[index].quantity;
                return updated;
            }
            return prev;
        });
    };

    // Function to update the quantity of a specific cart item
    const updateQuantity = (id, quantity) => {
        setCartItems((prev) =>
            // Map through items and update the one that matches the ID, minimum quantity is 1
            prev.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
        );
    };

    // Function to empty the entire cart at once
    const clearCart = () => {
        setCartItems([]);
    };

    // Calculate total number of items in cart by adding up all item quantities
    const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    return (
        // Provide all cart state and action functions to child components
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

// useCart hook: lets any component easily access the cart context without importing it directly
export const useCart = () => useContext(CartContext);
