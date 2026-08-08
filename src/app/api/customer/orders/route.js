// Import Next.js tool for sending data back to the browser
import { NextResponse } from 'next/server';
// Import the database connection tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/customer/orders/route.js
 * Description: Checkout / Order Creation API.
 * This handles the extremely complex process of checking out.
 * If a customer buys items from multiple different vendors in the same cart, 
 * this script splits them up and creates a separate sub-order for each vendor!
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// =========================================================================
// POST HANDLER: Handles POST requests when a customer clicks "Place Order"
// =========================================================================
export async function POST(request) {
    try {
        // Step 1: Authentication Check
        // PRIVILEGE: Customer Ordering
        // Only authenticated users can place orders. 
        // We strictly verify their token to securely attach the order to their identity.
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        const token = authHeader.split(' ')[1];
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Extract their user ID from the token
        const userId = decoded.id || decoded.userId || decoded.user_id;

        // Step 2: Read the cart data they sent us
        const body = await request.json();
        
        // Items is the list of products. We also grab the shipping address and totals.
        const { items, shipping, total, subtotal, shippingFee } = body;

        // If their cart is empty, stop here
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // Step 3: Resolve Customer ID
        // Orders must be linked to a 'customer_id', not just a 'user_id'. 
        // If this is their first time buying, they might not have a customer profile yet.
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        let customerId;

        if (customerRows.length === 0) {
            // Auto-create a customer profile for them
            const [newCust] = await db.query('INSERT INTO customers (user_id) VALUES (?)', [userId]);
            customerId = newCust.insertId;
        } else {
            // They already have one, use it
            customerId = customerRows[0].customer_id;
        }

        // Step 4: Sort and Split the Cart Items by Vendor
        // A customer can put items from 3 different shops into 1 cart. We need to split 
        // that into 3 separate orders so each shop owner only sees their own stuff.
        const vendorGroups = {};
        
        for (const item of items) {
            
            // 4.1 Identify what specific product this is
            let actualDesignId = item.rawId || item.designId;

            // Sometimes the ID comes with a prefix like "ready_12". We need to strip that out to just "12".
            if (!actualDesignId && item.id) {
                const idStr = item.id.toString();
                if (idStr.startsWith('ready_')) {
                    actualDesignId = idStr.replace('ready_', '');
                } else if (/^[0-9]+$/.test(idStr)) {
                    actualDesignId = idStr;
                }
            }

            // 4.2 Determine who made this product (Find the Vendor ID)
            let vendorId = item.artisanId || item.vendorId || null;
            
            if (vendorId) {
                // If the cart item already told us who the vendor is, great! Do nothing.
            } else if (actualDesignId && !isNaN(Number(actualDesignId)) && Number(actualDesignId) > 0) {
                // If we don't know the vendor, but we know the product ID, ask the database who owns it
                const [productRows] = await db.query('SELECT vendor_id FROM vendor_products WHERE id = ?', [actualDesignId]);
                if (productRows.length > 0) {
                    vendorId = productRows[0].vendor_id;
                }
            } else if (item.title) {
                // Last resort: try to guess the vendor by searching for the product's name
                const [productRows] = await db.query('SELECT vendor_id FROM vendor_products WHERE name = ? LIMIT 1', [item.title]);
                if (productRows.length > 0) {
                    vendorId = productRows[0].vendor_id;
                }
            }

            // If we STILL don't know the vendor, default to null so the database doesn't crash
            if (!vendorId) {
                vendorId = null;
            }

            // 4.3 Attach these clean IDs to the item so we can use them later
            item._resolvedDesignId = actualDesignId;
            item._resolvedVendorId = vendorId;

            // Group the item into a list specific to this vendor
            const key = vendorId || 'none';
            // If this is the first item from this vendor, setup an empty container for them
            if (!vendorGroups[key]) {
                vendorGroups[key] = { vendorId, items: [], subtotal: 0 };
            }
            
            // Add the item to the vendor's container and add up their specific subtotal
            vendorGroups[key].items.push(item);
            vendorGroups[key].subtotal += (parseFloat(item.price) || 0) * (item.quantity || 1);
        }

        // Calculate the combined subtotal of all groups
        const totalSubtotal = Object.values(vendorGroups).reduce((sum, g) => sum + g.subtotal, 0);
        // We will store the IDs of all the newly created orders here
        const createdOrderIds = [];

        // Step 5: Create the actual Orders in the database (One for each vendor)
        for (const key in vendorGroups) {
            const group = vendorGroups[key];
            const vId = group.vendorId === 'none' ? null : group.vendorId;

            // Math: We need to split the single shipping fee across the multiple orders fairly.
            // We use a ratio based on how expensive their part of the order was.
            const ratio = totalSubtotal > 0 ? group.subtotal / totalSubtotal : 1 / Object.keys(vendorGroups).length;
            const groupShipping = (parseFloat(shippingFee) || 0) * ratio;
            const groupTax = (parseFloat(body.tax) || 0) * ratio;
            
            // Calculate the final total just for this specific vendor's order
            const groupTotal = group.subtotal + groupShipping + groupTax;

            // 5.1 Insert the main Order record
            const [orderResult] = await db.query(
                `INSERT INTO orders (customer_id, vendor_id, subtotal, shipping_fee, tax, total, shipping_method, status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
                [customerId, vId, group.subtotal, groupShipping, groupTax, groupTotal, shipping?.method || 'Standard']
            );
            
            const orderId = orderResult.insertId;
            createdOrderIds.push(orderId);

            // 5.2 Insert all the specific Line Items (shirts, hats) inside this Order
            // We build a big array of values so we can insert them all at once very fast
            const itemValues = group.items.map(item => [
                orderId,
                vId,
                item._resolvedDesignId || null,
                item.title || 'Custom Jacket',
                item.color || 'black',
                item.material || 'Standard',
                parseFloat(item.price) || 0,
                item.quantity || 1,
                item.img || item.image || '',
                item.size || 'M'
            ]);

            // Execute the bulk insert
            await db.query(
                `INSERT INTO order_items (order_id, vendor_id, design_id, title, color, material, price, quantity, img_src, size) 
                 VALUES ?`,
                [itemValues]
            );

            // 5.3 Send an alert to the Vendor so they know they got a new order!
            if (vId) {
                try {
                    // Find the user account linked to this vendor
                    const [vendorRows] = await db.query('SELECT user_id FROM vendors WHERE vendor_id = ?', [vId]);
                    if (vendorRows.length > 0) {
                        // Send the notification
                        await db.query(
                            'INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, "vendor", ?, ?, "order")',
                            [vendorRows[0].user_id, "New Order Received", `A new order (#${orderId}) has been placed for your products.`, "order"]
                        );
                    }
                } catch (err) {
                    // If the notification fails, just log it. Don't ruin the checkout experience.
                    console.error("Non-fatal notification error:", err);
                }
            }
        }

        // Step 6: Tell the frontend that checkout was completely successful!
        return NextResponse.json({
            success: true,
            message: 'Order placed successfully',
            orderId: createdOrderIds[0], // Give them the first ID for backward compatibility
            orderIds: createdOrderIds    // Give them all the IDs in case there were multiple
        });

    } catch (error) {
        // Log severe checkout crashes securely
        console.error("Order creation failed:", error);
        return NextResponse.json({ error: 'Order creation failed', details: error.message }, { status: 500 });
    }
}
