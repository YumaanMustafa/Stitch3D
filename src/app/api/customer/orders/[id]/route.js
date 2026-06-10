import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

/**
 * @file route.js
 * @description Single Order Management API.
 * Handles deletion of a specific order by ID (if user owns it).
 */

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

export async function GET(request, { params }) {
    try {
        const { id } = await params;

        // Auth Check
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

        const dbId = id.toString().replace("ORD-", "");

        // Fetch Order
        const [orders] = await db.query(`
            SELECT 
                CONCAT('ORD-', o.order_id) as id,
                o.created_at,
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
                u.email
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            WHERE o.order_id = ? AND c.user_id = ?
        `, [dbId, userId]);

        if (orders.length === 0) {
            return NextResponse.json({ error: 'Order not found or forbidden' }, { status: 404 });
        }

        const order = orders[0];

        // Fetch Items
        const [items] = await db.query(`
            SELECT 
                title as name,
                quantity as qty,
                price,
                img_src as image
            FROM order_items
            WHERE order_id = ?
        `, [dbId]);

        order.items = items;
        return NextResponse.json(order);
    } catch (error) {
        console.error("Fetch single order error:", error);
        return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

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

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const dbId = id.toString().replace("ORD-", "");

        // 2. Verify Ownership
        // Join customers to check user_id
        const [rows] = await db.query(`
            SELECT o.order_id 
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            WHERE o.order_id = ? AND c.user_id = ?
        `, [dbId, userId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Order not found or forbidden' }, { status: 404 });
        }

        // 3. Delete (Manual Cascade)
        // Delete items first
        await db.query('DELETE FROM order_items WHERE order_id = ?', [dbId]);
        // Delete order
        await db.query('DELETE FROM orders WHERE order_id = ?', [dbId]);

        return NextResponse.json({ success: true, message: 'Order deleted successfully' });
    } catch (error) {
        console.error("Delete order error:", error);
        return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }
}
