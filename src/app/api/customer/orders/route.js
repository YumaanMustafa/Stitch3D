import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Checkout/Order Creation API.
 * Creates a new order and associated order items for the customer.
 * Auto-creates a customer profile if one doesn't exist.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export async function POST(request) {
    try {
        // 1. Auth Check
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

        const userId = decoded.id || decoded.userId || decoded.user_id;

        // 2. Parse Body
        const body = await request.json();
        const { items, shipping, total, subtotal, shippingFee } = body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
        }

        // 3. Get Customer ID
        const [customerRows] = await db.query('SELECT customer_id FROM customers WHERE user_id = ?', [userId]);
        let customerId;

        if (customerRows.length === 0) {
            const [newCust] = await db.query('INSERT INTO customers (user_id) VALUES (?)', [userId]);
            customerId = newCust.insertId;
        } else {
            customerId = customerRows[0].customer_id;
        }

        // 4. Group items by Vendor
        const vendorGroups = {};
        for (const item of items) {
            // 4.1 Identify Product ID
            let actualDesignId = item.rawId || item.designId;

            // Extract from 'ready_123' if needed, or use plain numeric ID
            if (!actualDesignId && item.id) {
                const idStr = item.id.toString();
                if (idStr.startsWith('ready_')) {
                    actualDesignId = idStr.replace('ready_', '');
                } else if (/^[0-9]+$/.test(idStr)) {
                    actualDesignId = idStr;
                }
            }

            // 4.2 Determine Vendor
            let vendorId = item.artisanId || item.vendorId || null;
            if (vendorId) {
                // vendorId already set from cart item
            } else if (actualDesignId && !isNaN(Number(actualDesignId)) && Number(actualDesignId) > 0) {
                const [productRows] = await db.query('SELECT vendor_id FROM vendor_products WHERE id = ?', [actualDesignId]);
                if (productRows.length > 0) {
                    vendorId = productRows[0].vendor_id;
                }
            } else if (item.title) {
                // Last ditch effort: find by title if ID is missing (robustness)
                const [productRows] = await db.query('SELECT vendor_id FROM vendor_products WHERE name = ? LIMIT 1', [item.title]);
                if (productRows.length > 0) {
                    vendorId = productRows[0].vendor_id;
                }
            }

            if (!vendorId) {
                // FALLBACK: Assign to default platform vendor (Vendor 1) 
                // so custom designs don't disappear into NULL bucket.
                vendorId = 1;
            }

            // 4.3 Attach resolved IDs to item for insertion
            item._resolvedDesignId = actualDesignId;
            item._resolvedVendorId = vendorId;

            const key = vendorId || 'none';
            if (!vendorGroups[key]) vendorGroups[key] = { vendorId, items: [], subtotal: 0 };
            vendorGroups[key].items.push(item);
            vendorGroups[key].subtotal += (parseFloat(item.price) || 0) * (item.quantity || 1);
        }

        const totalSubtotal = Object.values(vendorGroups).reduce((sum, g) => sum + g.subtotal, 0);
        const createdOrderIds = [];

        // 5. Create Sub-Orders per Vendor
        for (const key in vendorGroups) {
            const group = vendorGroups[key];
            const vId = group.vendorId === 'none' ? null : group.vendorId;

            // Proportional distribution of shipping and tax
            const ratio = totalSubtotal > 0 ? group.subtotal / totalSubtotal : 1 / Object.keys(vendorGroups).length;
            const groupShipping = (parseFloat(shippingFee) || 0) * ratio;
            const groupTax = (parseFloat(body.tax) || 0) * ratio;
            const groupTotal = group.subtotal + groupShipping + groupTax;

            const [orderResult] = await db.query(
                `INSERT INTO orders (customer_id, vendor_id, subtotal, shipping_fee, tax, total, shipping_method, status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
                [customerId, vId, group.subtotal, groupShipping, groupTax, groupTotal, shipping?.method || 'Standard']
            );
            const orderId = orderResult.insertId;
            createdOrderIds.push(orderId);

            // 6. Insert Items for this Sub-Order
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

            await db.query(
                `INSERT INTO order_items (order_id, vendor_id, design_id, title, color, material, price, quantity, img_src, size) 
                 VALUES ?`,
                [itemValues]
            );

            // 7. Notify Vendor
            if (vId) {
                try {
                    const [vendorRows] = await db.query('SELECT user_id FROM vendors WHERE vendor_id = ?', [vId]);
                    if (vendorRows.length > 0) {
                        await db.query(
                            'INSERT INTO notifications (user_id, role, title, message, type) VALUES (?, "vendor", ?, ?, "order")',
                            [vendorRows[0].user_id, "New Order Received", `A new order (#${orderId}) has been placed for your products.`, "order"]
                        );
                    }
                } catch (err) {
                    console.error("Non-fatal notification error:", err);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Order placed successfully',
            orderId: createdOrderIds[0],
            orderIds: createdOrderIds
        });

    } catch (error) {
        console.error("Order creation failed:", error);
        return NextResponse.json({ error: 'Order creation failed', details: error.message }, { status: 500 });
    }
}
