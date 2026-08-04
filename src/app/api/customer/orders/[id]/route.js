// Import Next.js tool for sending responses
import { NextResponse } from 'next/server';
// Import the database tool
import db from '@/lib/db';
// Import jsonwebtoken to read login tokens
import jwt from 'jsonwebtoken';

/**
 * File: route.js
 * Location: src/app/api/customer/orders/[id]/route.js
 * Description: Single Order Management API.
 * This route allows a customer to load the full details of ONE specific order.
 * It also allows them to delete (cancel) an order, but ONLY if they own it.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// ==========================================
// GET HANDLER: Handles GET requests when a user clicks on a specific order to view details
// ==========================================
export async function GET(request, { params }) {
    try {
        // Step 1: Grab the ID of the order from the URL
        const { id } = await params;

        // Step 2: Security Check. Verify the user is logged in.
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

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Step 3: Clean the ID
        // The frontend sends "ORD-15", but the database just wants "15".
        const dbId = id.toString().replace("ORD-", "");

        // Step 4: Fetch the Order details from the database
        // We use JOINs to pull in the customer's shipping address and the Vendor's shop name
        const [orders] = await db.query(`
            SELECT 
                CONCAT('ORD-', o.order_id) as id,
                o.created_at,
                o.subtotal,
                o.tax,
                o.shipping_fee,
                o.total,
                o.status,
                o.shipping_method as shipping,
                c.user_id,
                c.phone_number,
                c.address,
                c.city,
                c.country,
                c.postal_code,
                u.first_name,
                u.last_name,
                u.email,
                v.name as vendor_name,
                v.company_name as vendor_company,
                v.specialization as vendor_specialization
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
            WHERE o.order_id = ? AND c.user_id = ?
        `, [dbId, userId]);

        // Security Check: If it came back empty, they either typed a bad ID, 
        // OR they are trying to view an order that belongs to a different user!
        if (orders.length === 0) {
            return NextResponse.json({ error: 'Order not found or forbidden' }, { status: 404 });
        }

        const order = orders[0];

        // Step 5: Fetch all the items inside the order
        const [items] = await db.query(`
            SELECT 
                title as name,
                quantity as qty,
                price,
                img_src as image,
                color,
                material,
                size
            FROM order_items
            WHERE order_id = ?
        `, [dbId]);

        // Attach the items to the order object
        order.items = items;
        
        // Send the complete package back to the browser
        return NextResponse.json(order);
        
    } catch (error) {
        // Log crashes securely
        console.error("Fetch single order error:", error);
        return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
}

// ==========================================
// DELETE HANDLER: Handles DELETE requests if a user wants to cancel/delete their order
// ==========================================
export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        // Step 1: Security Check. Verify they are logged in.
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

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Clean the ID by removing the "ORD-" prefix
        const dbId = id.toString().replace("ORD-", "");

        // Step 2: Verify Ownership
        // We MUST double check that this specific user is the owner of this specific order before we delete it!
        const [rows] = await db.query(`
            SELECT o.order_id 
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_id = ? AND c.user_id = ?
        `, [dbId, userId]);

        // If nothing came back, stop them immediately
        if (rows.length === 0) {
            return NextResponse.json({ error: 'Order not found or forbidden' }, { status: 404 });
        }

        // Step 3: Delete the order from the database
        // We have to delete the small pieces (order items) BEFORE we delete the main order.
        // If we don't, the database will throw an error about "orphaned" records.
        
        // First delete the items...
        await db.query('DELETE FROM order_items WHERE order_id = ?', [dbId]);
        // ...then delete the order itself.
        await db.query('DELETE FROM orders WHERE order_id = ?', [dbId]);

        // Tell the browser it was successful
        return NextResponse.json({ success: true, message: 'Order deleted successfully' });
        
    } catch (error) {
        // Log crashes securely
        console.error("Delete order error:", error);
        return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
}
